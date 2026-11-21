// Gate self-test (npm run test:gates). Every gate is run as a real child process (so the exit code the CI/agent sees is
// what is asserted) against fixtures: a known-good tree must exit 0, and each known-bad case must exit non-zero AND name
// the intended rule (so a gate cannot go red for the wrong reason). Floors/html bad cases are single mutations of an
// otherwise-green fixture, which proves each rule turns red independently.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCheckOutput, compare, runCheckGate } from './check-ratchet.mjs';
import { insideReduceHelper } from './floors.mjs';
import { scanDeclarations, inNoPreference } from './css-scan.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const fx = (...p) => join(here, 'fixtures', ...p);

function gate(file, args) {
  // gate:css reads the repo's reviewed allow list by default; a fixture run must not see (or go stale against) it
  const withAllow = file === 'css.mjs' && !args.includes('--allow') ? [...args, '--allow', fx('css', 'no-allow.json')] : args;
  const r = spawnSync(process.execPath, [join(here, file), ...withAllow], { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const scratch = [];
function mutated(fixtureDir, edits) {
  const dir = mkdtempSync(join(tmpdir(), 'sg57-gate-'));
  scratch.push(dir);
  cpSync(fixtureDir, dir, { recursive: true });
  for (const [file, from, to] of edits) {
    const p = join(dir, file);
    // fixtures are CRLF in a Windows working tree (autocrlf); the anchors are written with LF
    const before = readFileSync(p, 'utf8').replaceAll(String.fromCharCode(13, 10), '\n');
    assert.ok(before.includes(from), `mutation anchor not found in ${file}: ${from}`);
    writeFileSync(p, before.replace(from, to));
  }
  return dir;
}
process.on('exit', () => scratch.forEach((d) => rmSync(d, { recursive: true, force: true })));

describe('gate:html', () => {
  const good = fx('html', 'good');
  it('passes a clean page', () => assert.equal(gate('html.mjs', ['--dist', good]).code, 0));
  const cases = {
    'no-multiple-main': ['<h1>Heading</h1>', '<h1>Heading</h1><main>nested</main>'],
    'valid-id': ['id="intro"', 'id="1-intro"'],
    'empty-heading': ['<h2>Intro</h2>', '<h2></h2>'],
    'hidden-focusable': ['<span>decor</span>', '<a href="/q">focusable</a>'],
    'wcag/h30': ['<span class="sr-only">Read more</span>', ''],
    'wcag/h37': ['alt="" width', 'width'],
  };
  for (const [rule, [from, to]] of Object.entries(cases)) {
    it(`fails on ${rule}`, () => {
      const dir = mutated(good, [['index.html', from, to]]);
      const r = gate('html.mjs', ['--dist', dir]);
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, new RegExp(`FAIL ${rule.replace('/', '\\/')}`));
    });
  }
  it('fails (does not pass silently) on an empty dist', () => {
    const dir = mutated(good, []);
    rmSync(join(dir, 'index.html'));
    const r = gate('html.mjs', ['--dist', dir]);
    assert.equal(r.code, 1);
    assert.match(r.out, /no-input/);
  });
  it('ignores _shots', () => {
    const dir = mutated(good, []);
    cpSync(join(dir, 'index.html'), join(dir, '_shots', 'index.html'));
    writeFileSync(join(dir, '_shots', 'index.html'), '<!doctype html><title>x</title><main></main><main></main>');
    assert.equal(gate('html.mjs', ['--dist', dir]).code, 0);
  });
});

describe('gate:css', () => {
  it('passes the good fixtures', () => assert.equal(gate('css.mjs', ['--src', fx('css', 'good', 'src')]).code, 0));
  it('fails the bad fixtures and names the rule (css + astro style, 3 hits)', () => {
    const r = gate('css.mjs', ['--src', fx('css', 'bad', 'src')]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /FAIL focus-visible-outline x3/);
  });
  it('cannot be silenced with a stylelint-disable comment', () => {
    const dir = mutated(fx('css', 'bad'), [['src/ring.css', '.btn:focus-visible', '/* stylelint-disable */\n.btn:focus-visible']]);
    rmSync(join(dir, 'src', 'Widget.astro')); // leave only the silenced rule so the assertion cannot pass on other hits
    const r = gate('css.mjs', ['--src', join(dir, 'src')]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /FAIL focus-visible-outline/);
  });
  it('fails on an empty src', () => {
    const dir = mutated(fx('html', 'good'), []);
    assert.equal(gate('css.mjs', ['--src', dir]).code, 1);
  });
  describe('reviewed allow list', () => {
    const withRemoval = () => {
      const dir = mutated(fx('css', 'good'), []);
      writeFileSync(join(dir, 'src', 'heading.css'), '.wizard-heading { outline: none; }\n');
      return dir;
    };
    const allowFile = (entries) => {
      const dir = mutated(fx('css', 'good'), []);
      const p = join(dir, 'allow.json');
      writeFileSync(p, JSON.stringify(entries));
      return p;
    };
    it('an unlisted outline removal on a plain selector fails', () => {
      const r = gate('css.mjs', ['--src', join(withRemoval(), 'src')]);
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /outline removed on "\.wizard-heading"/);
    });
    it('the same removal passes when the selector carries a reviewed entry', () => {
      const r = gate('css.mjs', ['--src', join(withRemoval(), 'src'), '--allow', allowFile({ '.wizard-heading': 'takes programmatic focus only' })]);
      assert.equal(r.code, 0, r.out);
    });
    it('a stale entry (no removal matches it any more) fails', () => {
      const r = gate('css.mjs', ['--src', join(withRemoval(), 'src'), '--allow', allowFile({ '.wizard-heading': 'ok', '.gone': 'stale' })]);
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /FAIL focus-allow-stale/);
      assert.match(r.out, /\.gone/);
    });
    it('the repo allow list has no stale entry against the real source (the shipped gate is green)', () => {
      const r = gate('css.mjs', ['--src', join(here, '..', '..', 'src'), '--allow', join(here, 'focus-allow.json')]);
      assert.equal(r.code, 0, r.out);
    });
  });
});

