/**
 * SL-10 (amended 2026-11-20): programmatic scrolling is smooth only when the visitor allows motion.
 * Read at call time so a changed OS setting applies without a reload. Every scrollTo / scrollIntoView
 * call in src/ takes its `behavior` from here (the floors gate fails on a literal 'smooth'). Base.astro and
 * the blog's is:inline script carry a copy of the same one-liner: an import in Base would cost every page two
 * extra requests, and an is:inline script cannot import.
 */
export function scrollBehavior(): ScrollBehavior {
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}
