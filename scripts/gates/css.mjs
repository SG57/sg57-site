// gate:css - stylelint with the sg57 focus-visible rule over src/**/*.css and the <style> blocks of src/**/*.astro.
import stylelint from 'stylelint';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Report, parseArgs, walk, rel, posix, finish, isMain, platformGuide } from './lib.mjs';
import { ruleName } from './focus-outline-plugin.mjs';

const DEFAULT_ALLOW = fileURLToPath(new URL('./focus-allow.json', import.meta.url));

const plugin = fileURLToPath(new URL('./focus-outline-plugin.mjs', import.meta.url));

export const stylelintConfig = (secondary = true) => ({
  plugins: [plugin],
  rules: { [ruleName]: secondary },
  overrides: [{ files: ['**/*.astro'], customSyntax: 'postcss-html' }],
});

export async function runCssGate({ src, allow: allowFile = DEFAULT_ALLOW }) {
  const report = new Report('css');
  const allow = existsSync(allowFile) ? JSON.parse(readFileSync(allowFile, 'utf8')) : {};
  const used = new Set();
  const files = walk(src, (p) => /\.(css|astro)$/.test(p)).map(posix);
  if (files.length === 0) {
    report.error({ file: rel(src), rule: 'no-input', law: 'gate integrity', what: `no .css/.astro files under ${rel(src)}`, fix: 'Point --src at the site src directory.' });
    return report;
  }
  const res = await stylelint.lint({ files, config: stylelintConfig([true, { allow, onAllowUsed: (s) => used.add(s) }]), ignoreDisables: true });
  report.note(`${files.length} files linted`);
  for (const r of res.results) {
    for (const w of r.warnings) {
      const base = { file: rel(r.source), line: w.line, detail: w.text.split('. Fix:')[0].replace(/\s*\(sg57\/[^)]*\)$/, '') };
      if (w.severity === 'error' && w.rule === ruleName) {
        report.error({ ...base, rule: 'focus-visible-outline', law: 'Federal Law 35(a); Law 17 (WCAG 2.4.7, 1.4.11)', what: 'a :focus-visible rule removes the outline with no forced-colors-safe replacement; a box-shadow ring vanishes in Windows High Contrast', fix: 'Keep the box-shadow ring and replace "outline: none" with "outline: 2px solid transparent; outline-offset: 2px" (transparent outlines paint in a system colour under forced-colors), or add the same selector with a real outline inside @media (forced-colors: active). ' + platformGuide('accessibility') });
      } else {
        report.error({ ...base, rule: `stylelint:${w.rule ?? 'parse'}`, law: 'stylelint', what: w.text, fix: 'Fix the CSS syntax error reported.' });
      }
    }
  }
  for (const sel of Object.keys(allow)) {
    if (!used.has(sel.replace(/\s+/g, ' ').trim().toLowerCase())) {
      report.error({ file: rel(allowFile), rule: 'focus-allow-stale', law: 'gate integrity', what: `focus-allow.json entry "${sel}" no longer matches any outline removal`, fix: 'Delete the stale entry; the allow list is reviewed per selector and must not outlive the rule it excuses.', detail: sel });
    }
  }
  return report;
}

if (isMain(import.meta.url)) {
  const opts = parseArgs();
  finish(await runCssGate(opts), opts);
}