describe('gate:scripts (page-load)', () => {
  it('passes direct, relative-import, inline, json and escape-hatch scripts', () => {
    const r = gate('page-load.mjs', ['--src', fx('scripts', 'good', 'src')]);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /3 bundled scripts checked/);
  });
  it('fails scripts with no handler, and a DOMContentLoaded-only script', () => {
    const r = gate('page-load.mjs', ['--src', fx('scripts', 'bad', 'src')]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /FAIL bundled-script-without-page-load x2/);
    assert.match(r.out, /direct\.astro/);
    assert.match(r.out, /domready\.astro/);
  });
  const LISTENER = "document.addEventListener('astro:page-load', init);";
  for (const [name, to] of Object.entries({
    'a line comment': `// ${LISTENER}`,
    'a block comment': `/* ${LISTENER} */`,
  })) {
    it(`a listener that only appears in ${name} does not satisfy the gate`, () => {
      const dir = mutated(fx('scripts', 'good'), [['src/pages/direct.astro', LISTENER, to]]);
      const r = gate('page-load.mjs', ['--src', join(dir, 'src')]);
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /direct\.astro/);
    });
  }
  it('a listener preceded by a string containing // still counts (the comment masker respects strings)', () => {
    const dir = mutated(fx('scripts', 'good'), [['src/pages/direct.astro', LISTENER, `const u = 'https://example.test/x'; ${LISTENER}`]]);
    assert.equal(gate('page-load.mjs', ['--src', join(dir, 'src')]).code, 0);
  });
  it('a bundled script whose src cannot be resolved fails instead of being skipped', () => {
    const dir = mutated(fx('scripts', 'good'), [['src/pages/direct.astro', '<script>\n', '<script src="./missing-file.ts"></script>\n<script>\n']]);
    const r = gate('page-load.mjs', ['--src', join(dir, 'src')]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /FAIL bundled-script-unresolved/);
  });
  it('a relative import without a handler does not satisfy the gate', () => {
    const dir = mutated(fx('scripts', 'good'), [['src/lib/setup.ts', "'astro:after-swap'", "'click'"]]);
    const r = gate('page-load.mjs', ['--src', join(dir, 'src')]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /viaimport\.astro/);
  });
});

