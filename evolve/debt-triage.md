# SG57 Site — Technical Debt Triage

**Audit Date:** 2026-03-25
**Auditor:** Claude Opus 4.6 (automated)
**Scope:** All 16 source files in `src/`

---

## Debt Inventory

| # | Category | Item | Severity | Likelihood | Blast Radius | Fix Effort | Priority Score |
|---|----------|------|:--------:|:----------:|:------------:|:----------:|:--------------:|
| 1 | Test | **Zero test coverage** — no unit, integration, or e2e tests exist anywhere in the project. No test runner configured. | 4 | 5 | 5 | 4 | **25.0** |
| 2 | Implementation | **Light theme not implemented** — theme toggle button exists in Nav + mobile menu, localStorage key is stored, but there is no `[data-theme="light"]` CSS ruleset defining light-mode tokens. Toggling to "light" produces broken/invisible text on a transparent background. | 5 | 4 | 5 | 3 | **33.3** |
| 3 | Architecture | **Services page is 1,383 lines** — a god file combining 6 section HTML blocks, 140+ lines of form submission JS, and 900+ lines of scoped CSS. The largest file in the project by 3x. | 3 | 3 | 3 | 3 | **9.0** |
| 4 | Implementation | **Duplicated CTA button styles** — `.cta-button` is independently defined with near-identical CSS in both `clide/index.astro` and `siftr/index.astro` (30+ lines each). Neither page uses a shared class or component. | 2 | 3 | 2 | 1 | **12.0** |
| 5 | Implementation | **Duplicated `.section-heading` styles** — identical heading styles are independently defined in `clide/index.astro`, `siftr/index.astro`, and partially in `services/index.astro`. | 2 | 3 | 2 | 1 | **12.0** |
| 6 | Implementation | **Duplicated `.store-placeholder` / `.placeholder-glyph` / `.placeholder-label`** — identical placeholder card styles repeated in both `clide/` and `siftr/`. | 2 | 2 | 2 | 1 | **8.0** |
| 7 | Implementation | **Duplicated `.problem` / `.problem-text` styles** — identical problem statement section styling in both product pages. | 2 | 2 | 2 | 1 | **8.0** |
| 8 | Implementation | **Duplicated accent override pattern** — both Clide and Siftr pages have a block of section selectors overriding `--sg57-accent` vars locally, while also passing the same values through `Base.astro` props. The `accentColor` prop on Base.astro sets the vars on `<html>`, making the per-section overrides redundant. | 2 | 3 | 2 | 2 | **6.0** |
| 9 | Implementation | **Store preview placeholder on both product pages** — "Store screenshots coming soon" is a permanent placeholder. Both Clide and Siftr ship with dashed-border empty boxes to production. | 3 | 2 | 2 | 2 | **6.0** |
| 10 | Implementation | **Homepage terminal mockup placeholder** — `// screenshot placeholder -- real Clide UI incoming` comment visible to users inside the terminal mock on the homepage hero. This is rendered HTML, not a code comment. | 3 | 3 | 2 | 1 | **18.0** |
| 11 | Documentation | **No light theme documentation** — the theme toggle feature is present but undocumented. No README or code comment explains that light mode is non-functional. | 2 | 2 | 2 | 1 | **8.0** |
| 12 | Dependency | **No lockfile verification or dependency audit** — package.json uses caret ranges (`^`). No `npm audit` script or CI check. Three dependencies only. Low risk but no safety net. | 2 | 2 | 3 | 1 | **12.0** |
| 13 | Type | **Silent error swallowing** — every `<script>` block wraps its entire body in `try { ... } catch (_) {}`. While intentional for resilience, the swallowed errors make debugging nearly impossible. No logging, no dev-mode-only reporting. | 3 | 3 | 4 | 2 | **18.0** |
| 14 | Implementation | **Magic numbers throughout** — values like `ANGLE=5`, `START=50`, `3`/`97` clamp bounds in BeforeAfterSlider; `280`/`320` ms animation waits in quiz; `1900`ms minimum send time in form — all undocumented inline constants. | 2 | 2 | 2 | 2 | **4.0** |
| 15 | Architecture | **Blog post duplicate filtering** — both `blog/index.astro` and `rss.xml.ts` independently filter out draft posts and sort by date. If the filtering logic changes, both must be updated. | 2 | 3 | 2 | 1 | **12.0** |
| 16 | Implementation | **Hardcoded Formspree endpoint** — the form action URL `https://formspree.io/f/mojkpkyj` appears in both the HTML `action` attribute and the JS `fetch()` call in services page. | 2 | 2 | 2 | 1 | **8.0** |
| 17 | Documentation | **Stale README** — README.md exists but its accuracy is unverified. No architecture overview, no development setup instructions confirmed current. | 2 | 2 | 2 | 1 | **8.0** |
| 18 | Implementation | **Non-null assertion in rss.xml.ts** — `context.site!.toString()` uses TypeScript non-null assertion. If `site` is not configured in `astro.config.mjs`, this would throw at build time. (It is configured, so risk is low.) | 1 | 1 | 1 | 1 | **1.0** |
| 19 | Architecture | **No shared button/CTA component** — buttons are styled independently in every page with similar but subtly different CSS. At least 4 independent `.cta-button` / `.btn` / `.form-submit` / `.bigfish-cta` style blocks exist. | 2 | 2 | 3 | 3 | **4.0** |
| 20 | Implementation | **Homepage hero hidden on mobile** — `.hero-visual { display: none; }` at `<=900px`. The terminal mockup disappears entirely. No alternative content fills the gap. | 2 | 1 | 1 | 2 | **1.0** |
| 21 | Implementation | **Empty media query** — `siftr/index.astro` line 685-686: `@media (max-width: 480px) {}` — empty ruleset shipped to production. | 1 | 1 | 1 | 1 | **1.0** |

