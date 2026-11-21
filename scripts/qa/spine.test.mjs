// Unit tests for the pure parts of the QA spine (route discovery, baseline ratchet, argument parsing). The rendered
// checks themselves are proved by seeding regressions into a copy of the site; see the red proof in the commit that added it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverRoutes, applyBaseline, fingerprint, axeDetails, parseArgv, outlineInvisible, probeLayout } from './spine.mjs';

function fixtureDist() {
  const dist = mkdtempSync(join(tmpdir(), 'spine-dist-'));
  const page = (path, body = '<main></main>') => {
    mkdirSync(join(dist, path), { recursive: true });
    writeFileSync(join(dist, path, 'index.html'), `<!doctype html><html><body>${body}</body></html>`);
  };
  writeFileSync(join(dist, 'index.html'), '<!doctype html><main></main>');
  page('services');
  page('blog');
  page('blog/small', 'x');
  page('blog/medium', 'x'.repeat(500));
  page('blog/large', 'x'.repeat(5000));
  page('rehndrop', '<meta http-equiv="refresh" content="0;url=https://elsewhere.example/">');
  mkdirSync(join(dist, '_astro'));
  writeFileSync(join(dist, '_astro', 'index.html'), 'not a page');
  return dist;
}

test('routes: redirects and _astro are skipped, --all keeps every post', () => {
  const dist = fixtureDist();
  const all = discoverRoutes(dist, { all: true });
  assert.deepEqual([...all].sort(), ['/', '/blog/', '/blog/large/', '/blog/medium/', '/blog/small/', '/services/']);
});

test('routes: the default set keeps the smallest and largest post only', () => {
  const dist = fixtureDist();
  const def = discoverRoutes(dist, {});
  assert.deepEqual([...def].sort(), ['/', '/blog/', '/blog/large/', '/blog/small/', '/services/']);
});

test('routes: --only filters by path substring', () => {
  const dist = fixtureDist();
  assert.deepEqual(discoverRoutes(dist, { only: ['services'] }), ['/services/']);
});

test('fingerprint ignores the viewport and the message', () => {
  const a = { rule: 'target-size', route: '/x/', detail: 'a "Home"', file: '/x/ @375', what: '10x10' };
  const b = { rule: 'target-size', route: '/x/', detail: 'a "Home"', file: '/x/ @820', what: '12x12' };
  assert.equal(fingerprint(a), fingerprint(b));
});

test('baseline: new findings fail, known ones are tolerated, vanished ones are reported stale', () => {
  const known = { rule: 'axe', route: '/a/', detail: 'color-contrast .x' };
  const fresh = { rule: 'axe', route: '/a/', detail: 'color-contrast .y' };
  const r = applyBaseline([known, fresh], new Set([fingerprint(known), 'axe | /gone/ | label']));
  assert.deepEqual(r.fresh, [fresh]);
  assert.deepEqual(r.tolerated, [known]);
  assert.deepEqual(r.stale, ['axe | /gone/ | label']);
});

test('arguments: unknown flags are an error, not silently ignored', () => {
  assert.throws(() => parseArgv(['--al']), /unknown argument/);
  assert.deepEqual(parseArgv(['--all', '--only', 'a', '--only', 'b']).only, ['a', 'b']);
});

test('fingerprint ignores the Astro scoped-style hash, which changes whenever a component CSS changes', () => {
  const a = { rule: 'axe', route: '/x/', detail: 'link-in-text-block .crumbs > a[href$="life-os"][data-astro-cid-abc123=""]' };
  const b = { rule: 'axe', route: '/x/', detail: 'link-in-text-block .crumbs > a[href$="life-os"][data-astro-cid-zz9=""]' };
  assert.equal(fingerprint(a), fingerprint(b));
  assert.notEqual(fingerprint(a), fingerprint({ ...a, detail: 'link-in-text-block .crumbs > a[href$="other"]' }));
});

// The /life-os/ flake: axe lists a different first node (and a different number of nodes) from run to run, because a
// block that has not scrolled into view yet is opacity 0 and axe skips it. A finding is one node, so none of that matters.
const violation = (id, targets) => ({ id, nodes: targets.map((t) => ({ target: Array.isArray(t) ? t : [t] })) });
const axeFindings = (route, ...violations) => violations.flatMap((v) => axeDetails(v).map((detail) => ({ rule: 'axe', route, detail })));
const NODE_A = '.line[data-show="beginner"] > a[href$="trust"]';
const NODE_B = '.line:nth-child(4) > a[href$="trust"]';
const NODE_C = 'a[href$="LICENSE.txt"]';

test('axe: the order axe lists the nodes in does not change the fingerprints', () => {
  const one = axeFindings('/life-os/', violation('link-in-text-block', [NODE_A, NODE_B, NODE_C])).map(fingerprint).sort();
  const two = axeFindings('/life-os/', violation('link-in-text-block', [NODE_C, NODE_B, NODE_A])).map(fingerprint).sort();
  assert.deepEqual(one, two);
  assert.equal(one.length, 3);
  assert.deepEqual(axeDetails(violation('x', [NODE_B, NODE_A])), axeDetails(violation('x', [NODE_A, NODE_B])));
});

