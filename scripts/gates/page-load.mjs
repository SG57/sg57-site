// gate:scripts - in a site that uses Astro's ClientRouter, every bundled <script> must (re)bind on
// astro:page-load or astro:after-swap, directly or through a relatively imported module. A bundled module script
// runs once; after a client-side navigation the new page's DOM has no listeners and silently does nothing.
//
// Escape hatch for scripts that only touch persisted chrome or define a custom element:
//   // gate:page-load-ok <reason>
import { existsSync, statSync } from 'node:fs';
import { dirname, resolve, join, extname } from 'node:path';
import { Report, parseArgs, walk, read, rel, lineOf, posix, finish, isMain } from './lib.mjs';

const LAW = 'SL-1 (scripts that depend on the DOM must listen to astro:page-load)';
const HANDLER = /addEventListener\(\s*["'`]astro:(page-load|after-swap)["'`]/;
const ALLOW = /gate:page-load-ok\s+\S+/;
const EXTS = ['', '.ts', '.js', '.mjs', '.mts', '.cjs', '/index.ts', '/index.js', '/index.mjs'];

const stripFrontmatter = (text) => {
  const m = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(text);
  return m ? { body: text.slice(m[0].length), offset: m[0].length } : { body: text, offset: 0 };
};
const maskComments = (s) => s.replace(/<!--[\s\S]*?-->/g, (c) => ' '.repeat(c.length));

/** Bundled scripts of an .astro file: every <script> that Astro will process and bundle. */
export function bundledScripts(text) {
  const { body, offset } = stripFrontmatter(text);
  const masked = maskComments(body);
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  for (let m; (m = re.exec(masked)); ) {
    const attrs = m[1];
    if (/\bis:inline\b|\bdefine:vars\b/.test(attrs)) continue;
    const type = /\btype\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
    if (type && !/^module$/i.test(type) && !/^(text|application)\/(javascript|typescript)$/i.test(type)) continue; // json, importmap, ld+json
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
    if (src && !src.startsWith('.')) continue; // remote or absolute: not bundled by us
    out.push({ code: m[2], src, index: offset + m.index });
  }
  return out;
}

function resolveModule(from, spec) {
  const base = resolve(dirname(from), spec);
  for (const ext of EXTS) {
    const p = base + ext;
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

/** Does this code, or any relatively imported module reachable from it, register a page-load/after-swap handler? */
function hasHandler(code, fromFile, seen) {
  if (HANDLER.test(code)) return true;
  const specs = [...code.matchAll(/(?:from\s*|import\s*\(?\s*|import\s+)["'](\.{1,2}\/[^"']+)["']/g)].map((m) => m[1]);
  for (const spec of specs) {
    const target = resolveModule(fromFile, spec);
    if (!target || seen.has(target) || extname(target) === '.astro') continue;
    seen.add(target);
    if (hasHandler(read(target), target, seen)) return true;
  }
  return false;
}

export function runPageLoadGate({ src }) {
  const report = new Report('scripts');
  const astroFiles = walk(src, (p) => p.endsWith('.astro'));
  if (astroFiles.length === 0) {
    report.error({ file: rel(src), rule: 'no-input', law: 'gate integrity', what: `no .astro files under ${rel(src)}`, fix: 'Point --src at the site src directory.' });
    return report;
  }
  if (!astroFiles.some((f) => /ClientRouter|ViewTransitions/.test(read(f)))) {
    report.note('site does not use ClientRouter; page-load rule not applicable');
    return report;
  }
  let scripts = 0;
  for (const file of astroFiles) {
    const text = read(file);
    for (const s of bundledScripts(text)) {
      scripts++;
      let code = s.code;
      let from = file;
      if (s.src) { const t = resolveModule(file, s.src); if (!t) continue; code = read(t); from = t; }
      if (ALLOW.test(code)) continue;
      if (hasHandler(code, from, new Set([from]))) continue;
      report.error({
        file: posix(rel(file)), line: lineOf(text, s.index), rule: 'bundled-script-without-page-load', law: LAW,
        what: 'a bundled <script> runs once per full page load; with ClientRouter it never re-runs after a client-side navigation, so its listeners are missing on every page reached by a link click',
        fix: "Wrap the setup in a function and call it from document.addEventListener('astro:page-load', init) (it also fires on the first load). If the script only touches persisted chrome, add a comment `// gate:page-load-ok <reason>` inside it. Never use DOMContentLoaded.",
        detail: 'no astro:page-load or astro:after-swap listener in this script or its relative imports',
      });
    }
  }
  report.note(`${scripts} bundled scripts checked across ${astroFiles.length} .astro files`);
  return report;
}

if (isMain(import.meta.url)) {
  const opts = parseArgs();
  finish(runPageLoadGate(opts), opts);
}
