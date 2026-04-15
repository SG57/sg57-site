# Error Resilience Audit Report — sg57-site

**Date:** 2026-03-25
**Scope:** All client-side JavaScript, form handling, image loading, dynamic content

---

## 1. Form Error Handling

**Status: FIXED**

### Already present (good):
- Error message shown on submission failure (`#intake-error` with role="alert")
- User input preserved on error (form fields are re-enabled, not cleared)
- Network failure handled via `.catch(() => ({ ok: false }))` on fetch
- Success confirmation with personalized name and email display
- Formspree rate limiting: returns non-`ok` response, which triggers the error path

### Issues found and resolved:

**1a. Unguarded DOM references in form handler**
- `submitBtn`, `successEl`, `errorEl`, `progressEl`, `progressFill` were used without null
  checks. If any element was missing (e.g., DOM mutation by browser extension), the entire
  handler would throw and leave the form stuck in "sending" state.
- **Fix:** Added null guards (`if (submitBtn)`, `if (progressEl)`, etc.) before every
  DOM manipulation of non-critical refs.

**1b. No try/catch around async submission pipeline**
- After the fetch succeeded, the phases that manipulate DOM (collapse form, reveal success)
  had no error handling. A throw anywhere in phases 3-5 would leave the form invisible with
  no success or error message.
- **Fix:** Wrapped the entire submission pipeline (phases 1-5) in a try/catch that calls
  `resetToIdle()` and shows the error message on any unexpected exception.

**1c. No form action/method fallback**
- The `<form>` had `novalidate` but no `action` or `method` attributes. If JavaScript
  failed to load entirely, the form would do nothing on submit.
- **Fix:** Added `action="https://formspree.io/f/mojkpkyj"` and `method="POST"` to the
  form element. Native browser submission works as a last-resort fallback.

**1d. `setProgress` crashed on null `progressFill`**
- **Fix:** Added `if (!progressFill) return;` guard at the top of `setProgress()`.

## 2. Image Loading Failures

**Status: FIXED**

### Already present (good):
- All images have explicit `width` and `height` attributes, preventing layout shift (CLS).
- Images use `loading="lazy"` for below-fold content.

### Fix applied:
- Added CSS fallback in `global.css`: `img { min-height: 1px; background: var(--sg57-surface); }`
- Broken images now show a subtle surface-colored placeholder instead of the browser's
  default broken image icon, and maintain their aspect ratio via the width/height attributes.

## 3. JavaScript Error Handling

**Status: FIXED**

Every client-side script now has a try/catch wrapper around its initialization logic.
If any one feature fails, it does not cascade to other features.

### Components wrapped:

| Component | Script | Isolation |
|-----------|--------|-----------|
| `BeforeAfterSlider.astro` | Pointer/keyboard slider | try/catch around entire init |
| `DigitalHealthQuiz.astro` | Quiz state machine | try/catch + DOM ref null bail-out |
| `Nav.astro` | Hamburger menu + mobile theme toggle | try/catch around entire init |
| `Base.astro` (theme inline) | localStorage theme restore | try/catch for localStorage access |
| `Base.astro` (theme toggle) | Desktop theme toggle | try/catch + localStorage guard |
| `Base.astro` (scroll FAB) | Scroll-to-top button | try/catch around entire init |
| `services/index.astro` | Form submission handler | Outer try/catch + inner try/catch on submit |

### localStorage guards:
- All 3 `localStorage.setItem()` calls (theme toggle desktop, theme toggle mobile,
  inline theme restore) are now wrapped in try/catch. This prevents crashes in private
  browsing mode or when storage quota is exceeded.

## 4. Digital Health Quiz

**Status: FIXED**

### Already present (good):
- All state transitions handled (forward/back navigation, results, retake)
- Invalid states caught via `animating` flag preventing concurrent transitions
- Quiz completion works correctly (score calculation with fallback: `?? TIERS[0]`)
- Results display with staggered animation

### Issues found and resolved:

**4a. Missing null checks on DOM refs**
- 13 DOM refs (`body`, `slide`, `qEl`, `choicesEl`, `fill`, `currentEl`, `backBtn`,
  `nextBtn`, `calcPhase`, `calcBar`, `resultsEl`, `retakeBtn`, `trackEl`) were obtained
  but never null-checked. If any were missing, subsequent operations like
  `qEl.textContent = data.q` would throw.
- **Fix:** Added a compound null check that bails out if any critical ref is missing.

**4b. No error isolation**
- **Fix:** Wrapped entire quiz init in try/catch. Quiz failure leaves the page functional.

## 5. Blog Content

**Status: PASS (no changes needed)**

- `[...slug].astro` uses `getStaticPaths()` which generates pages at build time only.
  Invalid slugs are impossible at runtime — they simply result in a 404 page.
- Blog index handles empty state: `{posts.length === 0 && (<p>No posts yet...</p>)}`
- Content schema validation via Zod in `content.config.ts` catches malformed frontmatter
  at build time, not runtime.

## 6. External Service Dependencies

**Status: PASS (already handled + improved)**

If Formspree is down:
- The fetch returns a non-ok response (or the catch fires), triggering `resetToIdle()`
- The error message with mailto fallback (`consult@sg57.dev`) is displayed
- No JavaScript errors cascade — the try/catch ensures recovery
- The rest of the site (nav, quiz, slider, scroll-to-top) is completely independent
  and unaffected by Formspree status
- **New:** The form now has `action` and `method` attributes, so even if all JS fails,
  the browser can still POST to Formspree natively

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/pages/services/index.astro` | maxlength on 5 form inputs, form action/method fallback, try/catch on form init + submit, null guards on all DOM refs |
| `src/components/services/DigitalHealthQuiz.astro` | try/catch wrapper, compound null check on 13 DOM refs |
| `src/components/services/BeforeAfterSlider.astro` | try/catch wrapper |
| `src/components/shared/Nav.astro` | try/catch wrapper, localStorage guard |
| `src/layouts/Base.astro` | try/catch on theme init + toggle + FAB, localStorage guards |
| `src/styles/global.css` | Broken image CSS fallback |
| `package.json` / `package-lock.json` | npm audit fix (0 vulnerabilities) |