describe('gate:floors', () => {
  const good = fx('floors', 'good');
  const args = (dir) => ['--dist', join(dir, 'out'), '--src', join(dir, 'src')];
  it('passes a compliant site (redirect stub exempt, > inside alt parsed correctly)', () => {
    const r = gate('floors.mjs', args(good));
    assert.equal(r.code, 0, r.out);
  });
  const H = 'out/index.html';
  const C = 'out/_astro/a.css';
  const cases = {
    'seo-title': [[H, '<title>Home</title>', '<title></title>']],
    'seo-description': [[H, '<meta name="description" content="d">', '']],
    'seo-canonical': [[H, '<link rel="canonical" href="https://example.test/">', '']],
    'seo-og-title': [[H, '<meta property="og:title" content="t">', '']],
    'seo-og-image': [[H, '<meta property="og:image" content="https://example.test/i.webp">', '']],
    'seo-og-description': [[H, '<meta property="og:description" content="d">', '']],
    'seo-twitter-card': [[H, '<meta name="twitter:card" content="summary_large_image">', '']],
    'img-alt': [[H, 'alt="A thing > another" ', '']],
    'img-size': [[H, ' width="10" height="10"', '']],
    'font-display': [[C, 'font-weight:400;font-display:swap', 'font-weight:400']],
    'font-preload-weights': [[H, '<link rel="preload" href="/fonts/f-600.woff2" as="font" type="font/woff2" crossorigin>', '']],
    'font-preload-weights ': [[H, '<link rel="preload" href="/fonts/f-700.woff2" as="font" type="font/woff2" crossorigin>', '<link rel="preload" href="/fonts/f-700.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/fonts/f-300.woff2" as="font" type="font/woff2" crossorigin>']],
    'font-display ': [[C, '@font-face{font-family:"F Fallback";src:local("Arial");size-adjust:91%}', '@font-face{font-family:"F Fallback";src:url(/fonts/fb.woff2) format("woff2");size-adjust:91%}']],
    'theme-color': [[H, '<meta name="theme-color" content="#0a0c10">', '<meta name="theme-color" content="#0f0f1a">']],
    'theme-color ': [[H, '<meta name="theme-color" content="#0a0c10">', '']],
    'manifest-color': [['out/site.webmanifest', '"background_color":"#0a0c10"', '"background_color":"#0f0f1a"']],
    'manifest-color ': [['out/site.webmanifest', '"theme_color":"#0a0c10"', '"theme_color":"#ffffff"']],
    'scroll-behavior-smooth': [[C, '@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}', 'html{scroll-behavior:smooth}']],
    'scroll-behavior-smooth ': [[C, '(prefers-reduced-motion:no-preference)', '(prefers-reduced-motion:reduce)']],
    'js-smooth-literal': [['src/scroll.astro', "reduce ? 'auto' : 'smooth'", "'smooth'"]],
    'js-smooth-literal ': [['src/scroll.astro', "if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.scrollIntoView(); return; }", '']],
    'js-smooth-literal  ': [['src/scroll.astro', "reduce ? 'auto' : 'smooth'", "'auto'); document.documentElement.style.scrollBehavior = 'smooth'; (0"]],
    'seo-sitemap': [['out/sitemap-index.xml', '<sitemapindex/>', '<x/>']],
    // media-query list bypasses: no-preference merely MENTIONED is not a guarantee
    'scroll-behavior-smooth  ': [[C, '@media (prefers-reduced-motion:no-preference){', '@media (prefers-reduced-motion:reduce),(prefers-reduced-motion:no-preference){']],
    'scroll-behavior-smooth   ': [[C, '@media (prefers-reduced-motion:no-preference){', '@media not all and (prefers-reduced-motion:no-preference){']],
    'scroll-behavior-smooth    ': [[C, '@media (prefers-reduced-motion:no-preference){', '@media (prefers-reduced-motion:no-preference) or (min-width:1px){']],
    // a value the gate cannot prove static
    'scroll-behavior-smooth     ': [[C, '.track{scroll-behavior:auto}', '.track{scroll-behavior:var(--sb)}']],
    'scroll-behavior-smooth      ': [[C, '.track{scroll-behavior:auto}', '.track{scroll-behavior:SMOOTH}']],
    'scroll-behavior-smooth       ': [[H, '<main>', '<main style="scroll-behavior:var(--x)">']],
  };
  for (const [name, edits] of Object.entries(cases)) {
    const rule = name.trim();
    it(`fails on ${name.trim()}${name.endsWith(' ') ? ' (variant)' : ''}`, () => {
      const dir = mutated(good, edits);
      if (rule === 'seo-sitemap') rmSync(join(dir, 'out', 'sitemap-index.xml'));
      const r = gate('floors.mjs', args(dir));
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, new RegExp(`FAIL ${rule} `), r.out);
    });
  }
  describe('smooth-scroll heuristics (lexical, documented in AGENTS.md)', () => {
    const withJs = (name, js) => {
      const dir = mutated(good, []);
      writeFileSync(join(dir, 'src', name), js);
      return gate('floors.mjs', args(dir));
    };
    const css = (from, to) => gate('floors.mjs', args(mutated(good, [[C, from, to]])));
    const bad = {
      'a variable holding the literal': ["const b = 'smooth'; el.scrollTo({ behavior: b });", /FAIL js-smooth-literal/],
      'a quoted key': ["el.scrollTo({ 'behavior': 'smooth' });", /FAIL js-smooth-literal/],
      'a helper that returns it with no media check': ["export const sb = () => 'smooth';", /FAIL js-smooth-literal/],
      'a ternary on an unrelated condition': ["const b = fast ? 'auto' : 'smooth';", /FAIL js-smooth-literal/],
      'style.setProperty with smooth': ["el.style.setProperty('scroll-behavior', 'smooth');", /FAIL js-smooth-literal/],
      'style.setProperty with a variable': ["el.style.setProperty('scroll-behavior', v);", /FAIL js-scroll-behavior-set/],
      'style.scrollBehavior assigned a variable': ['el.style.scrollBehavior = v;', /FAIL js-scroll-behavior-set/],
      'a cssText string': ["el.style.cssText = 'scroll-behavior: ' + v;", /FAIL js-scroll-behavior-set/],
    };
    for (const [name, [js, want]] of Object.entries(bad)) {
      it(`js fails: ${name}`, () => {
        const r = withJs('x.ts', js);
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, want);
      });
    }
    const ok = {
      'the matchMedia ternary': "const b = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';",
      'smooth in a comment': "// behavior: 'smooth' is forbidden here\n/* 'smooth' */ export const a = 1;",
      'clearing or resetting scroll-behavior': "el.style.scrollBehavior = ''; el.style.setProperty('scroll-behavior', 'auto');",
    };
    for (const [name, js] of Object.entries(ok)) it(`js accepts: ${name}`, () => assert.equal(withJs('x.ts', js).code, 0));
    it('an .astro file is read only in its frontmatter and <script> bodies, so prose cannot trip it', () => {
      assert.equal(withJs('prose.astro', "---\n---\n<p>Use 'smooth' scrolling wisely</p>").code, 0);
      assert.equal(withJs('script.astro', "<script>const b = 'smooth';</script>").code, 1);
    });
    it('css accepts a no-preference query joined with and, any case, minified', () => {
      assert.equal(css('@media (prefers-reduced-motion:no-preference)', '@MEDIA screen and (PREFERS-REDUCED-MOTION:no-preference) and (min-width:1px)').code, 0);
      assert.equal(css('@media (prefers-reduced-motion:no-preference)', '@media(prefers-reduced-motion:no-preference)').code, 0);
    });
    it('css accepts scroll-behavior: auto, inherit and initial outside a media query', () => {
      for (const v of ['auto', 'inherit', 'initial', 'unset']) assert.equal(css('.track{scroll-behavior:auto}', `.track{scroll-behavior:${v}}`).code, 0, v);
    });
  });
  it('a local()-only fallback face needs no font-display (nothing to fetch), a url() face still does', () => {
    assert.equal(gate('floors.mjs', args(good)).code, 0); // the good fixture carries a local()-only face without font-display
  });
  it('fails when the --sg57-void token cannot be read (a gate that checks nothing must not pass)', () => {
    const dir = mutated(good, []);
    rmSync(join(dir, 'src', 'styles', 'global.css'));
    const r = gate('floors.mjs', args(dir));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /FAIL theme-token /);
  });
  it('a redirect stub is only exempt from the meta tags, not from img rules', () => {
    const dir = mutated(good, [['out/old/index.html', '<title>Redirecting</title>', '<title>Redirecting</title><img src="/a.webp">']]);
    const r = gate('floors.mjs', args(dir));
    assert.equal(r.code, 1);
    assert.match(r.out, /FAIL img-alt/);
  });
  it('fails on empty dist', () => {
    const dir = mutated(good, []);
    rmSync(join(dir, 'out', 'index.html'));
    rmSync(join(dir, 'out', 'old', 'index.html'));
    assert.match(gate('floors.mjs', args(dir)).out, /no-input/);
  });
});

