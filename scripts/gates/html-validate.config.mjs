// html-validate configuration for the BUILT output (dist/**/*.html).
// HARD rules fail the gate; every other rule is reported as a warning with counts.
// Each hard rule carries the remediation shown to the agent and the governing law.

export const config = {
  extends: ['html-validate:recommended'],
  rules: {
    // Astro emits style="view-transition-name: ..." for transition:name, so inline styles are expected.
    'no-inline-style': 'off',
  },
};

const A11Y = 'Federal Law 17 (WCAG 2.1 AA)';

export const HARD_RULES = {
  'no-multiple-main': {
    law: `${A11Y}; SL-1 (Base layout owns the single <main id="main-content">)`,
    fix: 'A page may have exactly one <main>. Base.astro already wraps every page slot in <main>; change the nested page <main> to <div> or <section> (keep the class/aria-live on that element, not on a second landmark).',
  },
  'valid-id': {
    law: A11Y,
    fix: 'HTML ids must begin with a letter. Prefix generated ids (for example id={`v-${slug}`}) and update the matching href="#..." anchors and aria-labelledby references.',
  },
  'empty-heading': {
    law: A11Y,
    fix: 'Every <h1>-<h6> needs text content. Remove the empty heading, or fill it; if it is only visual, use a <div aria-hidden="true">. Never leave an empty heading as a layout hook.',
  },
  'hidden-focusable': {
    law: A11Y,
    fix: 'aria-hidden content must not contain focusable elements. Add the native `inert` attribute to the hidden subtree (removes it from tab order and the accessibility tree) or set tabindex="-1" plus aria-hidden on the control, or drop aria-hidden.',
  },
  'wcag/h30': {
    law: A11Y,
    fix: 'Every <a> needs an accessible name. Add visible link text, or aria-label / visually-hidden text for icon-only links (WCAG 2.4.4).',
  },
  'wcag/h32': { law: A11Y, fix: 'Every <form> needs a submit button (<button type="submit"> or <input type="submit">) (WCAG 3.2.2).' },
  'wcag/h36': { law: A11Y, fix: 'Image submit buttons (<input type="image">) need a non-empty alt attribute.' },
  'wcag/h37': { law: A11Y, fix: 'Every <img> needs an alt attribute; use alt="" for decorative images.' },
  'wcag/h63': { law: A11Y, fix: 'Data table header cells (<th>) need a scope attribute (col, row, colgroup or rowgroup).' },
  'wcag/h67': { law: A11Y, fix: 'A decorative <img alt=""> must not carry a title attribute; remove the title or give the image real alt text.' },
  'wcag/h71': { law: A11Y, fix: 'A <fieldset> needs a <legend> describing the group.' },
};

for (const id of Object.keys(HARD_RULES)) config.rules[id] = 'error';