---

## Priority Ranking (Top 10)

| Rank | # | Priority Score | Summary |
|:----:|:-:|:--------------:|---------|
| 1 | 2 | **33.3** | Light theme not implemented (toggle exists, no CSS) |
| 2 | 1 | **25.0** | Zero test coverage |
| 3 | 10 | **18.0** | Homepage terminal placeholder text visible to users |
| 4 | 13 | **18.0** | Silent error swallowing in all JS blocks |
| 5 | 4 | **12.0** | Duplicated CTA button styles (Clide/Siftr) |
| 6 | 5 | **12.0** | Duplicated section-heading styles |
| 7 | 12 | **12.0** | No dependency audit safety net |
| 8 | 15 | **12.0** | Blog post filtering duplicated (index + RSS) |
| 9 | 3 | **9.0** | Services page god file (1,383 lines) |
| 10 | 6 | **8.0** | Duplicated placeholder styles |

---

## Top 3 Root Causes

### 1. No shared component library for common patterns
CTA buttons, section headings, placeholder cards, and problem statements are independently styled in each page. This is the root cause of items #4, #5, #6, #7, #8, and #19. As pages were added, styles were copied rather than extracted.

### 2. Feature shipped incomplete (light theme)
The theme toggle UI was built, localStorage persistence was wired up, but the actual light-mode CSS token overrides were never created. This is the single highest-priority debt item because it's a user-facing broken feature.

### 3. No testing infrastructure
The project has zero tests, no test runner, no CI pipeline. This is the root cause of any regression confidence gap. For a marketing site with limited interactivity, the blast radius is mitigated -- but the quiz, form submission, and slider all have complex JS state machines that could break silently.

---

## Top 5 Recommended Actions

1. **Implement light theme tokens** — Create a `[data-theme="light"]` block in `global.css` overriding all `--sg57-*` color tokens. Until this is done, the theme toggle button is a broken feature. *Effort: 2-3 hours.*

2. **Extract shared product page styles** — Create a `src/styles/product-shared.css` (or a `ProductPage.astro` layout) that contains `.cta-button`, `.section-heading`, `.store-placeholder`, `.problem-text`, and accent override patterns. Import from both Clide and Siftr pages. *Effort: 1-2 hours.*

3. **Add minimal E2E smoke tests** — Install Playwright, write 5-10 tests covering: all pages load, nav works, quiz completes, form validation fires, slider drags. Run in CI. *Effort: 4-6 hours.*

4. **Add structured error logging in dev mode** — Replace `catch (_) {}` blocks with `catch (err) { if (import.meta.env.DEV) console.error('Component init:', err); }` so errors surface during development while remaining silent in production. *Effort: 30 minutes.*

5. **Remove user-visible placeholder text** — The homepage terminal mock shows `// screenshot placeholder` to visitors. Either replace with real content or remove the line. The store preview sections on Clide/Siftr should either get real screenshots or be removed from production. *Effort: 15 minutes.*
