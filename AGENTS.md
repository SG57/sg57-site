# AGENTS.md - sg57-site

Instructions for any AI agent working on this repository. Read before the first non-trivial change.
`CLAUDE.md` is a pointer to this file; Codex, Cursor, Copilot, Amp, Windsurf and Factory read it natively.

## What this is

The public site for SG57 Labs (Astro 6, static, GitHub Pages). Its law is [CONSTITUTION.md](CONSTITUTION.md), which
operates under the federal constitution at `../sg57-electron-app-dna/CONSTITUTION.md` (federal laws win). Read the state
laws that touch your change. Changing a law is an amendment: add a dated entry under "Amendments" with Was, Now, Why,
Approved by and Enforced by, in the same change as the code. State law may add to federal law, never relax it.
Commands and layout: [README.md](README.md).

## Done means

- `npm run gates:all` exits 0 (static gates, then the rendered spine). Paste its output; do not summarise it.
- Any new gate or rule is shown failing (exit 1, right message) on a seeded bad input and passing on a good one.
- What you could not run (real Safari, Firefox, Android, Windows High Contrast, CI) is reported as UNVERIFIED.
- Never weaken a gate, edit a baseline upward, or skip a check to get green. `scripts/qa/baseline.json` and
  `scripts/gates/check-baseline.json` only shrink.

## Native first (UI rules, each a checkable bullet)

- Use native `<dialog>`, `popover`, `inert`, `<details>` and real `<button>`/`<a>` before custom JS. Enforced: warn-only
  `prefer-native-element` and the hard `hidden-focusable` rule in `gate:html`; otherwise review.
- Focus: style `:focus-visible`, never `outline: none`; keep `outline: 2px solid transparent` so the ring survives
  forced-colors. Enforced: `gate:css` (`focus-outline-plugin.mjs`) and the forced-colors emulation in `qa:spine`.
  The gate is narrower than "never remove an outline": it reads the final outline state of each rule in the stylesheet
  text and accepts a removal only as `:focus:not(:focus-visible)`, with a later ring or forced-colors outline for the same
  selector, or with a reviewed per-selector reason in `scripts/gates/focus-allow.json` (an entry that no longer matches
  fails). It does not see outlines set through resolved custom properties, JS or other files, and does not inspect rules
  whose only state is `:hover`/`:active`. The `qa:spine` forced-colors check (every one of the first 40 Tab stops must
  paint an outline) is the backstop.
- Respect `prefers-reduced-motion`: smooth scroll and animation only inside `no-preference`; JS scroll behaviour comes from
  `src/lib/scroll.ts`. Enforced: `gate:floors` (`scroll-behavior-smooth`, `js-smooth-literal`, `js-scroll-behavior-set`) and `qa:spine`.
- Respect `color-scheme`: the site is dark only (`:root { color-scheme: dark }`, canvas painted with the void token).
  Enforced: `gate:floors` (`theme-color`, `manifest-color`, `theme-token`) and `qa:spine`.
- One `<main id="main-content">`, owned by `src/layouts/Base.astro`. Enforced: `gate:html` and `qa:spine`.
- Touch targets are 44x44 CSS px (SL-9). `qa:spine` (`target-size`) measures every link, button, input, select, textarea,
  summary and tab stop at 375, 820 and 1440px. Exempt, and only these: the skip link; an inline text link inside running
  text (display:inline with words around it in its block; a link that is the whole paragraph, or a row or list of bare
  links, is not exempt); a control whose associated or wrapping label is at least 44x44; a visually hidden native input
  (clipped, opacity 0 or 1px). Hidden, `inert` and `aria-hidden` content is not measured.
- Scripts rebind on `astro:page-load` and remove window/document listeners they add. Enforced: `gate:scripts`
  (binding only; listener cleanup is review).
- Known limits of `gate:floors` and `gate:scripts`: they are lexical heuristics over text, not data-flow proofs.
  `is:inline` scripts are skipped by design (they cannot be bundled or import). An uncalled function that mentions
  `astro:page-load` still passes. The `'smooth'` search and the media-query parsing are fooled by concatenation or values
  built at run time. The rendered `qa:spine` run (computed styles under emulated reduced motion, forced colors and
  scheme) is the backstop for all three.
- Baseline "widely available" CSS/JS by default; wrap anything newer in `@supports` or feature detection and keep a working
  fallback. Support status is looked up, never recalled: `https://api.webstatus.dev/v1/features/<feature-id>`
  (Baseline status and per-browser versions) and the MDN page for the feature under `https://developer.mozilla.org/`
  (Browser compatibility table). Not enforced; review.
- No unpinned CDN imports or remote scripts: self-host or exact-pin with integrity. Not enforced; review.
- Components in variable-width containers use `@container`, not viewport media queries (SL-9). Review.

## Platform guidance

Before writing or changing browser HTML, CSS or client JS, invoke `/platform-currency` (if it is not installed, say so in
the hand-off) and end the verification statement with its `Platform guides:` line. It supplies patterns; this repo's
constitution, laws and gates always win ("Repo rule X overrides guide Y"). Overrides for this site: `color-scheme: dark`
(SL-11), never the guides' `light dark`; `ClientRouter` keeps one document, so bind on `astro:page-load`, never
`DOMContentLoaded`; no cross-document view transitions; full-height sections are `min-height: 100vh` then `100svh`
(SL-3). The guide ids cited in gate messages (`accessibility`, `optimize-image-priority`) were checked against the text of
platform-currency pack 1.0.1, not against an installed copy of the pack.

## Rules of the repo

- Surgical changes: touch what the task needs. No drive-by renames, reformatting or tidying.
- No new magic values: colours, sizes, timings come from the tokens in `src/styles/global.css` (Federal Law 3).
- Add a dependency only when the task names it: exact pin, `npm ci --ignore-scripts`, report install scripts and licence.
- Images: `astro:assets` (`Image`/`Picture`) with explicit width and height; WebP/AVIF; lazy below the fold, and the
  above-the-fold (LCP) image eager with `fetchpriority="high"` (SL-8, amended 2026-11-21).
- No emojis in code, comments or docs. No AI trailers in commits.
- Commits: `[<initials>] <type>(<scope>): <description>`, at most 50 characters, lowercase, imperative, no full stop.
  Branch per unit of work; never push to or merge into `main` without being asked.

## Where the enforcers live

`scripts/gates/` (css, scripts, html, floors, check; `selftest.mjs` and `focus-outline.test.mjs` prove them) and
`scripts/qa/spine.mjs` (rendered; `spine.test.mjs`). CI: `.github/workflows/deploy.yml`, job `quality`.