describe('gate:check ratchet', () => {
  const sample = (n) => [
    ...Array.from({ length: n }, (_, i) => `src/a.astro:${i + 1}:1 - error ts(2339): Property 'x' does not exist.`),
    `\nResult (5 files): \n- ${n} errors\n- 0 warnings\n- 0 hints`,
  ].join('\n');
  const base = { "src/a.astro | ts(2339) | Property 'x' does not exist.": 2 };
  it('parses ANSI + CRLF output and fingerprints without line numbers', () => {
    const raw = `\u001b[96msrc\\a.astro\u001b[0m:\u001b[93m4\u001b[0m:\u001b[93m1\u001b[0m - \u001b[91merror\u001b[0m\u001b[90m ts(2339): \u001b[0mProperty 'x' does not exist.\r\n\nResult (1 files):\r\n- 1 errors\r\n`;
    const p = parseCheckOutput(raw);
    assert.equal(p.errors, 1);
    assert.equal(p.reported, 1);
    assert.equal(compare(p.counts, { "src/a.astro | ts(2339) | Property 'x' does not exist.": 1 }).added.length, 0);
  });
  it('fingerprints the same file for Windows and POSIX separators, on whichever OS runs the test', () => {
    const bs = String.fromCharCode(92);
    const line = (file) => `${file}:4:1 - error ts(2339): Property 'x' does not exist.\n\nResult (1 files):\n- 1 errors\n`;
    const want = "src/a.astro | ts(2339) | Property 'x' does not exist.";
    for (const file of [
      `src${bs}a.astro`,
      'src/a.astro',
      `C:${bs}repo${bs}site${bs}src${bs}a.astro`,
      '/home/runner/work/site/site/src/a.astro',
    ]) {
      assert.deepEqual([...parseCheckOutput(line(file)).counts.keys()], [want], `separator style: ${file}`);
    }
    assert.deepEqual([...parseCheckOutput(line(`D:${bs}x${bs}src/pages${bs}b.astro`)).counts.keys()], ["src/pages/b.astro | ts(2339) | Property 'x' does not exist."]);
  });
  it('passes at baseline and when errors shrink', () => {
    assert.equal(runCheckGate({ rawOutput: sample(2), baselineOverride: base }).failed, false);
    assert.equal(runCheckGate({ rawOutput: sample(1), baselineOverride: base }).failed, false);
  });
  it('fails when an error count grows past the baseline', () => {
    const r = runCheckGate({ rawOutput: sample(3), baselineOverride: base });
    assert.equal(r.failed, true);
    assert.equal(r.hard[0].rule, 'new-type-error');
  });
  it('fails on a brand-new fingerprint', () => {
    const raw = sample(2).replace("Property 'x'", "Property 'y'");
    assert.equal(runCheckGate({ rawOutput: raw, baselineOverride: base }).failed, true);
  });
  it('fails (never passes silently) when astro check crashed or printed no summary', () => {
    const r = runCheckGate({ rawOutput: 'Error: spawn failed', baselineOverride: base });
    assert.equal(r.failed, true);
    assert.equal(r.hard[0].rule, 'check-crashed');
  });
  it('fails when parsed count disagrees with the reported summary (format drift)', () => {
    const raw = sample(2).replace('- 2 errors', '- 5 errors');
    assert.equal(runCheckGate({ rawOutput: raw, baselineOverride: base }).hard[0].rule, 'check-parse-mismatch');
  });
});

