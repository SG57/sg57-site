// qa:spine - the rendered QA spine. Serves the BUILT site (dist) with `astro preview` and drives a real browser over
// it, because the laws that need computed layout, computed style or a focus ring cannot be proved statically.
//
//   node scripts/qa/spine.mjs                 representative route set (all non-post pages + 2 blog posts)
//   node scripts/qa/spine.mjs --all           every route in dist (what CI runs)
//   node scripts/qa/spine.mjs --only /clide   routes whose path contains the text (repeatable)
//   node scripts/qa/spine.mjs --no-screens    skip the qa-out/ screenshots
//   node scripts/qa/spine.mjs --list          print every finding, not the first five per rule
//   node scripts/qa/spine.mjs --update-baseline   rewrite baseline.json (only ever to shrink it; review the diff)
//   QA_BROWSER_CHANNEL=chrome|msedge          use an installed browser instead of the bundled chromium
//
// Per route and viewport (375x812, 820x1180, 1440x900): no horizontal overflow, zero console errors, exactly one
// <main>, axe-core with the WCAG 2.0/2.1/2.2 A and AA tags (serious and critical fail), the skip link works, and
// SL-9 touch targets are at least 44x44 CSS px. On a small set of pages it also emulates forced-colors, reduced
// motion and color-scheme. axe automates only a minority of WCAG 2.2 AA (target-size is roughly the one new
// automated rule): a green run is NOT a claim of WCAG 2.2 conformance.
//
// Needs a built dist/ (`npm run qa` builds first; `npm run qa:run` does not). Exit 1 on any hard finding that is
// not in baseline.json. Findings use the same shape and printer as scripts/gates.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { Report, repoRoot, walk, read, posix, isMain } from '../gates/lib.mjs';

export const VIEWPORTS = [
  { name: '375', width: 375, height: 812 },
  { name: '820', width: 820, height: 1180 },
  { name: '1440', width: 1440, height: 900 },
];
export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];
/** Pages that also run the forced-colors / reduced-motion / color-scheme emulations (one of each product shape). */
export const EMULATION_ROUTES = ['/', '/clide/', '/blog/', '/services/', '/life-os/', '/text-easy/setup/'];
/** Posts that join the default set: the smallest and the largest, so both ends of the markdown layout are covered. */
const POST_PREFIX = '/blog/';
/** Keyboard stops checked for a visible focus ring under forced-colors (the header and the first screen of content). */
const FOCUS_STOPS = 40;

const BASELINE = new URL('./baseline.json', import.meta.url);
const QA_OUT = join(repoRoot, 'qa-out');
const DIST = join(repoRoot, 'dist'); // astro preview serves this directory

const LAW = {
  layout: 'Responsive layout (SL-9 breakpoints): nothing may scroll sideways',
  console: 'SL-1 (no runtime errors)',
  main: 'WCAG 1.3.1 / 2.4.1: one main landmark per page',
  axe: 'WCAG 2.0 / 2.1 / 2.2 A and AA (automatable subset)',
  skip: 'WCAG 2.4.1 (bypass blocks): the skip link is the first tab stop and lands in <main>',
  target: 'SL-9 (44px minimum touch targets)',
  forced: 'Federal Law (visible focus) + WCAG 2.4.7 / 1.4.11 under forced-colors',
  motion: 'Federal Law 9 + SL-10 (prefers-reduced-motion: reduce disables animation)',
  scheme: 'SL-11 (dark theme only: color-scheme dark regardless of the OS preference)',
};

// ---------------------------------------------------------------------------------------------------------------
// pure helpers (exported for the self-test)

export function parseArgv(argv) {
  const o = { all: false, only: [], screens: true, update: false, concurrency: 4 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') o.all = true;
    else if (a === '--only') o.only.push(argv[++i]);
    else if (a === '--no-screens') o.screens = false;
    else if (a === '--list') o.list = true;
    else if (a === '--update-baseline') o.update = true;
    else if (a === '--concurrency') o.concurrency = Math.max(1, Number(argv[++i]) || 4);
    else throw new Error(`unknown argument: ${a}`);
  }
  return o;
}

