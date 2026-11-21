// Shared helpers for the sg57-site quality gates. ESM, no dependencies, Windows + Linux safe.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/** --dist <dir> --src <dir> --all ; defaults resolve against the repo root. */
export function parseArgs(argv = process.argv.slice(2)) {
  const opts = { dist: join(repoRoot, 'dist'), src: join(repoRoot, 'src'), all: false, update: false, rest: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dist') opts.dist = resolve(argv[++i]);
    else if (a === '--src') opts.src = resolve(argv[++i]);
    else if (a === '--all') opts.all = true;
    else if (a === '--update-baseline') opts.update = true;
    else opts.rest.push(a);
  }
  return opts;
}

/** True when the module is the process entry point (works for Windows drive paths). */
export const isMain = (metaUrl) => !!process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === metaUrl;

/**
 * Pointer from a gate message to a guide in the platform-currency pack. Cite an id only where that guide really covers
 * the rule (read the guide first); the repo's own rules always win over a guide.
 */
export const platformGuide = (id, note = '') => `platform-currency guide: ${id} (repo rules still win${note ? `; ${note}` : ''})`;

export const posix = (p) => p.split(sep).join('/');
export const rel = (p) => posix(relative(process.cwd(), p));

export function walk(dir, accept = () => true, skipDirs = new Set(['node_modules', '.git'])) {
  const out = [];
  if (!existsSync(dir)) return out;
  const visit = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { if (!skipDirs.has(e.name)) visit(p); }
      else if (accept(p)) out.push(p);
    }
  };
  if (statSync(dir).isDirectory()) visit(dir);
  return out.sort();
}

export const read = (p) => readFileSync(p, 'utf8');
export const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/**
 * A finding: { file, line, rule, law, message, fix }. `hard` findings fail the gate, `warn` findings are counted
 * and sampled. Messages are written as remediation for an AI agent: what is wrong, the native/standard fix, the law.
 */
export class Report {
  constructor(name) { this.name = name; this.hard = []; this.warn = []; this.notes = []; }
  // A finding with a `key` is merged with earlier findings of the same key (same defect repeated on many pages);
  // the first one is kept and `pages` counts the repeats.
  #add(list, f) {
    if (f.key) {
      const prev = list.find((x) => x.key === f.key && x.rule === f.rule);
      if (prev) { prev.pages = (prev.pages ?? 1) + 1; return; }
    }
    list.push(f);
  }
  error(f) { this.#add(this.hard, f); }
  warning(f) { this.#add(this.warn, f); }
  note(s) { this.notes.push(s); }
  get failed() { return this.hard.length > 0; }

  print({ all = false, sample = 5, warnSample = 2 } = {}) {
    const groups = (list) => {
      const m = new Map();
      for (const f of list) { if (!m.has(f.rule)) m.set(f.rule, []); m.get(f.rule).push(f); }
      return m;
    };
    for (const [rule, list] of groups(this.hard)) {
      const first = list[0];
      console.log(`\n  FAIL ${rule} x${list.length}  [${first.law}]`);
      console.log(`    what: ${first.what ?? first.message}`);
      console.log(`    fix:  ${first.fix}`);
      for (const f of list.slice(0, all ? list.length : sample)) {
        console.log(`    - ${f.file}${f.line ? ':' + f.line : ''}${f.detail ? '  ' + f.detail : ''}${f.pages ? `  (+${f.pages - 1} more pages)` : ''}`);
      }
      if (!all && list.length > sample) console.log(`    ... ${list.length - sample} more (--all to list)`);
    }
    for (const [rule, list] of groups(this.warn)) {
      console.log(`\n  warn ${rule} x${list.length}${list[0].law ? '  [' + list[0].law + ']' : ''}`);
      for (const f of list.slice(0, all ? list.length : warnSample)) {
        console.log(`    - ${f.file}${f.line ? ':' + f.line : ''}  ${f.message}${f.pages ? `  (+${f.pages - 1} more pages)` : ''}`);
      }
    }
    for (const n of this.notes) console.log(`  note: ${n}`);
    console.log(this.summary());
  }

  summary() {
    const by = (list) => [...list.reduce((m, f) => m.set(f.rule, (m.get(f.rule) ?? 0) + 1), new Map())]
      .map(([r, n]) => `${r}:${n}`).join(' ');
    const status = this.failed ? 'FAIL' : 'PASS';
    return `[gate:${this.name}] ${status} hard=${this.hard.length} warn=${this.warn.length}` +
      (this.hard.length ? `  (${by(this.hard)})` : '');
  }
}

/** Exit code helper: 1 on any hard finding. */
export function finish(report, opts) {
  report.print({ all: opts?.all });
  process.exitCode = report.failed ? 1 : 0;
}
