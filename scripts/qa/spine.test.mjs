// Unit tests for the pure parts of the QA spine (route discovery, baseline ratchet, argument parsing). The rendered
// checks themselves are proved by seeding regressions into a copy of the site; see the red proof in the commit that added it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverRoutes, applyBaseline, fingerprint, parseArgv, outlineInvisible, probeLayout } from './spine.mjs';

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