/** Routes to test: every dist/**\/index.html that is not a meta-refresh redirect, as '/path/' (trailing slash). */
export function discoverRoutes(dist, { all = false, only = [] } = {}) {
  const files = walk(dist, (p) => p.endsWith('index.html') && !posix(relative(dist, p)).startsWith('_astro/'));
  const pages = [];
  for (const f of files) {
    const html = read(f);
    if (/<meta[^>]+http-equiv=["']?refresh/i.test(html)) continue;
    const path = '/' + posix(relative(dist, f)).replace(/index\.html$/, '');
    pages.push({ path, size: statSync(f).size });
  }
  const posts = pages.filter((p) => p.path.startsWith(POST_PREFIX) && p.path !== POST_PREFIX).sort((a, b) => a.size - b.size);
  let picked = pages;
  if (!all && posts.length > 2) {
    const keep = new Set([posts[0].path, posts.at(-1).path]);
    picked = pages.filter((p) => !posts.includes(p) || keep.has(p.path));
  }
  if (only.length) picked = pages.filter((p) => only.some((o) => p.path.includes(o)));
  return picked.map((p) => p.path);
}

/** A baseline fingerprint is stable across viewports and across run order. */
// Astro's scoped-style hash ([data-astro-cid-xxxx]) changes whenever a component's CSS does, so it is not identity.
const ASTRO_CID = /\[data-astro-cid-[a-z0-9]+(?:="[^"]*")?\]/g;
export const fingerprint = (f) => `${f.rule} | ${f.route} | ${(f.detail ?? '').replace(ASTRO_CID, '')}`;

export function loadBaseline() {
  return new Set(existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')).findings ?? [] : []);
}

/** Split hard findings into new ones (fail) and baselined ones (tolerated); report baseline entries that no longer occur. */
export function applyBaseline(hard, baseline) {
  const seen = new Set();
  const fresh = [];
  const tolerated = [];
  for (const f of hard) {
    const fp = fingerprint(f);
    seen.add(fp);
    (baseline.has(fp) ? tolerated : fresh).push(f);
  }
  const stale = [...baseline].filter((k) => !seen.has(k));
  return { fresh, tolerated, stale };
}

/** A focus outline that paints nothing: style none, zero width, the background colour, or a fully transparent colour. */
const TRANSPARENT_COLOR = /rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)/;
export const outlineInvisible = (f) => f.style === 'none' || !(f.width > 0) || f.color === f.bg || TRANSPARENT_COLOR.test(f.color);

// ---------------------------------------------------------------------------------------------------------------
// preview server

const freePort = () => new Promise((resolve, reject) => {
  const s = createServer();
  s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

async function startPreview() {
  const port = await freePort();
  const astroBin = join(repoRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');
  const child = spawn(process.execPath, [astroBin, 'preview', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  let exited = null;
  child.once('exit', (code) => { exited = code ?? 'signal'; });
  const origin = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (exited !== null) throw new Error(`astro preview exited (${exited}) before it was ready:\n${log}`);
    try { const r = await fetch(origin + '/'); if (r.ok) return { origin, stop: () => stopChild(child) }; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  stopChild(child);
  throw new Error(`astro preview did not answer on ${origin} within 60s:\n${log}`);
}

function stopChild(child) {
  if (child.exitCode !== null || child.killed) return;
  child.kill();
}

// ---------------------------------------------------------------------------------------------------------------
// browser

async function launch() {
  const wanted = process.env.QA_BROWSER_CHANNEL;
  const attempts = wanted ? [{ channel: wanted }] : [{}, { channel: 'chrome' }, { channel: 'msedge' }];
  const errors = [];
  for (const opts of attempts) {
    try {
      const browser = await chromium.launch({ headless: true, ...opts });
      return { browser, label: `${opts.channel ?? 'bundled chromium'} ${browser.version()}` };
    } catch (e) { errors.push(`${opts.channel ?? 'bundled chromium'}: ${String(e.message).split('\n')[0]}`); }
  }
  throw new Error(`no browser could be launched. In CI run \`npx playwright install --with-deps chromium\`; locally set QA_BROWSER_CHANNEL=chrome or msedge.\n  ${errors.join('\n  ')}`);
}

async function newPage(browser, origin, viewport, extra = {}) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1, ...extra });
  // Offline-deterministic: nothing leaves localhost. Blocked requests are recognisable by their failure text.
  await context.route((u) => new URL(u).origin !== origin, (route) => route.abort('blockedbyclient'));
  const page = await context.newPage();
  const problems = [];
  const blocked = (text) => /ERR_BLOCKED_BY_CLIENT/.test(text);
  page.on('console', (m) => { if (m.type() === 'error' && !blocked(m.text())) problems.push({ rule: 'console-error', detail: m.text().slice(0, 200) }); });
  page.on('pageerror', (e) => problems.push({ rule: 'page-error', detail: String(e.message).slice(0, 200) }));
  page.on('response', (r) => { if (r.url().startsWith(origin) && r.status() >= 400) problems.push({ rule: 'request-failed', detail: `${r.status()} ${r.url().slice(origin.length)}` }); });
  page.on('requestfailed', (r) => { if (r.url().startsWith(origin)) problems.push({ rule: 'request-failed', detail: `${r.failure()?.errorText} ${r.url().slice(origin.length)}` }); });
  return { context, page, problems };
}

/** Load a route and make every lazily revealed section visible, as a reader scrolling the page would. */
async function load(page, origin, route) {
  await page.goto(origin + route, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // bundled page scripts (mode switches, galleries) finish their first run after the load event on a loaded machine
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 60));
    }
    scrollTo({ top: 0, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 700));
  });
}

/**
 * Put every animation in a deterministic state before measuring: finite ones jump to their end state, infinite ones
 * (a pulsing opacity, a drift) to their start. Without this axe reads a colour mid-pulse and the run is flaky.
 */
const settle = (page) => page.evaluate(() => {
  for (const a of document.getAnimations()) {
    const t = a.effect?.getComputedTiming();
    if (t && Number.isFinite(t.endTime)) a.finish();
    else { a.pause(); a.currentTime = 0; }
  }
});

// ---------------------------------------------------------------------------------------------------------------
// in-page probes (run in the browser; keep them self-contained)

/**
 * Horizontal containment. The site sets overflow-x: clip on <html>, which hides the sideways scrollbar but not the
 * defect: content wider than the viewport is cut off and unreachable. So this does not trust scrollWidth alone; it
 * lists real elements whose box leaves the viewport and that no ancestor scroller or clip contains. aria-hidden
 * subtrees are decorative layers that bleed on purpose and are skipped.
 */
export const probeLayout = () => {
  const de = document.documentElement;
  const cw = de.clientWidth;
  const name = (el) => `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : ''}`;
  const contained = (el) => {
    for (let p = el.parentElement; p && p !== document.body && p !== de; p = p.parentElement) {
      if (/hidden|clip|auto|scroll/.test(getComputedStyle(p).overflowX)) return true;
    }
    return false;
  };
  const offenders = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    if (el.closest('[aria-hidden="true"], [inert]')) continue;
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || cs.display === 'contents') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if ((r.right > cw + 1 || r.left < -1) && !contained(el)) offenders.push({ sel: name(el), right: Math.round(r.right), left: Math.round(r.left) });
  }
  return { overflow: de.scrollWidth - cw, cw, offenders: offenders.slice(0, 3), offenderCount: offenders.length, mains: document.querySelectorAll('main, [role="main"]').length };
};

