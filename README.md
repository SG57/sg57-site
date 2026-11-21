# sg57.dev

The public site for SG57 Labs: Clide, Siftr, Text Easy, Life OS, services and the blog.
Astro 6, static output, no UI framework in the bundle, deployed to GitHub Pages at <https://sg57.dev>.

The law of this repo is [CONSTITUTION.md](CONSTITUTION.md). It operates under the federal constitution in
`../sg57-electron-app-dna/CONSTITUTION.md`; federal laws win. Read it before changing anything visible.

## Commands

Node `^22.22.2`, `^24.15.0` or `>=26` (the lint tooling needs it; `engines` in package.json is the same range).

| Command | What it does |
|---|---|
| `npm ci` | Install exactly what the lockfile says. |
| `npm run dev` | Dev server on `localhost:4321`. |
| `npm run build` | Build to `dist/`. |
| `npm run preview` | Serve `dist/` the way the QA spine does. |
| `npm run gates` | Build, then the static gates (below). |
| `npm run qa` | Build, then the rendered QA spine (below). |
| `npm run qa:run` | The spine without building. `-- --all` for every route, `-- --only clide/` for one. |
| `npm run gates:all` | `gates` then `qa:run`. This must pass before UI work is called done. |
| `npm run test:gates` | Unit tests for the gates and the spine. |

## Gates

`npm run gates` fails (exit 1) on a hard finding and prints what is wrong, the native fix, and the law.

| Gate | Enforces |
|---|---|
| `gate:css` | Stylelint: a `:focus-visible` rule may not remove the outline without a forced-colors-safe replacement. |
| `gate:scripts` | Every bundled `<script>` rebinds on `astro:page-load` (ClientRouter). |
| `gate:html` | html-validate: one `<main>`, valid ids, no empty headings, named links, image alt, table header scope, no focusable content under `aria-hidden`. |
| `gate:floors` | SL-7, SL-8, SL-10, SL-11 from the built site: SEO tags, image alt and size, font preloads, smooth scroll only when motion is allowed, `theme-color`. |
| `gate:check` | `astro check` as a ratchet against `scripts/gates/check-baseline.json`; it may only shrink. |

## QA spine

`scripts/qa/spine.mjs` serves `dist/` with `astro preview` and drives a real browser (Playwright) over every route at
375, 820 and 1440 px: no sideways overflow, no console errors, exactly one `<main>`, axe-core (WCAG 2.0/2.1/2.2 A and AA,
serious and critical fail), the skip link, and 44 px touch targets (SL-9). On six pages it also emulates
`forced-colors`, `prefers-reduced-motion: reduce` and both OS colour schemes. Screenshots go to `qa-out/` (gitignored).

axe automates only a minority of WCAG 2.2 AA. A green run is not a claim of 2.2 conformance.

Findings that existed before the spine are listed in `scripts/qa/baseline.json`. A new finding fails; a fixed one should be
removed with `node scripts/qa/spine.mjs --all --update-baseline`. The file only ever shrinks.
An axe finding is one node (`rule | route | selector`, Astro scoped-style hashes stripped), so which node axe lists first, or how many
it lists, cannot change the result: a run may report any subset of the baselined nodes, and a node that is not in the file fails.

Browser: locally the spine uses the bundled Chromium, then falls back to installed Chrome or Edge
(`QA_BROWSER_CHANNEL=chrome|msedge` forces one). CI installs it with `npx playwright install --with-deps chromium`.
On Windows Git Bash write `--only clide/`, not `--only /clide/` (the shell rewrites a leading slash).

## Deployment

`.github/workflows/deploy.yml`. A pull request runs the `quality` job (gate self-tests, gates, spine). A push to `main`
builds, runs `quality`, and deploys only when both pass. Dependabot (`.github/dependabot.yml`) proposes weekly,
grouped, cooldown-delayed updates, and each one goes through the same job.

## Layout

```text
src/pages        routes (one folder per product)
src/components   shared, life-os, services, text-easy
src/layouts      Base (shell, skip link, the one <main>), BlogPost
src/styles       global.css (tokens, focus, motion)
src/lib          scroll.ts, rehype plugins, life-os kit
src/content      blog posts (markdown)
scripts/gates    static gates      scripts/qa   rendered spine
```

AI agents: see [AGENTS.md](AGENTS.md).
