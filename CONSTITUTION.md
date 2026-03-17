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
- Logo: `[SG57] LABS` with bracket styling
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
- Font loading: `font-display: swap`, preload critical weights (300, 400, 700)
- No JavaScript frameworks in production bundle (Astro islands only where needed)

### SL-9: Mobile-First Breakpoints

- `640px`: Stack product grids, hide nav subtitle, reduce gaps
- `720px`: Stack feature grids, product page responsive adjustments
- `900px`: Stack service cards, pricing grids
- Touch targets: 44px minimum on all interactive elements

### SL-10: Animation Constraints

- All animations must respect `prefers-reduced-motion: reduce`
- Particle system: transform-only animations (no layout properties)
- Ambient drift: 90s cycle, ease-in-out
- Edge sliver breathing: 8s cycle, ease-in-out
- Entry animations: Use DNA `slide-up` (0.8-1s) with staggered delays
- Easing: `var(--sg57-ease-snap)` for entries, `var(--sg57-ease-out)` for interactions

### SL-11: Light Theme Support

- Theme toggle persists choice in `localStorage` key `sg57-theme`
- Default: dark (follows DNA default)
- `[data-theme='light']` overrides all token values
- Hero sections with background images maintain dark scrims in both themes for text contrast
- Glass surfaces automatically adapt via token overrides

### SL-12: Form Handling

- Forms submit via AJAX (fetch) to Formspree — no page redirects
- Success/error states shown inline with animations
- Form inputs: 40px min height, 8px radius, surface background, focus ring
