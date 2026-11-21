// Unit tests for the sg57/focus-visible-outline-replacement stylelint rule. Each bad case names the exact bug that
// would turn the case green; each good case names the false positive it guards against.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import stylelint from 'stylelint';
import { fileURLToPath } from 'node:url';
import { ruleName } from './focus-outline-plugin.mjs';

const plugin = fileURLToPath(new URL('./focus-outline-plugin.mjs', import.meta.url));
const lint = async (code) => {
  const r = await stylelint.lint({ code, codeFilename: 'x.css', config: { plugins: [plugin], rules: { [ruleName]: true } } });
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
    'outline none on hover (not a focus rule)': '.a:hover { outline: none; }',
    'the forced-colors block itself': '@media (forced-colors: active) { .a:focus-visible { outline: 2px solid CanvasText; } }',
    'no outline declaration at all': '.a:focus-visible { box-shadow: 0 0 0 2px red; }',
  };
  for (const [name, css] of Object.entries(good)) {
    it(`accepts: ${name}`, async () => assert.deepEqual(await lint(css), []));
  }
});
