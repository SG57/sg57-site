// gate:floors - the statically checkable promises of CONSTITUTION.md SL-7, SL-8 and SL-10, checked against the BUILT
// site (dist) and the JS in src. Where a law cannot be proved statically it is listed under TODO(browser-spine) below
// and in the printed notes; it is never faked here.
//
// Encoded from the text of CONSTITUTION.md (not from memory):
//   SL-7  every page: <title>, <meta description>, <link rel=canonical>; Open Graph and Twitter Card tags; sitemap
//         generated; every <img> has an alt attribute (alt="" for decorative).
//   SL-8  images: WebP/AVIF (SVG is vector and allowed), explicit width/height or aspect-ratio, loading="lazy";
//         fonts: font-display: swap, preload the critical weights (SL8_PRELOAD_WEIGHTS); no framework islands.
//   SL-10 all animation respects prefers-reduced-motion. AMENDMENT (approved by the owner, text edit lands with the
//         session that fixes the defects): programmatic and CSS smooth scrolling is allowed ONLY when the user has not
//         asked for reduced motion. Federal Law 9 already forbids motion under prefers-reduced-motion: reduce, and
//         Federal supremacy beats the SL-10 sentence that mandates unconditional smooth scroll.
//
// TODO(browser-spine): SL-9 44px minimum touch targets and the 640/720/900 breakpoints need computed layout.
// TODO(browser-spine): SL-10 "all animations respect reduced motion" and "transform-only particles" need computed
//                      styles under emulated prefers-reduced-motion: reduce.
// TODO(browser-spine): SL-8 sub-1s FCP and the real preload-versus-use of font weights need a browser trace.
// TODO(browser-spine): SL-7 JSON-LD "when applicable" is a judgement call, not statically decidable.
import { Report, parseArgs, walk, read, rel, posix, lineOf, finish, isMain } from './lib.mjs';
import { scanDeclarations, inNoPreference, styleBlocks } from './css-scan.mjs';
import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';

/** SL-8 names these weights. Single source: change here when the law is amended. */
export const SL8_PRELOAD_WEIGHTS = [300, 400, 700];

const TAG = (name) => new RegExp(`<${name}\\b(?:[^>"']|"[^"]*"|'[^']*')*>`, 'gi');
const ATTR = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

export function attrs(tag) {
  const out = {};
  const inner = tag.replace(/^<\w+/, '').replace(/\/?>$/, '');
  for (const m of inner.matchAll(ATTR)) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  return out;
}
const tags = (html, name) => [...html.matchAll(TAG(name))].map((m) => ({ raw: m[0], a: attrs(m[0]), index: m.index }));

const LAW7 = 'SL-7 (SEO requirements)';
const LAW8 = 'SL-8 (performance budgets)';
const LAW10 = 'SL-10 (animation constraints, amended: smooth only when motion is allowed) + Federal Law 9';

function checkPage(file, html, report) {
  const f = rel(file);
  const metas = tags(html, 'meta');
  const links = tags(html, 'link');
  const isRedirect = metas.some((m) => (m.a['http-equiv'] ?? '').toLowerCase() === 'refresh');
  if (!isRedirect) {
    const miss = (rule, what, fix) => report.error({ file: f, rule, law: LAW7, what, fix, detail: what });
    const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim();
    if (!title) miss('seo-title', 'missing or empty <title>', 'Pass a non-empty `title` prop to the Base layout; never render an empty <title>.');
    const meta = (key, val) => metas.find((m) => (m.a[key] ?? '').toLowerCase() === val && (m.a.content ?? '').trim());
    if (!meta('name', 'description')) miss('seo-description', 'missing <meta name="description">', 'Pass a `description` prop to the Base layout (it renders the meta description and og:description).');
    if (!links.some((l) => (l.a.rel ?? '').toLowerCase() === 'canonical' && l.a.href)) miss('seo-canonical', 'missing <link rel="canonical">', 'Render `<link rel="canonical" href={new URL(Astro.url.pathname, Astro.site)} />` in the Base layout head.');
    for (const p of ['og:title', 'og:description', 'og:image']) {
      if (!meta('property', p)) miss(`seo-${p.replace(':', '-')}`, `missing <meta property="${p}">`, `Render <meta property="${p}" content=...> in the Base layout head (absolute URL for og:image).`);
    }
    if (!meta('name', 'twitter:card') && !meta('property', 'twitter:card')) miss('seo-twitter-card', 'missing <meta name="twitter:card">', 'Render <meta name="twitter:card" content="summary_large_image"> plus twitter:title/description/image in the Base layout head.');
  }
  for (const img of tags(html, 'img')) {
    const where = { file: f, line: lineOf(html, img.index) };
    const src = img.a.src ?? '';
    const name = src.split('?')[0].split('/').pop() || '(inline)';
    if (!('alt' in img.a)) report.error({ ...where, rule: 'img-alt', law: LAW7, what: 'an <img> has no alt attribute', fix: 'Add alt="meaningful description", or alt="" when the image is purely decorative.', detail: name });
    const sized = ('width' in img.a && 'height' in img.a) || /aspect-ratio\s*:/i.test(img.a.style ?? '');
    if (!sized) report.error({ ...where, key: src, rule: 'img-size', law: LAW8, what: 'an <img> has no explicit width and height (or inline aspect-ratio); the image causes layout shift (CLS)', fix: 'Use Astro <Image>/<Picture> from astro:assets, or set intrinsic width="W" height="H" attributes (CSS may still scale it with width:100%; height:auto).', detail: name });
    if (src && !src.startsWith('data:') && !/\.(webp|avif|svg)$/i.test(src.split('?')[0])) report.warning({ ...where, key: src, rule: 'img-format', law: LAW8, message: `${name}: raster image is not WebP/AVIF (SL-8). Convert content images with Astro <Image format="webp">; small alpha logos or favicons may need an explicit SL-8 exemption` });
    const lazy = (img.a.loading ?? '').toLowerCase() === 'lazy' || (img.a.fetchpriority ?? '').toLowerCase() === 'high';
    if (!lazy) report.warning({ ...where, key: src, rule: 'img-lazy', law: LAW8, message: `${name}: no loading="lazy" (or fetchpriority="high" for the LCP image); SL-8 mandates lazy loading for below-the-fold images` });
  }
  if (/<astro-island\b/i.test(html)) report.warning({ file: f, rule: 'framework-island', law: LAW8, message: 'hydrated framework island present; SL-8 allows islands only where needed' });
  return { metas, links };
}