/**
 * SL-9. Visible interactive elements smaller than 44x44 CSS px. Exempt, each for a stated reason:
 *  - the skip link: it is clipped until focused, by design, and is sized in its focused state;
 *  - an inline text link inside running text (WCAG 2.5.8 "inline" exception): its target is the line box, so it
 *    cannot be padded to 44px without breaking the paragraph. Detected as display:inline in a block that still
 *    holds any word once every interactive element is removed (so a row or list of bare links, or a link that is
 *    the whole paragraph, is NOT exempt);
 *  - a control whose associated <label> (or wrapping label) is at least 44x44: the label is the hit target;
 *  - a native control that is visually hidden (opacity 0 / clipped) and driven by a larger styled label.
 */
const probeTargets = () => {
  const SEL = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="tab"], [tabindex]:not([tabindex="-1"])';
  const out = [];
  const big = (r) => r.width >= 43.5 && r.height >= 43.5; // tolerate sub-pixel rounding of a 44px box
  const label = (el) => {
    const labels = el.labels ? [...el.labels] : [];
    return labels.some((l) => big(l.getBoundingClientRect()));
  };
  for (const el of document.querySelectorAll(SEL)) {
    if (el.matches('.skip-link')) continue;
    if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true, contentVisibilityAuto: true })) continue;
    if (el.closest('[inert], [aria-hidden="true"]')) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || big(r)) continue;
    const cs = getComputedStyle(el);
    if (el.tagName === 'A' && cs.display === 'inline') {
      let block = el.parentElement;
      while (block && getComputedStyle(block).display === 'inline') block = block.parentElement;
      const clone = block.cloneNode(true);
      clone.querySelectorAll(SEL).forEach((n) => n.remove());
      if (/[\p{L}\p{N}]/u.test(clone.textContent)) continue; // words surround the link, so it sits in a line of text
    }
    if (label(el)) continue;
    if (el.matches('input') && (cs.clip !== 'auto' || +cs.opacity === 0 || (r.width <= 1 && r.height <= 1))) continue;
    const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || el.getAttribute('href') || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    out.push({ w: Math.round(r.width), h: Math.round(r.height), sel: `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : ''}`, name });
  }
  return out;
};

