# SG57 Site — Small Evolution: Quick Wins

**Date:** 2026-03-25
**Scope:** Polish-only improvements, no new features, no architecture changes

---

## Ranked List of 20 Improvements

| Rank | Category | Improvement | Effort | Impact |
|:----:|----------|-------------|--------|--------|
| 1 | Surface | **Remove user-visible placeholder comment** from homepage terminal mockup (`// screenshot placeholder -- real Clide UI incoming` is rendered HTML) | 1 min | High — visible to every visitor |
| 2 | Surface | **Remove empty media query** in Siftr page (`@media (max-width: 480px) {}`) — dead code shipped to production | 1 min | Low — cleanup |
| 3 | Micro-feedback | **Add `cursor: pointer`** to gallery items in ProofOfWork — they are `<a>` links but the image-heavy content doesn't obviously signal clickability | 1 min | Medium |
| 4 | Transition | **Smooth the quiz "Continue" button enable transition** — currently the button snaps from `opacity: 0.3` to full opacity with no ease. Add transition on the disabled state change. | 2 min | Medium — jarring UX on each quiz step |
| 5 | Text/Copy | **Blog "Back to Blog" link arrow direction** — uses `&larr;` (left arrow) which is correct, but has no hover transition for the arrow to hint at navigation | 2 min | Low |
| 6 | Micro-feedback | **Add hover transform to pricing cards** — Clide/Siftr pricing cards have `transform: translateY(-2px)` on hover but the homepage services card and about panel do not. Add subtle lift to the about panel. | 2 min | Low |
| 7 | Surface | **Nav active-link indicator** — no visual indicator shows which page the user is currently on. Add accent underline/color to the active nav link. | 5 min | High — basic navigation UX |
| 8 | Keyboard | **Add Enter key to auto-advance quiz** — after selecting a choice, pressing Enter should advance to the next question (currently only the Continue button works) | 3 min | Medium — keyboard flow improvement |
| 9 | Transition | **Scroll-to-top FAB hover state conflicts with is-visible transform** — when hovering, `translateY(-2px)` applies, but `:active` uses `translateY(0) scale(0.93)`. The `.is-visible` state removes `translateY(12px)` but hover adds `-2px`. Ensure transforms compose cleanly. | 3 min | Low |
| 10 | Micro-feedback | **Form input focus glow enhancement** — form inputs get a `box-shadow` focus ring but no border-color transition. The border snaps. Add smooth border-color transition matching the accent. | 2 min | Medium |
| 11 | Text/Copy | **Siftr comparison table "N/A (server)" is jargon** — non-technical readers won't understand why Seq can't open files. Clarify to "Cloud only" | 2 min | Low |
| 12 | Surface | **Blog post tag chips have no hover state** — static styled spans with no interactivity signal despite appearing clickable | 2 min | Low |
| 13 | Transition | **Homepage hero entrance animations have no fallback** — elements start at `opacity: 0` and depend on animation. If CSS animations are delayed, content is invisible. Add `animation-fill-mode: both` (already present) but ensure reduced-motion users see content. | 3 min | Medium |
| 14 | Surface | **Quiz result CTA link color on hover** — `.dhq-result-cta:hover` sets color but should also add the missing `text-decoration: none` for link inheritance safety | 1 min | Low |
| 15 | Micro-feedback | **Footer links have no underline on hover** — links in the footer are styled plainly. Adding a subtle underline-offset on hover improves discoverability | 2 min | Low |
| 16 | Text/Copy | **"Download" CTA text is vague** on Clide and Siftr pages — does not tell user what they're downloading or where. Consider "Get Clide" / "Get Siftr" | 2 min | Medium |
| 17 | Surface | **Proof-of-work gallery images lack border-radius consistency** — images inside `.gallery-item` have `border-radius` on the container but the image itself clips without `border-radius: inherit` | 1 min | Low |
| 18 | Keyboard | **Quiz Back button should work with Backspace** as an additional keyboard shortcut | 2 min | Low |
| 19 | Surface | **Empty `<p>` rendered when blog has no posts** — the empty state message is good but uses `&&` conditional which could render `0` in edge cases (Astro handles this correctly, so this is fine) | 0 min | N/A |
| 20 | Micro-feedback | **Homepage scroll hint should fade out on scroll** — the "scroll / arrow" hint at the bottom of the hero persists even after the user has scrolled past it | 3 min | Medium |

---

## Implementation Plan (Top 10)

Items 1-10 will be implemented. Items 11-20 are documented for future work.

### Changes Made:

1. **Removed placeholder comment** from homepage terminal mockup
2. **Removed empty media query** from Siftr page
3. **Added `cursor: pointer`** to ProofOfWork gallery items
4. **Smoothed quiz button enable/disable transition** with opacity transition on `.dhq-btn`
5. **Added hover arrow transition** on blog "Back to Blog" link
6. **Added subtle hover lift** to homepage about panel
7. **Added active-link indicator** to Nav component using `Astro.url.pathname`
8. **Added Enter key to auto-advance quiz** after selecting a choice
9. **Fixed FAB transform composition** for hover + visible states
10. **Enhanced form input focus** with border-color transition