/** font-display + weight map from every @font-face in the built CSS. */
function fontFaces(cssTexts) {
  const faces = [];
  for (const { file, css } of cssTexts) {
    const re = /@font-face\s*\{([^}]*)\}/gi;
    for (const m of css.matchAll(re)) {
      const body = m[1];
      const get = (p) => new RegExp(`(?:^|[;\\s])${p}\\s*:\\s*([^;]+)`, 'i').exec(body)?.[1]?.trim();
      faces.push({ file, family: get('font-family'), weight: get('font-weight'), display: get('font-display'), src: get('src') ?? '' });
    }
  }
  return faces;
}

export function runFloorsGate({ dist, src }) {
  const report = new Report('floors');
  const pages = walk(dist, (p) => p.endsWith('.html')).filter((p) => !posix(p).includes('/_shots/'));
  if (pages.length === 0) {
    report.error({ file: rel(dist), rule: 'no-input', law: 'gate integrity', what: `no HTML under ${rel(dist)}`, fix: 'Run `npm run build` first; a gate that inspects nothing must not pass.' });
    return report;
  }
  report.note(`${pages.length} pages checked`);
  const htmls = pages.map((file) => ({ file, html: read(file) }));
  for (const { file, html } of htmls) checkPage(file, html, report);

  if (!existsSync(join(dist, 'sitemap-index.xml')) && !existsSync(join(dist, 'sitemap.xml'))) {
    report.error({ file: rel(dist), rule: 'seo-sitemap', law: LAW7, what: 'no sitemap-index.xml in the build output', fix: 'Keep the @astrojs/sitemap integration enabled in astro.config.mjs and set `site`.' });
  }

  // ---- CSS floors (SL-8 fonts, SL-10 smooth scroll) over dist css + inline <style> ----
  const cssTexts = walk(dist, (p) => p.endsWith('.css')).map((file) => ({ file, css: read(file) }));
  for (const { file, html } of htmls) styleBlocks(html).forEach((css) => cssTexts.push({ file, css }));

  const faces = fontFaces(cssTexts);
  for (const f of faces) {
    if (!/^swap$/i.test(f.display ?? '')) {
      report.error({ file: rel(f.file), rule: 'font-display', law: LAW8, what: `@font-face ${f.family} ${f.weight ?? ''} lacks font-display: swap`, fix: 'Add `font-display: swap;` to the @font-face rule.', detail: `${f.family} ${f.weight}` });
    }
  }
  const weightOf = (href) => {
    const file = basename(href.split('?')[0]);
    const hit = faces.find((f) => f.src.includes(file));
    return hit?.weight ? Number.parseInt(hit.weight, 10) : undefined;
  };
  for (const { file, html } of htmls) {
    const metas = tags(html, 'meta');
    if (metas.some((m) => (m.a['http-equiv'] ?? '').toLowerCase() === 'refresh')) continue;
    const preloaded = tags(html, 'link')
      .filter((l) => (l.a.rel ?? '').toLowerCase() === 'preload' && (l.a.as ?? '').toLowerCase() === 'font')
      .map((l) => ({ href: l.a.href, weight: weightOf(l.a.href ?? '') }));
    const have = new Set(preloaded.map((p) => p.weight));
    const missing = SL8_PRELOAD_WEIGHTS.filter((w) => !have.has(w));
    const extra = [...have].filter((w) => !SL8_PRELOAD_WEIGHTS.includes(w));
    if (missing.length || extra.length) {
      report.error({
        file: rel(file), key: `${missing}|${extra}`, rule: 'font-preload-weights', law: LAW8,
        what: `preloaded font weights [${[...have].sort().join(', ')}] differ from the weights SL-8 names [${SL8_PRELOAD_WEIGHTS.join(', ')}]`,
        fix: `Preload exactly the SL-8 weights: add the missing weights and drop the extra ones in Base.astro <head> (<link rel="preload" as="font" type="font/woff2" crossorigin>), or amend SL-8 and SL8_PRELOAD_WEIGHTS in scripts/gates/floors.mjs together.`,
        detail: `missing [${missing.join(', ')}] extra [${extra.join(', ')}]`,
      });
    }
  }

  const smoothHits = [];
  for (const { file, css } of cssTexts) {
    for (const d of scanDeclarations(css)) {
      if (d.prop === 'scroll-behavior' && /^smooth\b/i.test(d.value) && !inNoPreference(d.stack)) {
        smoothHits.push({ file, selector: d.stack[d.stack.length - 1] });
      }
    }
  }
  for (const { file, html } of htmls) {
    for (const m of html.matchAll(/style\s*=\s*"[^"]*scroll-behavior\s*:\s*smooth/gi)) smoothHits.push({ file, selector: 'style attribute', index: m.index });
  }
  const srcHint = smoothSources(src);
  if (smoothHits.length && srcHint) report.note(`unwrapped scroll-behavior: smooth in source: ${srcHint}`);
  for (const h of smoothHits) {
    report.error({
      file: rel(h.file), rule: 'scroll-behavior-smooth', law: LAW10,
      what: `\`scroll-behavior: smooth\` on "${h.selector}" applies to users who asked for reduced motion`,
      fix: 'Wrap it: `@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }` (same for component scroll containers). Do not rely on a later `reduce` override; motion is opt-in.',
      detail: `selector ${h.selector}`,
    });
  }

  // ---- JS floor: no literal smooth behaviour outside a helper that consults matchMedia(reduce) ----
  const jsFiles = walk(src, (p) => /\.(astro|ts|js|mjs|mts|tsx|jsx)$/.test(p));
  for (const file of jsFiles) {
    const text = read(file);
    for (const m of text.matchAll(/(?:behavior\s*:|scrollBehavior\s*=)\s*(["'`])smooth\1/g)) {
      if (insideReduceHelper(text, m.index)) continue;
      report.error({
        file: posix(rel(file)), line: lineOf(text, m.index), rule: 'js-smooth-literal', law: LAW10,
        what: `programmatic scroll uses the literal behavior: 'smooth' with no reduced-motion check`,
        fix: "Compute the behaviour: `const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'` (or a small helper that does) and pass `{ behavior }`.",
        detail: text.split('\n')[lineOf(text, m.index) - 1].trim().slice(0, 100),
      });
    }
  }
  return report;
}

/** src locations of unwrapped smooth scrolling, to point an agent at the file to edit. */
function smoothSources(src) {
  const hits = [];
  for (const file of walk(src, (p) => /\.(css|astro)$/.test(p))) {
    const text = read(file);
    for (const m of text.matchAll(/scroll-behavior\s*:\s*smooth/g)) hits.push(`${posix(rel(file))}:${lineOf(text, m.index)}`);
  }
  return hits.join(', ');
}

/** Is `index` inside a brace block (not the whole script) whose text checks matchMedia + prefers-reduced-motion? */
export function insideReduceHelper(text, index) {
  let depth = 0;
  for (let i = index - 1; i >= 0; i--) {
    const c = text[i];
    if (c === '}') depth++;
    else if (c === '{') {
      if (depth > 0) { depth--; continue; }
      let d = 1;
      let j = i + 1;
      for (; j < text.length && d > 0; j++) { if (text[j] === '{') d++; else if (text[j] === '}') d--; }
      const block = text.slice(i, j);
      if (/matchMedia\s*\(/.test(block) && /prefers-reduced-motion/.test(block)) return true;
    }
  }
  return false;
}

if (isMain(import.meta.url)) {
  const opts = parseArgs();
  finish(runFloorsGate(opts), opts);
}