const probeScheme = () => ({
  scheme: getComputedStyle(document.documentElement).colorScheme,
  bg: getComputedStyle(document.documentElement).backgroundColor,
  forced: matchMedia('(forced-colors: active)').matches,
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  prefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
});

const probeMotion = () => {
  const smooth = [];
  for (const el of [document.documentElement, ...document.querySelectorAll('*')]) {
    if (getComputedStyle(el).scrollBehavior === 'smooth') smooth.push(`${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : ''}`);
  }
  const running = document.getAnimations()
    .filter((a) => a.playState === 'running' && (a.effect?.getComputedTiming().duration ?? 0) > 0 && a.effect.target)
    .map((a) => {
      const t = a.effect.target;
      return `${a.animationName ?? a.transitionProperty ?? 'animation'} on ${t.tagName.toLowerCase()}${typeof t.className === 'string' && t.className.trim() ? '.' + t.className.trim().split(/\s+/)[0] : ''}`;
    });
  return { smooth, running };
};

const SKIP_LINK_WAIT_MS = 5000;
const MOTION_WAIT_MS = 5000;
/** Runs in the page. True when no animation or transition with a real duration is running (same filter as probeMotion). */
const motionSettled = () => !document.getAnimations().some((a) => a.playState === 'running' && (a.effect?.getComputedTiming().duration ?? 0) > 0 && a.effect.target);

/** Runs in the page. True when the focused skip link has slid into view, or when something else holds focus (nothing to wait for). */
const skipLinkSettled = () => {
  const el = document.activeElement;
  if (!el || !el.matches('.skip-link')) return true;
  const r = el.getBoundingClientRect();
  return r.width >= 8 && r.height >= 8 && r.top >= -1 && r.left >= -1;
};

const probeFocus = () => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const cs = getComputedStyle(el);
  return {
    sel: `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : ''}`,
    tag: el.tagName, skip: el.matches('.skip-link'), visibleFocus: el.matches(':focus-visible'),
    style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), color: cs.outlineColor, bg: cs.backgroundColor,
    inHeader: !!el.closest('header, nav'), text: (el.textContent || '').trim().slice(0, 24),
  };
};

// ---------------------------------------------------------------------------------------------------------------
// checks

