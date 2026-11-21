// Minimal CSS declaration scanner: yields every declaration with the stack of enclosing preludes
// (at-rules and selectors). Handles comments, strings, url()/paren content, CSS nesting and unterminated final
// declarations (minified output). Not a validator; built for dist/*.css produced by the Astro/Vite pipeline.

export function* scanDeclarations(css) {
  const stack = [];
  let buf = '';
  let paren = 0;
  const flush = () => {
    const decl = buf.trim();
    buf = '';
    if (!decl) return null;
    const i = decl.indexOf(':');
    if (i < 1) return null;
    return { stack: [...stack], prop: decl.slice(0, i).trim().toLowerCase(), value: decl.slice(i + 1).trim() };
  };
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') { const e = css.indexOf('*/', i + 2); i = e < 0 ? css.length : e + 1; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== c) j += css[j] === '\\' ? 2 : 1;
      buf += css.slice(i, j + 1); i = j; continue;
    }
    if (c === '(') paren++;
    else if (c === ')') paren = Math.max(0, paren - 1);
    if (paren > 0) { buf += c; continue; }
    if (c === '{') { stack.push(buf.trim().replace(/\s+/g, ' ')); buf = ''; }
    else if (c === '}') { const d = flush(); if (d) yield d; stack.pop(); }
    else if (c === ';') { const d = flush(); if (d) yield d; }
    else buf += c;
  }
  const d = flush();
  if (d) yield d;
}

/** True when any enclosing prelude is `@media (prefers-reduced-motion: no-preference)` (possibly combined with `and`). */
export const inNoPreference = (stack) => stack.some((p) => /^@media\b/i.test(p) && /prefers-reduced-motion\s*:\s*no-preference/i.test(p));

/** Extract inline <style> block bodies from an HTML document. */
export const styleBlocks = (html) => [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