describe('scanner units', () => {
  it('scans minified, nested, string and url() content', () => {
    const css = '/* c */a{b:url(data:image/png;base64,AA==)}@media(prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}.q{content:"};{"}p{x:y';
    const d = [...scanDeclarations(css)];
    const smooth = d.find((x) => x.prop === 'scroll-behavior');
    assert.equal(inNoPreference(smooth.stack), true);
    assert.equal(d.find((x) => x.prop === 'content').value, '"};{"');
    assert.equal(d.at(-1).prop, 'x');
  });
  it('reduce helper detection is block scoped, not file scoped', () => {
    const ok = "function f(){ if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; el.scrollTo({behavior:'smooth'}); }";
    const bad = "const r = matchMedia('(prefers-reduced-motion: reduce)'); function g(){ el.scrollTo({behavior:'smooth'}); }";
    assert.equal(insideReduceHelper(ok, ok.indexOf('behavior')), true);
    assert.equal(insideReduceHelper(bad, bad.indexOf('behavior')), false);
  });
});

// Platform-currency pointers. A gate message may point at a guide of the platform-currency pack, never replace the
// repo's own rule: every case below still names the rule id, and the pointer is asserted verbatim so a message edit
// cannot drop it unnoticed. PACK_GUIDE_IDS was read from gen/guides.json of the pack at version 1.0.1 (2026-11-21);
// the list catches a typo or an invented id in a message, it does not prove the pack still carries the guide.
const PACK_GUIDE_IDS = new Set(['accessibility', 'optimize-image-priority']);
const pointer = (id) => `platform-currency guide: ${id} (repo rules still win)`;

