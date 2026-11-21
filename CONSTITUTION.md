# sg57.dev — State Constitution

> This is a STATE constitution for sg57.dev. It operates under the FEDERAL constitution at `../sg57-electron-app-dna/CONSTITUTION.md`. Federal laws take precedence.

## Identity

**sg57.dev** is the public marketing website for SG57 Labs. Built with Astro (static site), deployed to GitHub Pages. It showcases SG57 products (Clide, Siftr), services (consulting), and brand identity.

**Framework:** Astro 6+ with ViewTransitions (ClientRouter)
**Deployment:** GitHub Pages via GitHub Actions
**Design System:** SG57 App DNA design tokens (CSS variables, no Tailwind in this site)

## Federal Reference

All design tokens, colors, typography, spacing, and animation values are inherited from the SG57 App DNA federal constitution. This site does NOT define its own token values — it imports them from `src/styles/global.css` which mirrors `sg57-electron-app-dna/src/renderer/src/styles/design-tokens.css`.

## State Laws

### SL-1: Astro ViewTransitions

- Use Astro's `ClientRouter` for SPA-like page transitions
- Persistent chrome elements (edge sliver, wallpaper, ambient, particles) use `view-transition-name` to persist across navigations with `animation: none`
- Page content uses `page-main` view transition name with fade-out (160ms) + slide-up-in (360ms)
- Scripts that depend on DOM must listen to `astro:page-load` event, NOT `DOMContentLoaded`

### SL-2: Background Layer System

The site uses a fixed 4-layer background stack (all `position: fixed`, negative z-index):
1. **z:-3 — Wallpaper:** Full-viewport hero image (`hero-bg-2x.webp`)
2. **z:-2 — Ambient drift:** Transparent violet radial gradient, 90s animation cycle
3. **z:-1 — Particles:** SVG-based 3-depth-layer particle system (foreground 8-12s, midground 14-18s, background 20-28s)
4. **z:1000 — Edge sliver:** 2px accent gradient bar, 8s breathing animation

These layers NEVER scroll with content. Content in normal flow paints above them.

### SL-3: Hero Section Patterns

- Product pages: Full viewport height (`min-height: 100vh; min-height: 100svh`)
- Hero uses background image with dark gradient scrim for text contrast
- Content aligned to bottom (flex `align-items: flex-end`)
- Homepage hero: Two-column layout (text left, terminal mockup right), centered vertically

### SL-4: Product Page Structure

Every product page follows: Hero → Problem Statement → Features Grid → Store Preview → Pricing → Download CTA
- Product-specific accent colors override `--sg57-accent` at both `<html>` level (via Base.astro props) and in scoped CSS
- Clide: Signal Cyan `#5BC0BE`
- Siftr: Diagnostic Amber `#D4A15A`
- Services: Terracotta `#C4896A`

### SL-5: Glass System (Web Context)

Glass surfaces on this site use the DNA `--sg57-glass-*` tokens:
- Background: `var(--sg57-glass-bg)` (rgba 0.75 opacity)
- Blur: `var(--sg57-glass-blur)` (12px)
- Border: `1px solid var(--sg57-glass-border)`
- Shadow: `var(--sg57-glass-shadow)`
- Radius: `var(--sg57-radius-md)` (8px) or `var(--sg57-radius-lg)` (12px) for larger panels

### SL-6: Navigation

- Sticky top navigation (`position: sticky; top: 0; z-index: 100`)
- Glass background with blur
- Logo: `SG57 LABS` with glyph icon (32px) and subtitle
- Links: Clide, Siftr, Services
- Mobile: Reduce font sizes and hide "LABS" subtitle below 640px

### SL-7: SEO Requirements

- Every page must have: `<title>`, `<meta description>`, `<link rel="canonical">`
- Open Graph and Twitter Card meta tags on every page
- JSON-LD structured data (when applicable)
- Sitemap generation enabled
- All images must have `alt` attributes (empty string `alt=""` for decorative)

### SL-8: Performance Budgets

- Target: sub-1s FCP (First Contentful Paint) for static pages
- All images: WebP/AVIF format, lazy loading (`loading="lazy"`), explicit `width`/`height` or `aspect-ratio`
- Font loading: `font-display: swap`; preload exactly 400, 600 and 700 (nothing else: every extra preload delays first paint on slow links); weights 500 and 300 load on demand. The self-hosted Rajdhani has a metric-matched `Rajdhani Fallback` face in `global.css` so the swap does not shift layout. Amended 2026-11-20, see Amendments
- No JavaScript frameworks in production bundle (Astro islands only where needed)

