# Security Audit Report — sg57-site

**Date:** 2026-03-25
**Scope:** All source files in src/, dependencies, deployment config

---

## 1. XSS Prevention

**Status: PASS**

- No `set:html` directives found anywhere in the codebase.
- All Astro template expressions use default auto-escaping (`{variable}` syntax).
- `innerHTML` usage (3 instances) is safe:
  - `DigitalHealthQuiz.astro:222` — `choicesEl.innerHTML = ''` (clearing, no user data)
  - `services/index.astro:324` — hardcoded HTML string for button reset
  - `services/index.astro:352` — hardcoded HTML string for spinner state
- No `dangerouslySetInnerHTML`, no `eval()`, no `Function()` constructors.
- Blog content rendered via Astro's `<Content />` component with built-in sanitization.

## 2. Input Validation

**Status: FIXED**

### Issues found and resolved:
- **Form inputs lacked `maxlength` constraints.** An attacker could submit arbitrarily long
  strings to the Formspree endpoint. While Formspree has its own limits, defense-in-depth
  requires client-side constraints.

### Fixes applied:
- `name` input: `maxlength="200"`
- `email` input: `maxlength="320"` (RFC 5321 max)
- `business` input: `maxlength="200"`
- `website` input: `maxlength="2048"` (practical URL limit)
- `challenge` textarea: `maxlength="5000"`

### No issues:
- Blog `[...slug].astro` uses `getStaticPaths()` — invalid slugs produce 404 at build time,
  not runtime. No dynamic URL parameter injection possible.
- No URL parameters are read or rendered in any component.

## 3. Sensitive Data Exposure

**Status: PASS**

- Zero `console.log` statements in the codebase.
- No API keys, tokens, or secrets in client-side code.
- Formspree endpoint ID (`mojkpkyj`) is public by design — this is their intended usage model.
- No error messages expose internal file paths or stack traces.
- `meta[name="generator"]` exposes Astro version — acceptable for a public static site.

## 4. Content Security Policy

**Status: INFORMATIONAL**

- No `eval()` or `Function()` usage anywhere.
- One `is:inline` script for theme initialization (required for FOUC prevention) — would
  require `unsafe-inline` in a strict CSP. This is a known trade-off for theme persistence.
- No inline event handlers (all event binding via `addEventListener`).
- All fonts are self-hosted (no external font CDNs).
- No external JavaScript loaded.
- External resources: Formspree API (fetch only, no script loading).
- **Recommendation:** When GitHub Pages supports custom headers, add a CSP header. Current
  GitHub Pages deployment has no header control — this is a platform limitation, not a code issue.

## 5. Dependency Vulnerabilities

**Status: FIXED**

### Before audit:
- 8 vulnerabilities (4 moderate, 4 high)
- `devalue` <=5.6.3 — prototype pollution (moderate)
- `fast-xml-parser` 4.0.0-beta.3-5.5.6 — entity expansion bypass (high)
- `h3` <=1.15.8 — path traversal, SSE injection (moderate)
- `picomatch` <2.3.2 — method injection (moderate)
- `rollup` 4.0.0-4.58.0 — arbitrary file write (high)
- `smol-toml` <1.6.1 — DoS (moderate)
- `svgo` 4.0.0 — entity expansion DoS (high)

### After fixes:
- `npm audit fix` resolved 6 vulnerabilities (devalue, h3, picomatch, rollup, smol-toml, svgo)
- `npm audit fix --force` downgraded `@astrojs/rss` from 4.0.17 to 4.0.16 to resolve
  `fast-xml-parser` vulnerability. The RSS feed (`rss.xml.ts`) uses a simple API surface
  that is unchanged between these versions.
- **Final: 0 vulnerabilities**

## 6. External Links

**Status: PASS**

All 9 external `target="_blank"` links have `rel="noopener noreferrer"`:
- ProofOfWork.astro: 5 links (staplesandstatements.com)
- clide/index.astro: 2 links (sg57.lemonsqueezy.com)
- siftr/index.astro: 2 links (sg57.lemonsqueezy.com)

## 7. Form Security

**Status: FIXED**

### Already present (good):
- Honeypot field (`_gotcha`) for bot protection
- HTML5 validation with `required`, `type="email"`, `type="url"` attributes
- Client-side `checkValidity()` + `reportValidity()` before submission
- Double-submit prevention via `submitted` flag
- Formspree endpoint uses POST with `Accept: application/json` header

### Fixes applied:
- Added `maxlength` constraints to all form fields (see section 2)
- Added `action` and `method` attributes to `<form>` element as non-JS fallback.
  If JavaScript fails, the form can still submit via native browser POST to Formspree.
