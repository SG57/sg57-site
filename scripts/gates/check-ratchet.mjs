// gate:check - `astro check` as a ratchet. The site had pre-existing type errors when the gates were introduced; they
// are recorded in check-baseline.json (fingerprint = file | ts code | message, with a count). The gate fails on any
// fingerprint that is new or whose count grew, and prints a hint when the baseline can be tightened.
//   node scripts/gates/check-ratchet.mjs                    verify against the baseline
//   node scripts/gates/check-ratchet.mjs --update-baseline  rewrite the baseline (only ever to shrink it; review the diff)
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Report, parseArgs, finish, isMain, repoRoot, posix, rel } from './lib.mjs';

const BASELINE = new URL('./check-baseline.json', import.meta.url);
// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;]*m/g;
const LINE = /^(.+?):(\d+):(\d+) - (error|warning|hint) (\S+?): (.*)$/;

export function parseCheckOutput(raw) {
  const text = raw.replace(ANSI, '').replace(/\r/g, '');
  const counts = new Map();
  let errors = 0;
  for (const line of text.split('\n')) {
    const m = LINE.exec(line);
    if (!m || m[4] !== 'error') continue;
    errors++;
    const file = posix(m[1]).replace(/^.*?\/?(src\/)/, '$1');
    const key = `${file} | ${m[5]} | ${m[6].trim()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const summary = /^- (\d+) errors?$/m.exec(text);
  return { counts, errors, reported: summary ? Number(summary[1]) : null, text };
}

export function compare(current, baseline) {
  const added = [];
  let fixed = 0;
  for (const [key, n] of current) {
    const was = baseline[key] ?? 0;
    if (n > was) added.push({ key, extra: n - was });
  }
  for (const [key, n] of Object.entries(baseline)) fixed += Math.max(0, n - (current.get(key) ?? 0));
  return { added, fixed };
}

export function runCheckGate({ update, cwd = repoRoot, rawOutput, baselineOverride }) {
  const report = new Report('check');
  let raw = rawOutput;
  if (raw === undefined) {
    const bin = join(cwd, 'node_modules', 'astro', 'bin', 'astro.mjs');
    const res = spawnSync(process.execPath, [bin, 'check', '--minimumSeverity', 'error'], { cwd, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }, maxBuffer: 64 * 1024 * 1024 });
    raw = `${res.stdout ?? ''}\n${res.stderr ?? ''}`;
    if (res.error) {
      report.error({ file: 'astro check', rule: 'check-crashed', law: 'gate integrity', what: `could not run astro check: ${res.error.message}`, fix: 'Run `npm ci --ignore-scripts` then retry.' });
      return report;
    }
  }
  const { counts, errors, reported, text } = parseCheckOutput(raw);
  if (reported === null) {
    report.error({ file: 'astro check', rule: 'check-crashed', law: 'gate integrity', what: 'astro check printed no "Result" summary; it crashed or its output format changed, so nothing was verified', fix: 'Run `npx astro check` by hand and fix the crash; do not loosen this gate.', detail: text.trim().split('\n').slice(-3).join(' / ') });
    return report;
  }
  if (reported !== errors) {
    report.error({ file: 'astro check', rule: 'check-parse-mismatch', law: 'gate integrity', what: `astro check reported ${reported} errors but ${errors} were parsed; the output format changed`, fix: 'Update LINE in scripts/gates/check-ratchet.mjs to the new astro check format.' });
    return report;
  }
  if (update) {
    const sorted = Object.fromEntries([...counts].sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(BASELINE, JSON.stringify({ note: 'astro check error fingerprints (file | code | message): count. Only ever shrink this file.', total: errors, errors: sorted }, null, 2) + '\n');
    report.note(`baseline written: ${errors} errors, ${counts.size} fingerprints`);
    return report;
  }
  if (!baselineOverride && !existsSync(BASELINE)) {
    report.error({ file: rel(BASELINE.pathname), rule: 'check-baseline-missing', law: 'gate integrity', what: 'check-baseline.json is missing', fix: 'Run `node scripts/gates/check-ratchet.mjs --update-baseline` once on a known-good tree.' });
    return report;
  }
  const baseline = baselineOverride ?? JSON.parse(readFileSync(BASELINE, 'utf8')).errors;
  const { added, fixed } = compare(counts, baseline);
  for (const a of added) {
    report.error({
      file: a.key.split(' | ')[0], rule: 'new-type-error', law: 'Federal Law 5 (strict typing, no escape hatches)',
      what: 'astro check found a type error that is not in the recorded baseline',
      fix: 'Fix the type error properly (narrow with a type guard or `instanceof`, or give the value a real type). Never add `any`, `@ts-ignore` or `as unknown as`, and never raise the baseline.',
      detail: `${a.key.split(' | ').slice(1).join(': ')}${a.extra > 1 ? ` (x${a.extra} new)` : ''}`,
    });
  }
  report.note(`${errors} errors now vs baseline ${Object.values(baseline).reduce((x, y) => x + y, 0)}`);
  if (fixed > 0) report.note(`${fixed} baselined errors are gone; tighten with --update-baseline`);
  return report;
}

if (isMain(import.meta.url)) {
  const opts = parseArgs();
  finish(runCheckGate(opts), opts);
}
