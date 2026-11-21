// Unit tests for the sg57/focus-visible-outline-replacement stylelint rule. Each bad case names the exact bug that
// would turn the case green; each good case names the false positive it guards against.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import stylelint from 'stylelint';
import { fileURLToPath } from 'node:url';
import { ruleName } from './focus-outline-plugin.mjs';

const plugin = fileURLToPath(new URL('./focus-outline-plugin.mjs', import.meta.url));
const lint = async (code, secondary = true) => {
  const r = await stylelint.lint({ code, codeFilename: 'x.css', config: { plugins: [plugin], rules: { [ruleName]: secondary } } });
  return r.results[0].warnings;
};

describe('focus-visible outline replacement rule', () => {
  const bad = {
    'outline: none with only a box-shadow': '.a:focus-visible { outline: none; box-shadow: 0 0 0 2px red; }',
    'outline: 0': '.a:focus-visible { outline: 0; box-shadow: 0 0 0 2px red; }',
    'outline-style: none': '.a:focus-visible { outline-style: none; box-shadow: 0 0 0 2px red; }',
    'outline-width: 0': '.a:focus-visible { outline-width: 0; box-shadow: 0 0 0 2px red; }',
    'none then transparent colour only (style stays none, nothing paints)': '.a:focus-visible { outline: none; outline-color: transparent; }',
    'transparent first, none last (none wins)': '.a:focus-visible { outline: 2px solid transparent; outline: none; }',
    'bare :focus-visible': ':focus-visible { outline: none; box-shadow: 0 0 0 2px red; }',
    'a selector list where only one member has a forced-colors twin': '.a:focus-visible, .b:focus-visible { outline: none; } @media (forced-colors: active) { .a:focus-visible { outline: 2px solid CanvasText; } }',
    'forced-colors twin that itself removes the outline': '.a:focus-visible { outline: none; } @media (forced-colors: active) { .a:focus-visible { outline: none; } }',
    'forced-colors twin for a different selector': '.a:focus-visible { outline: none; } @media (forced-colors: active) { .b:focus-visible { outline: 2px solid CanvasText; } }',
    'nested inside @media (min-width)': '@media (min-width: 640px) { .a:focus-visible { outline: none; box-shadow: 0 0 0 2px red; } }',
    // bypasses found by an independent verifier; each of these used to pass the gate
    'outline: 0px': '.a:focus-visible { outline: 0px; box-shadow: 0 0 0 2px red; }',
    'outline: 0 solid red (zero width paints nothing)': '.a:focus-visible { outline: 0 solid red; }',
    'outline: none on :focus, not :focus-visible': '.a:focus { outline: none; box-shadow: 0 0 0 2px red; }',
    'outline: none on a plain interactive class selector': '.btn { outline: none; box-shadow: 0 0 0 2px red; }',
    'upper-case selector and property': 'A:FOCUS-VISIBLE { OUTLINE: NONE; }',
    'upper-case value': '.a:focus-visible { outline: NONE; }',
    'outline: var(--none)': '.a:focus-visible { outline: var(--none); }',
    'outline-style: var(--outline-none)': '.a:focus-visible { outline-style: var(--outline-none); }',
    'outline: initial (style resets to none)': '.a:focus-visible { outline: initial; }',
    'outline: unset': '.a:focus-visible { outline: unset; }',
    'shorthand without a style (style resets to none)': '.a:focus-visible { outline: 2px; }',
    'outline-width: 0.0em': '.a:focus-visible { outline-width: 0.0em; }',
    'important does not hide it': '.a:focus-visible { outline: none !important; }',
    'recovery rule sits earlier in the file, so the removal wins the cascade': '.a:focus-visible { outline: 2px solid red; } .a:focus { outline: none; }',
    'a later base-selector ring has lower specificity than a :focus-visible removal, so the removal wins': '.a:focus-visible { outline: none; } .a { outline: 2px solid red; }',
    'a later non-important ring cannot beat an !important removal': '.a:focus { outline: none !important; } .a:focus-visible { outline: 2px solid red; }',
    'recovery rule only inside a media query': '.a:focus { outline: none; } @media (min-width: 640px) { .a:focus-visible { outline: 2px solid red; } }',
    ':not(:focus-visible) that is not the last compound': 'a:not(:focus-visible) b { outline: none; }',
    ':focus:not(.x) is not the safe pattern': '.a:focus:not(.x) { outline: none; }',
    // round-two bypasses: the forced-colors mode itself, and rules that merely mention :hover / :active
    'N1: the removal sits inside @media (forced-colors: active)': '@media (forced-colors: active) { a:focus-visible { outline: none; } }',
    'N2: the only ring is under @media not (forced-colors: active)': 'a:focus-visible { outline: none; } @media not (forced-colors: active) { a:focus-visible { outline: 2px solid red; } }',
    'N3: the forced ring has an extra condition that can never hold': 'a:focus-visible { outline: none; } @media (forced-colors: active) and (max-width: 0px) { a:focus-visible { outline: 2px solid CanvasText; } }',
    'a forced ring under a media list with another member': 'a:focus-visible { outline: none; } @media (forced-colors: active), (min-width: 1px) { a:focus-visible { outline: 2px solid CanvasText; } }',
    'a forced ring under an or-joined query': 'a:focus-visible { outline: none; } @media (forced-colors: active) or (min-width: 1px) { a:focus-visible { outline: 2px solid CanvasText; } }',
    'a forced ring nested inside another condition': 'a:focus-visible { outline: none; } @media (forced-colors: active) { @media (max-width: 0px) { a:focus-visible { outline: 2px solid CanvasText; } } }',
    'a forced ring that only applies under not all and (forced-colors)': 'a:focus-visible { outline: none; } @media not all and (forced-colors: active) { a:focus-visible { outline: 2px solid CanvasText; } }',
    ':not(:hover) mentions hover but is not a hover-only rule': 'button:not(:hover) { outline: none; }',
    ':is(:hover, .btn) matches .btn too': ':is(:hover, .btn) { outline: none; }',
    ':where(:hover, .btn) matches .btn too': ':where(:hover, .btn) { outline: none; }',
    'a :hover rule removes the ring of a focused element that is also hovered': '.a:hover { outline: none; }',
  };
  for (const [name, css] of Object.entries(bad)) {
    it(`flags: ${name}`, async () => {
      const w = await lint(css);
      assert.ok(w.length >= 1, `expected a warning for: ${css}`);
      assert.match(w[0].text, /forced-colors-safe replacement/);
    });
  }

  const good = {
    'transparent outline plus ring': '.a:focus-visible { outline: 2px solid transparent; outline-offset: 2px; box-shadow: 0 0 0 2px red; }',
    'none then transparent solid outline (later wins)': '.a:focus-visible { outline: none; outline: 2px solid transparent; }',
    'none with explicit forced-colors twin': '.a:focus-visible { outline: none; } @media (forced-colors: active) { .a:focus-visible { outline: 2px solid CanvasText; } }',
    'real visible outline': '.a:focus-visible { outline: 2px solid #5bc0be; }',
    'a hover rule with a later ring for the same element': '.a:hover { outline: none; } .a:hover { outline: 2px solid transparent; }',
    'a forced ring written with screen and': '.a:focus-visible { outline: none; } @media screen and (forced-colors: active) { .a:focus-visible { outline: 2px solid CanvasText; } }',
    'a forced ring in upper case': '.a:focus-visible { outline: none; } @MEDIA (FORCED-COLORS: ACTIVE) { .a:focus-visible { outline: 2px solid CanvasText; } }',
    'the forced-colors block itself': '@media (forced-colors: active) { .a:focus-visible { outline: 2px solid CanvasText; } }',
    'no outline declaration at all': '.a:focus-visible { box-shadow: 0 0 0 2px red; }',
    'the standard safe pattern, :focus:not(:focus-visible)': 'a:focus:not(:focus-visible) { outline: none; }',
    'the safe pattern in upper case': 'A:FOCUS:NOT(:FOCUS-VISIBLE) { OUTLINE: NONE; }',
    ':focus removal with a later :focus-visible ring (keyboard keeps it)': '.a:focus { outline: none; } .a:focus-visible { outline: 2px solid transparent; box-shadow: 0 0 0 2px red; }',
    'an !important removal with an !important ring': '.a:focus { outline: none !important; } .a:focus-visible { outline: 2px solid red !important; }',
    'base removal with a later :focus transparent outline': '.a { outline: none; } .a:focus { outline: 2px solid transparent; }',
    'none then a real outline in the same rule (later wins)': '.a:focus-visible { outline: none; outline: 2px solid red; }',
    'outline-width non-zero with a style': '.a:focus-visible { outline-width: 2px; outline-style: solid; }',
  };
  for (const [name, css] of Object.entries(good)) {
    it(`accepts: ${name}`, async () => assert.deepEqual(await lint(css), []));
  }

  it('a reviewed allow entry excuses exactly its selector (case and spacing normalised) and reports that it was used', async () => {
    const used = [];
    const css = '.Akw-Heading  { outline: none; } .other { outline: none; }';
    const w = await lint(css, [true, { allow: { '.akw-heading': 'programmatic focus only' }, onAllowUsed: (s) => used.push(s) }]);
    assert.deepEqual(used, ['.akw-heading']);
    assert.equal(w.length, 1);
    assert.match(w[0].text, /"\.other"/);
  });
  it('without the allow entry the same rule is flagged', async () => {
    assert.equal((await lint('.akw-heading { outline: none; }')).length, 1);
  });
});
