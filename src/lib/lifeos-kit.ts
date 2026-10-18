/**
 * Build-time facts about the synced Life OS kit, read from the files publish-site.py writes.
 * Nothing on the page hand-types a version, fingerprint, size, status, or rule id: it comes from here,
 * and two assertions fail the build when the page's copy drifts from the kit.
 *
 * Paths are built from the project root (process.cwd()), not import.meta.url: Vite rewrites
 * import.meta.url only for client code, and prerender chunks live three levels deep in dist/.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const P = (p: string) => join(ROOT, 'public', 'life-os', p);
const C = (p: string) => join(ROOT, 'src', 'content', 'lifeos', p);
const read = (p: string) => readFileSync(p, 'utf-8');

export const version = read(P('VERSION')).trim();

const fpLines = read(P('FINGERPRINTS.txt')).split('\n');
export const fingerprint = fpLines[0].match(/kit fingerprint ([0-9a-f]+)/)?.[1] ?? 'unknown';
export const checksums = fpLines
  .slice(1)
  .map((l) => l.trim().match(/^([0-9a-f]{64})\s+(\S+)$/))
  .filter((m): m is RegExpMatchArray => !!m)
  .map((m) => ({ sha: m[1], file: m[2] }));

export const pasteKB = Math.round(statSync(P('PASTE-SETUP.txt')).size / 1024);

const start = read(C('start.md'));
const trust = read(C('trust.md'));
export const isRC = /release candidate/i.test(start) || /release candidate/i.test(trust);
export const noResultsYet = /Results for this version: none yet/i.test(trust);
export const trustRuleIds = [
  ...new Set([...trust.matchAll(/<!-- rule: ([^>]+?) -->/g)].flatMap((m) => m[1].split(',').map((s) => s.trim()))),
].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

const kernelDir = P('kernel');
const kernelFiles = readdirSync(kernelDir).filter((f) => f.endsWith('.md'));
const definitions = new Map<string, string>();
for (const f of kernelFiles) {
  for (const m of read(join(kernelDir, f)).matchAll(/^- \*\*([A-Z]\d+(?:\.\d+)?)\*\* (.+)$/gm)) {
    definitions.set(m[1], m[2]);
  }
}
export const safetySections = [...read(join(kernelDir, 'SAFETY.md')).matchAll(/^## (§\d+ .+)$/gm)].map((m) => m[1]);

const matrix = (read(P('CAPABILITIES.txt')).split('## Matrix')[1] ?? '').split('\n## ')[0];
const matrixRows = matrix.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Assistant') && !l.startsWith('|---'));
export const allUntested =
  matrixRows.length > 0 && matrixRows.every((l) => l.replace(/\|\s*$/, '').split('|').pop()!.trim() === 'untested');

/** Each cited rule id must exist AND its definition line must still say what the page claims it says. */
export function assertCited(cited: Record<string, RegExp>): void {
  const problems: string[] = [];
  for (const [id, phrase] of Object.entries(cited)) {
    const line = definitions.get(id);
    if (!line) problems.push(`${id} is not defined in public/life-os/kernel/*.md`);
    else if (!phrase.test(line)) problems.push(`${id} no longer matches ${phrase} (now: "${line.slice(0, 80)}...")`);
  }
  if (problems.length) {
    throw new Error(`Life OS page copy drifted from the kit:\n  ${problems.join('\n  ')}\nUpdate the Life OS pages in src/pages/life-os/.`);
  }
}

/** Qualifiers the page repeats from the kit's start page (pricing, for now) must still be there. */
export function assertStartSays(phrases: RegExp[]): void {
  const missing = phrases.filter((p) => !p.test(start));
  if (missing.length) {
    throw new Error(`Kit start.md no longer says ${missing.join(', ')}. Update the "Best with" line in src/pages/life-os/.`);
  }
}

/** The recommended assistants named on the page must still be the ones the kit's start page names. */
export function assertRecommended(names: string[]): void {
  const missing = names.filter((n) => !start.includes(n));
  if (missing.length) {
    throw new Error(`Kit start.md no longer names ${missing.join(', ')}. Update the "Best with" line in src/pages/life-os/.`);
  }
}
