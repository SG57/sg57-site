// Stylelint rule: a :focus-visible rule may not remove the outline unless it leaves a replacement that survives
// forced-colors (Windows High Contrast) mode: a visible-style outline in a transparent colour in the same rule, or a
// same-selector outline inside @media (forced-colors: active). A box-shadow ring alone vanishes in forced-colors mode.
import stylelint from 'stylelint';

export const ruleName = 'sg57/focus-visible-outline-replacement';
export const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (sel) =>
    `outline removed on "${sel}" with no forced-colors-safe replacement. ` +
    'Fix: keep your box-shadow ring and replace "outline: none" with "outline: 2px solid transparent; outline-offset: 2px" ' +
    '(transparent outlines are painted in a system colour in forced-colors mode), or add the same selector with a real outline ' +
    'inside @media (forced-colors: active). Federal Law 35(a) / Law 17 (WCAG 2.4.7, 1.4.11).',
});

const VISIBLE_STYLE = /\b(solid|dashed|dotted|double|groove|ridge|inset|outset|auto)\b/i;
const isOutlineProp = (p) => p === 'outline' || p.startsWith('outline-');
const isNone = (d) =>
  (d.prop === 'outline' && /^(none|0)\b/i.test(d.value.trim())) ||
  (d.prop === 'outline-style' && /^none$/i.test(d.value.trim())) ||
  (d.prop === 'outline-width' && /^0(px|em|rem)?$/i.test(d.value.trim()));

/** Final outline state of a rule after applying its declarations in order. */
function outlineState(rule) {
  let style = null; // 'visible' | 'none' | null (unset)
  let transparent = false;
  rule.each((n) => {
    if (n.type !== 'decl' || !isOutlineProp(n.prop.toLowerCase())) return;
    const prop = n.prop.toLowerCase();
    const v = n.value.trim();
    if (prop === 'outline') {
      style = isNone(n) ? 'none' : VISIBLE_STYLE.test(v) ? 'visible' : style;
      transparent = /transparent/i.test(v);
    } else if (prop === 'outline-style') style = /^none$/i.test(v) ? 'none' : 'visible';
    else if (prop === 'outline-color') transparent = /^transparent$/i.test(v);
    else if (prop === 'outline-width' && isNone(n)) style = 'none';
  });
  return { style, transparent };
}

const rule = (primary) => (root, result) => {
  if (!primary) return;
  const forced = new Set();
  root.walkAtRules('media', (at) => {
    if (!/forced-colors\s*:\s*active/i.test(at.params)) return;
    at.walkRules((r) => {
      if (outlineState(r).style === 'visible') r.selectors.forEach((s) => forced.add(s.trim()));
    });
  });
  root.walkRules((r) => {
    if (r.parent?.type === 'atrule' && /forced-colors/i.test(r.parent.params)) return;
    const sels = r.selectors.filter((s) => /:focus-visible\b/.test(s));
    if (!sels.length) return;
    let removal = null;
    r.each((n) => { if (n.type === 'decl' && isNone(n)) removal = n; });
    if (!removal) return;
    const st = outlineState(r);
    if (st.style === 'visible' && st.transparent) return;
    if (sels.every((s) => forced.has(s.trim()))) return;
    stylelint.utils.report({ ruleName, result, node: removal, message: messages.rejected(sels.join(', ')) });
  });
};
rule.ruleName = ruleName;
rule.messages = messages;
export default stylelint.createPlugin(ruleName, rule);