const slug = (route) => (route === '/' ? 'home' : route.replace(/^\/|\/$/g, '').replace(/\//g, '_'));

async function checkPage({ browser, origin, route, viewport, screens, report }) {
  const { context, page, problems } = await newPage(browser, origin, viewport);
  const at = `${route} @${viewport.name}`;
  const add = (rule, lawKey, what, fix, detail, extra = {}) =>
    report.error({ file: at, route, rule, law: LAW[lawKey], what, fix, detail, key: `${rule}|${route}|${detail}`, ...extra });
  try {
    await load(page, origin, route);

    const l = await page.evaluate(probeLayout);
    if (l.overflow > 0 || l.offenderCount > 0) add('overflow-x', 'layout', `content leaves the ${l.cw}px viewport (document scrolls sideways by ${Math.max(0, l.overflow)}px; ${l.offenderCount} uncontained element(s): ${l.offenders.map((o) => `${o.sel} ${o.left}..${o.right}`).join(', ')})`, 'Find the element wider than the viewport (listed in the detail) and constrain it: max-width:100%, min-width:0 on flex/grid children, overflow-wrap:anywhere on long strings, or clip decorative layers with overflow:clip on their wrapper. Never hide the symptom with overflow-x:hidden on body.', l.offenders[0]?.sel ?? 'document-scroll');
    if (l.mains !== 1) add('main-count', 'main', `${l.mains} <main> elements (or role=main) on the page; there must be exactly one`, 'Keep the single <main id="main-content"> in the Base layout and use <div> or <section> inside pages and components.', `${l.mains}`);

    await settle(page);
    const axe = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    for (const v of axe.violations) {
      const hard = v.impact === 'serious' || v.impact === 'critical';
      const target = v.nodes[0]?.target?.join(' ') ?? '';
      const detail = `${v.id} ${target}`.slice(0, 160);
      if (hard) add('axe', 'axe', `axe ${v.id} (${v.impact}): ${v.help} - ${v.nodes.length} node(s)`, `${v.helpUrl} - fix the markup/CSS the selector points at.`, detail);
      else report.warning({ file: at, rule: `axe-${v.impact}`, law: LAW.axe, message: `${v.id}: ${v.help} (${v.nodes.length})`, key: `axe|${v.id}|${route}` });
    }

    const small = await page.evaluate(probeTargets);
    for (const t of small) add('target-size', 'target', `interactive target ${t.w}x${t.h}px is below 44x44 (${t.sel} "${t.name}")`, 'Give the control min-height/min-width 44px (padding or ::after hit area) without changing its look; an inline link inside running text is exempt automatically.', `${t.sel} "${t.name}"`);

    // Skip link: the first Tab stop, visible when focused, and the next Tab stop is inside <main>.
    await page.evaluate(() => { scrollTo({ top: 0, behavior: 'instant' }); document.activeElement?.blur?.(); });
    await page.keyboard.press('Tab');
    // .skip-link slides in over a 0.2s transition: poll until it is on screen (or the focus is somewhere else, which the
    // checks below report) instead of sleeping a fixed time, which flaked under CPU load. A timeout is not an error here:
    // the box check below reports a link that never arrives.
    await page.waitForFunction(skipLinkSettled, null, { timeout: SKIP_LINK_WAIT_MS }).catch(() => {});
    const first = await page.evaluate(probeFocus);
    if (!first?.skip) add('skip-link', 'skip', `the first Tab stop is ${first ? first.sel : 'nothing'}, not the skip link`, 'Keep <a class="skip-link" href="#main-content"> as the first focusable element of <body>.', 'first-tab-stop');
    else {
      const box = await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return { top: r.top, left: r.left, w: r.width, h: r.height }; });
      if (box.w < 8 || box.h < 8 || box.top < -1 || box.left < -1) add('skip-link', 'skip', 'the skip link takes focus but is not visible on screen', 'The :focus state of .skip-link must bring it into the viewport (position/clip reset).', 'skip-link-visible');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Tab');
      const landed = await page.evaluate(() => {
        const t = document.querySelector('#main-content');
        const focusable = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';
        return { hash: location.hash, targetIsMain: !!t && t.matches('main'), inside: !!t && t.contains(document.activeElement) && t !== document.activeElement, mainHasFocusable: !!t?.querySelector(focusable) };
      });
      if (landed.hash !== '#main-content' || !landed.targetIsMain) add('skip-link', 'skip', `activating the skip link left hash "${landed.hash}" and #main-content ${landed.targetIsMain ? 'is' : 'is not'} the <main> element`, 'href="#main-content" must resolve to the page <main id="main-content">.', 'skip-link-target');
      else if (!landed.inside && landed.mainHasFocusable) add('skip-link', 'skip', 'after the skip link, the next Tab stop is not inside <main>', 'The skip target must precede the main content in tab order and <main> must contain a focusable element.', 'skip-link-next');
    }

    if (screens) {
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: join(QA_OUT, `${slug(route)}-${viewport.name}.png`), fullPage: true, animations: 'disabled', caret: 'hide' });
    }
    for (const p of problems) add(p.rule, 'console', `${p.rule}: ${p.detail}`, 'Fix the error at its source; the QA run blocks every cross-origin request, so errors that remain come from this site.', p.detail);
  } catch (e) {
    add('qa-crash', 'console', `the check itself failed: ${String(e.message).split('\n')[0]}`, 'Re-run with --only for this route; a crash is never a pass.', String(e.message).split('\n')[0].slice(0, 120));
  } finally { await context.close(); }
}

