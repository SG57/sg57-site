// Stylelint rule: a rule that removes an element's outline must leave a replacement that survives forced-colors
// (Windows High Contrast) mode. Removal means the FINAL outline state of the rule is style none or width zero:
// `outline: none | 0 | 0px | initial | unset | var(--...none...)`, `outline-style: none`, `outline-width: 0`, in any case,
// with or without !important, and an `outline` shorthand that omits the style (the style then resets to none).
// A box-shadow ring alone vanishes in forced-colors mode.
//
// A removing rule passes when ANY of these holds:
//   1. its selector ends in :not(:focus-visible) (the standard safe pattern `a:focus:not(:focus-visible)`: only the
//      pointer focus ring is dropped, the keyboard ring is untouched);
//   2. the same stylesheet LATER, at top level, gives the same selector, or its :focus / :focus-visible form, a
//      visible-style outline (a transparent colour counts: it is painted in a system colour in forced-colors mode);
//   3. a LATER same-selector rule inside @media (forced-colors: active) sets a visible-style outline;
//   4. the selector is listed in the plugin option `allow` ({ "<selector>": "<why it is safe>" }), reserved for
//      elements that never take keyboard focus or whose ring comes from elsewhere. The runner (css.mjs) fails when an
//      entry no longer matches a removal, so the list cannot rot.
//
// Scope, stated honestly: this is lexical. It reads the declarations in the stylesheet text; it cannot see an outline
// set through a custom property resolved elsewhere, from JS, or from a cascade across files. Rules whose only state
// pseudo-class is :hover or :active are not inspected. The rendered forced-colors check in scripts/qa/spine.mjs is the
// backstop that proves a ring is actually painted.
import stylelint from 'stylelint';

export const ruleName = 'sg57/focus-visible-outline-replacement';
export const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (sel) =>
    `outline removed on "${sel}" with no forced-colors-safe replacement. ` +
    'Fix: keep your box-shadow ring and replace "outline: none" with "outline: 2px solid transparent; outline-offset: 2px" ' +
    '(transparent outlines are painted in a system colour in forced-colors mode), or add the same selector with a real outline ' +
    'inside @media (forced-colors: active). Federal Law 35(a) / Law 17 (WCAG 2.4.7, 1.4.11).',
});

const STYLES = new Set(['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'auto']);
const RESET = new Set(['initial', 'unset']);
const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
const clean = (v) => v.replace(/!\s*important/i, '').trim().toLowerCase();
const isVar = (t) => t.startsWith('var(');
const varNone = (t) => isVar(t) && t.includes('none');
const isZeroLength = (t) => /^[+-]?(?:0+\.?0*|\.0+)[a-z%]*$/.test(t);

/** Whitespace-separated tokens, keeping var(...) / calc(...) groups whole. */
function tokens(value) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const c of value) {
    if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    if (/\s/.test(c) && depth === 0) { if (cur) out.push(cur); cur = ''; } else cur += c;
  }
  if (cur) out.push(cur);
  return out;
}

/** The `outline` shorthand resets style, width and colour; an omitted style is `none`. */
function shorthand(value) {
  const t = tokens(value);
  if (t.length === 1 && RESET.has(t[0])) return { style: 'none', zero: false, transparent: false };
  const st = { style: null, zero: false, transparent: false };
  let sawVar = false;
  for (const x of t) {
    if (x === 'none') st.style = 'none';
    else if (STYLES.has(x)) { if (st.style !== 'none') st.style = 'visible'; }
    else if (x === 'transparent') st.transparent = true;
    else if (isVar(x)) { sawVar = true; if (varNone(x)) st.style = 'none'; }
    else if (isZeroLength(x)) st.zero = true;
  }
  if (st.style === null && !sawVar) st.style = 'none';
  return st;
}

/** Final outline state of a rule after applying its declarations in order. */
function outlineState(rule) {
  let style = null; // 'visible' | 'none' | null (unset, or unknowable from a var())
  let zero = false;
  let transparent = false;
  let removalDecl = null;
  rule.each((n) => {
    if (n.type !== 'decl') return;
    const prop = n.prop.toLowerCase();
    if (prop !== 'outline' && prop !== 'outline-style' && prop !== 'outline-width' && prop !== 'outline-color') return;
    const v = clean(n.value);
    if (prop === 'outline') ({ style, zero, transparent } = shorthand(v));
    else if (prop === 'outline-style') style = v === 'none' || RESET.has(v) || varNone(v) ? 'none' : isVar(v) ? style : 'visible';
    else if (prop === 'outline-width') zero = isZeroLength(v) || varNone(v);
    else transparent = v === 'transparent';
    if (style === 'none' || zero) removalDecl = n;
  });
  const removed = style === 'none' || zero;
  return { removed, safe: style === 'visible' && !zero, transparent, removalDecl: removed ? removalDecl : null };
}

const inForcedColors = (node) => {
  for (let p = node.parent; p; p = p.parent) {
    if (p.type === 'atrule' && /forced-colors\s*:\s*active/i.test(p.params)) return true;
  }
  return false;
};
const topLevel = (rule) => !rule.parent || rule.parent.type === 'root' || rule.parent.type === 'document';
const offsetOf = (node) => node.source?.start?.offset ?? 0;
const NOT_FV = /:not\(\s*:focus-visible\s*\)/g;

/** Selector forms a replacement may be written for: the selector itself, its base, and its :focus / :focus-visible forms. */
function forms(sel) {
  const base = sel.replace(/:focus(?:-visible)?$/, '');
  return [sel, base, `${base}:focus`, `${base}:focus-visible`];
}

const rule = (primary, secondary = {}) => (root, result) => {
  if (!primary) return;
  const allow = Object.fromEntries(Object.entries(secondary.allow ?? {}).map(([k, v]) => [norm(k), v]));
  const forced = new Map(); // selector -> latest offset of a visible-outline rule in @media (forced-colors: active)
  const ring = new Map(); // selector -> latest offset of a top-level visible-outline rule
  const bump = (m, s, at) => m.set(s, Math.max(m.get(s) ?? -1, at));
  root.walkRules((r) => {
    if (!outlineState(r).safe) return;
    const at = offsetOf(r);
    if (inForcedColors(r)) r.selectors.forEach((s) => bump(forced, norm(s), at));
    else if (topLevel(r)) r.selectors.forEach((s) => bump(ring, norm(s), at));
  });

  root.walkRules((r) => {
    if (inForcedColors(r)) return;
    const st = outlineState(r);
    if (!st.removed) return;
    const at = offsetOf(r);
    const later = (m, s) => forms(s).some((f) => (m.get(f) ?? -1) > at);
    const failing = [];
    for (const raw of r.selectors) {
      const s = norm(raw);
      if (/:(?:hover|active)\b/.test(s) && !/:focus/.test(s)) continue;
      if (/:not\(\s*:focus-visible\s*\)$/.test(s) && !s.replace(NOT_FV, '').includes(':focus-visible')) continue;
      if (Object.hasOwn(allow, s)) { secondary.onAllowUsed?.(s); continue; }
      if (later(forced, s) || later(ring, s)) continue;
      failing.push(s);
    }
    if (failing.length) stylelint.utils.report({ ruleName, result, node: st.removalDecl ?? r, message: messages.rejected(failing.join(', ')) });
  });
};
rule.ruleName = ruleName;
rule.messages = messages;
export default stylelint.createPlugin(ruleName, rule);