### SL-9: Mobile-First Breakpoints

- `640px`: Stack product grids, hide nav subtitle, reduce gaps
- `720px`: Stack feature grids, product page responsive adjustments
- `900px`: Stack service cards, pricing grids
- Touch targets: 44px minimum on all interactive elements
- New components that live in variable-width containers (cards, panels, grids that reflow with their parent) respond to their container with `@container` queries (`container-type: inline-size`), not to the viewport. Container queries are Baseline widely available (2025-08-14). The existing viewport breakpoints above stay as they are and are not rewritten.

### SL-10: Animation Constraints

- All animations must respect `prefers-reduced-motion: reduce`
- Particle system: transform-only animations (no layout properties)
- Ambient drift: 90s cycle, ease-in-out
- Edge sliver breathing: 8s cycle, ease-in-out
- Entry animations: Use DNA `slide-up` (0.8-1s) with staggered delays
- Easing: `var(--sg57-ease-snap)` for entries, `var(--sg57-ease-out)` for interactions
- **Programmatic scrolling is smooth when motion is allowed** — `scroll-behavior: smooth` on `html` and on scroll containers applies only inside `@media (prefers-reduced-motion: no-preference)`. Every JS `scrollTo`/`scrollIntoView` takes its `behavior` from `src/lib/scroll.ts` (`scrollBehavior()`), which returns `'auto'` under `prefers-reduced-motion: reduce`. A literal `behavior: 'smooth'` is a defect. Enforced by `npm run gates` (gate:floors). Amended 2026-11-20, see Amendments.

### SL-11: Dark Theme Only

- The site uses dark theme exclusively — no light mode, no theme toggle
- All design tokens in `:root` target dark backgrounds
- No `[data-theme]` switching mechanism exists
- `:root { color-scheme: dark }` and `<meta name="color-scheme" content="dark">` are set; `html` paints `var(--sg57-void)` so the canvas is never white
- `<meta name="theme-color">` and the manifest `theme_color`/`background_color` equal `--sg57-void` (enforced by gate:floors)

### SL-12: Form Handling

- Forms submit via AJAX (fetch) to Formspree — no page redirects
- Success/error states shown inline with animations
- Form inputs: 40px min height, 8px radius, surface background, focus ring

## Amendments

### 2026-11-20 — SL-10: smooth scrolling is conditional on the motion preference

- **Was:** "All programmatic scrolling MUST be smooth ... No instant jumps." (unconditional)
- **Now:** smooth only when `prefers-reduced-motion: no-preference`; instant under `reduce`.
- **Why:** Federal Law 9 ("`prefers-reduced-motion: reduce` disables all animation") and the first bullet of SL-10 already required reduced motion to be honoured, and smooth scrolling is animation. An unconditional mandate relaxed a Federal law, which State law may not do (Federal Supremacy, Additivity Only). This amendment restores conformance; it is not a divergence.
- **Approved by:** Cord Rehn (product owner), 2026-11-20.
- **Enforced by:** `scripts/gates/floors.mjs` (rules `scroll-behavior-smooth`, `js-smooth-literal`).

### 2026-11-20 — SL-8: preloaded font weights match the code, and a metric fallback face is required

- **Was:** "preload critical weights (300, 400, 700)". The code had always preloaded 400, 600 and 700; 300 is used only by the desktop nav subtitle (4 characters), so the text was wrong.
- **Now:** preload exactly 400, 600 and 700, and ship a metric-matched `Rajdhani Fallback` face so late-loading weights (500, 300) barely move the layout. Measured in Chrome over all 37 pages at 375px and 1440px: 400, 500 and 700 are painted above the fold on every page, 600 on 66 of 74 page views.
- **Why not preload 500 too:** tried and rejected. On a throttled 1.6 Mbps link each extra preloaded file (the 500 weight, the wallpaper) added 150 to 300ms to first paint (7 runs, clide desktop and home phone); without both, first paint matched main. With the fallback face the font swap shift fell from a mean 212px to 21px of document height, which is why the 500 swap is cheap. `SL8_PRELOAD_WEIGHTS` in `scripts/gates/floors.mjs` is the single constant that enforces this.
- **Approved by:** Cord Rehn (product owner), 2026-11-20.
