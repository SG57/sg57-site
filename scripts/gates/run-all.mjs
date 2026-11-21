// Runs every gate (no bail-out), prints each gate's report and one summary line per gate, exits 1 on any hard failure.
// Expects `dist/` to exist (the `gates` npm script builds first). Gate order: cheapest first.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './lib.mjs';

const GATES = [
  { name: 'css', file: 'css.mjs' },
  { name: 'scripts', file: 'page-load.mjs' },
  { name: 'html', file: 'html.mjs' },
  { name: 'floors', file: 'floors.mjs' },
  { name: 'check', file: 'check-ratchet.mjs' },
];

const passthrough = process.argv.slice(2);
const summaries = [];
let failed = 0;
for (const g of GATES) {
  console.log(`\n=== gate:${g.name} ===`);
  const res = spawnSync(process.execPath, [fileURLToPath(new URL(g.file, import.meta.url)), ...passthrough], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  process.stdout.write(res.stdout ?? '');
  if (res.stderr) process.stderr.write(res.stderr);
  const line = (res.stdout ?? '').split('\n').reverse().find((l) => l.startsWith(`[gate:${g.name}]`));
  summaries.push(line ?? `[gate:${g.name}] CRASH exit=${res.status} (no summary line)`);
  if (res.status !== 0 || !line) failed++;
}
console.log('\n=== gate summary ===');
for (const s of summaries) console.log(s);
console.log(failed ? `\n${failed} of ${GATES.length} gates FAILED` : `\nall ${GATES.length} gates passed`);
process.exitCode = failed ? 1 : 0;
