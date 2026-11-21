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
- Respect `prefers-reduced-motion`: smooth scroll and animation only inside `no-preference`; JS scroll behaviour comes from
  `src/lib/scroll.ts`. Enforced: `gate:floors` (`scroll-behavior-smooth`, `js-smooth-literal`) and `qa:spine`.
- Respect `color-scheme`: the site is dark only (`:root { color-scheme: dark }`, canvas painted with the void token).
  Enforced: `gate:floors` (`theme-color`, `manifest-color`, `theme-token`) and `qa:spine`.
- One `<main id="main-content">`, owned by `src/layouts/Base.astro`. Enforced: `gate:html` and `qa:spine`.
- Touch targets are 44x44 CSS px; only inline links inside a sentence are exempt. Enforced: `qa:spine` (`target-size`).
- Scripts rebind on `astro:page-load` and remove window/document listeners they add. Enforced: `gate:scripts`
  (binding only; listener cleanup is review).
- Baseline "widely available" CSS/JS by default; wrap anything newer in `@supports` or feature detection and keep a working
  fallback. Support status is looked up, never recalled: `https://api.webstatus.dev/v1/features/<feature-id>`
  (Baseline status and per-browser versions) and the MDN page for the feature under `https://developer.mozilla.org/`
  (Browser compatibility table). Not enforced; review.
- No unpinned CDN imports or remote scripts: self-host or exact-pin with integrity. Not enforced; review.
- Components in variable-width containers use `@container`, not viewport media queries (SL-9). Review.

## Platform guidance

Before writing or changing browser HTML, CSS or client JS, invoke `/platform-currency` (if it is not installed, say so in
the hand-off) and end the verification statement with its `Platform guides:` line. It supplies patterns; this repo's
constitution, laws and gates always win ("Repo rule X overrides guide Y"). Overrides for this site: dark only, so
`color-scheme: dark` per SL-11, never the guides' `light dark` (the skill's own text says `only dark`; SL-11 is the law and
changing it is an amendment); `ClientRouter` keeps one document, so bind on `astro:page-load`, never `DOMContentLoaded`;
no cross-document view transitions (the router and `view-transition-name` do the work; no `@view-transition` rule exists);
full-height sections are `min-height: 100vh` then `100svh` (SL-3). SL-8 mandates lazy images and writes no LCP
exception, while the pack guide `optimize-image-priority` says never to lazy-load the LCP image and the `img-lazy` warning
tolerates `fetchpriority="high"`: do not settle that yourself, ask the owner (an amendment).

## Rules of the repo

- Surgical changes: touch what the task needs. No drive-by renames, reformatting or tidying.
- No new magic values: colours, sizes, timings come from the tokens in `src/styles/global.css` (Federal Law 3).
- Add a dependency only when the task names it: exact pin, `npm ci --ignore-scripts`, report install scripts and licence.
- Images: `astro:assets` (`Image`/`Picture`) with explicit width and height; WebP/AVIF; lazy below the fold.
- No emojis in code, comments or docs. No AI trailers in commits.
- Commits: `[<initials>] <type>(<scope>): <description>`, at most 50 characters, lowercase, imperative, no full stop.
  Branch per unit of work; never push to or merge into `main` without being asked.

## Where the enforcers live

`scripts/gates/` (css, scripts, html, floors, check; `selftest.mjs` and `focus-outline.test.mjs` prove them) and
`scripts/qa/spine.mjs` (rendered; `spine.test.mjs`). CI: `.github/workflows/deploy.yml`, job `quality`.