async function checkEmulation({ browser, origin, route, report }) {
  const viewport = VIEWPORTS[2];
  const at = `${route} @${viewport.name}`;
  const add = (rule, lawKey, what, fix, detail) => report.error({ file: at, route, rule, law: LAW[lawKey], what, fix, detail, key: `${rule}|${route}|${detail}` });
  const run = async (extra, fn) => {
    const { context, page } = await newPage(browser, origin, viewport, extra);
    try { await load(page, origin, route); await fn(page); }
    catch (e) { add('qa-crash', 'console', `emulation check failed: ${String(e.message).split('\n')[0]}`, 'A crash is never a pass.', String(e.message).split('\n')[0].slice(0, 120)); }
    finally { await context.close(); }
  };

  // forced-colors: every one of the first FOCUS_STOPS keyboard stops (nav links, buttons, cards, the lot) must show an outline.
  await run({ forcedColors: 'active' }, async (page) => {
    const s = await page.evaluate(probeScheme);
    if (!s.forced) return add('emulation-inert', 'forced', 'forced-colors emulation did not apply, so the focus check proves nothing', 'Browser or Playwright regression: investigate before trusting this gate.', 'forced-colors');
    await page.evaluate(() => { scrollTo({ top: 0, behavior: 'instant' }); document.activeElement?.blur?.(); });
    let headerLinks = 0;
    for (let i = 0; i < FOCUS_STOPS; i++) {
      await page.keyboard.press('Tab');
      const f = await page.evaluate(probeFocus);
      if (!f) break; // focus left the document
      if (f.skip) continue;
      if (f.tag === 'A' && f.inHeader) headerLinks++;
      const invisible = outlineInvisible(f);
      if (invisible) add('forced-colors-focus', 'forced', `focused ${f.sel} "${f.text}" has no visible outline under forced-colors (outline ${f.style} ${f.width}px ${f.color}, background ${f.bg})`, 'Never set outline:none on :focus-visible. Use outline:2px solid transparent (it renders in a system colour under forced-colors) and draw the visible ring with box-shadow.', f.sel);
    }
    if (!headerLinks) add('forced-colors-focus', 'forced', 'no header link was reachable by Tab, so the nav focus ring could not be checked', 'The header navigation must be keyboard reachable on every page.', 'no-header-link');
  });

  // reduced motion: no smooth scrolling anywhere, no running animation, no running transition.
  await run({ reducedMotion: 'reduce' }, async (page) => {
    const s = await page.evaluate(probeScheme);
    if (!s.reduced) return add('emulation-inert', 'motion', 'reduced-motion emulation did not apply, so the motion check proves nothing', 'Browser or Playwright regression: investigate before trusting this gate.', 'reduced-motion');
    // A reduced-motion override (a near-zero duration) only reads as finished once the page has produced a frame, which a
    // loaded machine delays: poll for "nothing running" instead of sleeping. An animation that really never stops times
    // out here and is reported by the probe below.
    await page.waitForFunction(motionSettled, null, { timeout: MOTION_WAIT_MS }).catch(() => {});
    const m = await page.evaluate(probeMotion);
    for (const sel of [...new Set(m.smooth)]) add('reduced-motion-scroll', 'motion', `${sel} has scroll-behavior: smooth under prefers-reduced-motion: reduce`, 'Wrap smooth scrolling in @media (prefers-reduced-motion: no-preference) and take JS scroll behaviour from src/lib/scroll.ts.', sel);
    for (const a of [...new Set(m.running)]) add('reduced-motion-animation', 'motion', `an animation is still running under prefers-reduced-motion: reduce: ${a}`, 'Disable the animation inside @media (prefers-reduced-motion: reduce), or move it into @media (prefers-reduced-motion: no-preference).', a);
  });

  // color-scheme: dark regardless of the OS preference.
  for (const colorScheme of ['dark', 'light']) {
    await run({ colorScheme }, async (page) => {
      const s = await page.evaluate(probeScheme);
      if (s.prefersDark !== (colorScheme === 'dark')) return add('emulation-inert', 'scheme', `color-scheme emulation "${colorScheme}" did not apply`, 'Browser or Playwright regression: investigate before trusting this gate.', `scheme-${colorScheme}`);
      if (!/\bdark\b/.test(s.scheme)) add('color-scheme', 'scheme', `computed color-scheme is "${s.scheme}" with the OS set to ${colorScheme}; it must contain dark`, 'Set :root { color-scheme: dark } and <meta name="color-scheme" content="dark">.', `scheme-${colorScheme}`);
      if (s.bg === 'rgba(0, 0, 0, 0)' || /^rgb\(255, 255, 255\)$/.test(s.bg)) add('color-scheme', 'scheme', `the root canvas background is ${s.bg} with the OS set to ${colorScheme}`, 'html must paint var(--sg57-void) so the canvas is never white or transparent.', `canvas-${colorScheme}`);
    });
  }
}