describe('platform-currency pointers', () => {
  it('every guide id cited by a gate is a verified pack id', () => {
    const cited = [];
    for (const f of readdirSync(here).filter((n) => /\.mjs$/.test(n) && !/selftest|\.test\./.test(n))) {
      const text = readFileSync(join(here, f), 'utf8');
      for (const m of text.matchAll(/platformGuide\(\s*'([^']+)'/g)) cited.push([f, m[1]]);
      for (const m of text.matchAll(/\bguide:\s*'([^']+)'/g)) cited.push([f, m[1]]);
    }
    assert.ok(cited.length >= 8, `expected the gates to cite guides, found ${cited.length}`);
    for (const [f, id] of cited) assert.ok(PACK_GUIDE_IDS.has(id), `${f} cites an unverified guide id: ${id}`);
  });

  const html = fx('html', 'good');
  const htmlCases = {
    'no-multiple-main': ['<h1>Heading</h1>', '<h1>Heading</h1><main>nested</main>'],
    'hidden-focusable': ['<span>decor</span>', '<a href="/q">focusable</a>'],
    'wcag/h30': ['<span class="sr-only">Read more</span>', ''],
    'wcag/h37': ['alt="" width', 'width'],
    'wcag/h63': ['<p>Text</p>', '<table><thead><tr><th>A</th><td>B</td></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>'],
    'wcag/h71': ['<p>Text</p>', '<fieldset><input type="checkbox" aria-label="x"></fieldset>'],
  };
  for (const [rule, [from, to]] of Object.entries(htmlCases)) {
    it(`gate:html ${rule} points at the accessibility guide`, () => {
      const r = gate('html.mjs', ['--dist', mutated(html, [['index.html', from, to]])]);
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, new RegExp(`FAIL ${rule.replace('/', '\/')}`));
      assert.ok(r.out.includes(pointer('accessibility')), r.out);
    });
  }
  it('gate:html leaves a rule with no matching guide without a pointer (valid-id)', () => {
    const r = gate('html.mjs', ['--dist', mutated(html, [['index.html', 'id="intro"', 'id="1-intro"']])]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /FAIL valid-id/);
    assert.ok(!r.out.includes('platform-currency guide'), r.out);
  });

  it('gate:css focus-visible-outline points at the accessibility guide', () => {
    const r = gate('css.mjs', ['--src', fx('css', 'bad', 'src')]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /FAIL focus-visible-outline/);
    assert.ok(r.out.includes(pointer('accessibility')), r.out);
  });

  const floors = fx('floors', 'good');
  const fargs = (dir) => ['--dist', join(dir, 'out'), '--src', join(dir, 'src')];
  it('gate:floors img-alt points at the accessibility guide', () => {
    const r = gate('floors.mjs', fargs(mutated(floors, [['out/index.html', 'alt="A thing > another" ', '']])));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /FAIL img-alt /);
    assert.ok(r.out.includes(pointer('accessibility')), r.out);
  });
  it('gate:floors img-lazy (a warning) points at the image priority guide and does not fail the gate', () => {
    const r = gate('floors.mjs', fargs(mutated(floors, [['out/index.html', ' loading="lazy"', '']])));
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /warn img-lazy/);
    assert.ok(r.out.includes(pointer('optimize-image-priority')), r.out);
  });
  it('gate:scripts keeps the DOMContentLoaded rule and says pack guides do not override it', () => {
    const r = gate('page-load.mjs', ['--src', fx('scripts', 'bad', 'src')]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /FAIL bundled-script-without-page-load x2/);
    assert.match(r.out, /pack guides that show DOMContentLoaded do not apply here: the repo rule wins/);
  });
});