test('axe: a run that reports any subset of the baselined nodes passes (the first node may vary)', () => {
  const baseline = new Set(axeFindings('/life-os/', violation('link-in-text-block', [NODE_A, NODE_B, NODE_C])).map(fingerprint));
  for (const subset of [[NODE_A], [NODE_B], [NODE_C], [NODE_B, NODE_C], [NODE_A, NODE_B, NODE_C]]) {
    const r = applyBaseline(axeFindings('/life-os/', violation('link-in-text-block', subset)), baseline);
    assert.deepEqual(r.fresh, [], subset.join(' + '));
  }
});

test('axe: a genuinely new node on a baselined route and rule still fails, wherever axe lists it', () => {
  const baseline = new Set(axeFindings('/life-os/', violation('link-in-text-block', [NODE_A, NODE_B])).map(fingerprint));
  const NEW = '.line:nth-child(9) > a[href$="example"]';
  for (const order of [[NEW, NODE_A, NODE_B], [NODE_A, NEW, NODE_B], [NODE_A, NODE_B, NEW], [NEW]]) {
    const r = applyBaseline(axeFindings('/life-os/', violation('link-in-text-block', order)), baseline);
    assert.deepEqual(r.fresh.map((f) => f.detail), [`link-in-text-block ${NEW}`], order.join(' + '));
  }
  // the same node on another route, or the same target under another rule, is also new
  assert.equal(applyBaseline(axeFindings('/other/', violation('link-in-text-block', [NODE_A])), baseline).fresh.length, 1);
  assert.equal(applyBaseline(axeFindings('/life-os/', violation('color-contrast', [NODE_A])), baseline).fresh.length, 1);
});

test('axe: repeated nodes collapse, frame selectors join, and a violation with no nodes still yields one finding', () => {
  assert.deepEqual(axeDetails(violation('r', [NODE_A, NODE_A])), [`r ${NODE_A}`]);
  assert.deepEqual(axeDetails(violation('r', [['iframe', 'a.x']])), ['r iframe a.x']);
  assert.deepEqual(axeDetails({ id: 'r', nodes: [] }), ['r']);
});

test('axe: a long selector is not truncated, so two nodes that differ late cannot share a fingerprint', () => {
  const stem = '.a > '.repeat(40);
  const [x, y] = [axeDetails(violation('r', [stem + 'b.one']))[0], axeDetails(violation('r', [stem + 'b.two']))[0]];
  assert.ok(x.length > 160);
  assert.notEqual(fingerprint({ rule: 'axe', route: '/', detail: x }), fingerprint({ rule: 'axe', route: '/', detail: y }));
});

// Both of these were written without their backslashes once (/s+/ splits on the letter s, /rgba(s*d+...)/ never
// matches), which silently disabled the checks. Each test names that bug.
test('outlineInvisible: a fully transparent computed outline colour is invisible (the regex needs its escapes)', () => {
  const visible = { style: 'solid', width: 2, color: 'rgb(91, 192, 190)', bg: 'rgb(10, 12, 16)' };
  assert.equal(outlineInvisible(visible), false);
  assert.equal(outlineInvisible({ ...visible, color: 'rgba(0, 0, 0, 0)' }), true);
  assert.equal(outlineInvisible({ ...visible, color: 'rgba(91,192,190,0)' }), true);
  assert.equal(outlineInvisible({ ...visible, color: 'rgba(91, 192, 190, 0.5)' }), false);
  assert.equal(outlineInvisible({ ...visible, style: 'none' }), true);
  assert.equal(outlineInvisible({ ...visible, width: 0 }), true);
  assert.equal(outlineInvisible({ ...visible, color: visible.bg }), true);
});

test('probeLayout names an element by its first class, not by splitting on the letter s', () => {
  const el = {
    tagName: 'DIV', className: 'sidebar wide', parentElement: null,
    closest: () => null,
    getBoundingClientRect: () => ({ width: 100, height: 10, left: 0, right: 900 }),
  };
  const saved = { document: globalThis.document, getComputedStyle: globalThis.getComputedStyle };
  globalThis.document = {
    documentElement: { clientWidth: 400, scrollWidth: 900 },
    body: { querySelectorAll: () => [el] },
    querySelectorAll: () => [{}],
  };
  globalThis.getComputedStyle = () => ({ position: 'static', display: 'block', visibility: 'visible', overflowX: 'visible' });
  try {
    const l = probeLayout();
    assert.equal(l.offenderCount, 1);
    assert.equal(l.offenders[0].sel, 'div.sidebar');
  } finally {
    globalThis.document = saved.document;
    globalThis.getComputedStyle = saved.getComputedStyle;
  }
});