// ---------------------------------------------------------------------------------------------------------------
// main

async function pool(items, size, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(size, queue.length) }, async () => {
    for (let item; (item = queue.shift()); ) await fn(item);
  }));
}

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgv(argv);
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error(`[gate:qa] FAIL no built site at ${DIST}. Run \`npm run qa\` (builds first) or \`npm run build\`.`);
    return 1;
  }
  const routes = discoverRoutes(DIST, opts);
  if (!routes.length) { console.error('[gate:qa] FAIL no routes matched.'); return 1; }
  if (opts.screens) { rmSync(QA_OUT, { recursive: true, force: true }); mkdirSync(QA_OUT, { recursive: true }); }

  const report = new Report('qa');
  const started = Date.now();
  const preview = await startPreview();
  let browserInfo;
  let browser;
  try {
    const launched = await launch();
    browser = launched.browser;
    browserInfo = launched.label;
    const jobs = routes.flatMap((route) => VIEWPORTS.map((viewport) => ({ route, viewport })));
    await pool(jobs, opts.concurrency, (j) => checkPage({ browser, origin: preview.origin, screens: opts.screens, report, ...j }));
    const emu = routes.filter((r) => EMULATION_ROUTES.includes(r));
    await pool(emu, opts.concurrency, (route) => checkEmulation({ browser, origin: preview.origin, route, report }));
  } finally {
    await browser?.close();
    preview.stop();
  }

  report.note(`${routes.length} routes x ${VIEWPORTS.length} viewports (${VIEWPORTS.map((v) => v.name).join('/')}), emulations on ${routes.filter((r) => EMULATION_ROUTES.includes(r)).length} routes, ${browserInfo}, ${((Date.now() - started) / 1000).toFixed(0)}s`);
  report.note('axe covers a minority of WCAG 2.2 AA; this run does not claim WCAG 2.2 conformance');
  if (opts.screens) report.note(`screenshots: ${posix(relative(process.cwd(), QA_OUT))}/<route>-<viewport>.png (gitignored)`);

  if (opts.update) {
    const next = [...new Set(report.hard.map(fingerprint))].sort();
    writeFileSync(BASELINE, JSON.stringify({ note: 'qa:spine findings tolerated while they are fixed (fingerprint: rule | route | detail). Only ever shrink this file.', total: next.length, findings: next }, null, 2) + '\n');
    console.log(`[gate:qa] baseline rewritten: ${next.length} findings`);
    return 0;
  }

  const { fresh, tolerated, stale } = applyBaseline(report.hard, loadBaseline());
  report.hard = fresh;
  if (tolerated.length) report.note(`${tolerated.length} finding(s) tolerated by scripts/qa/baseline.json (pre-existing; fix and shrink it)`);
  // only a full run (--all, no --only) can say an entry no longer occurs; a partial run simply did not visit it
  if (opts.all && !opts.only.length && stale.length) report.note(`${stale.length} baseline entr${stale.length === 1 ? 'y' : 'ies'} no longer occur: run --update-baseline to tighten`);
  report.print({ all: opts.list });
  return report.failed ? 1 : 0;
}

if (isMain(import.meta.url)) {
  main().then((code) => { process.exitCode = code; }, (e) => { console.error(`[gate:qa] CRASH ${e.stack ?? e}`); process.exitCode = 1; });
}
