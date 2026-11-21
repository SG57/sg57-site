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

/** Top-level (outside parentheses) pieces of a media query: words and whole (...) groups. */
function mediaTokens(query) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of query) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (/\s/.test(ch) && depth === 0) { if (cur) out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

const NO_PREFERENCE = /^\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)$/;

/**
 * Does this media query list GUARANTEE prefers-reduced-motion: no-preference? Every comma-separated query is a
 * separate way in, so EACH must contain the plain no-preference feature joined by `and`; a query that uses `not` or
 * `or` at the top level, or that only mentions the feature inside a nested group, proves nothing.
 */
export function mediaGuaranteesNoPreference(list) {
  const queries = [];
  let depth = 0;
  let cur = '';
  for (const ch of list.toLowerCase()) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) { queries.push(cur); cur = ''; } else cur += ch;
  }
  queries.push(cur);
  return queries.every((q) => {
    const t = mediaTokens(q.trim());
    if (t.some((x) => x === 'not' || x === 'or')) return false;
    return t.some((x) => NO_PREFERENCE.test(x));
  });
}

/** True when any enclosing prelude is an @media whose every query guarantees `prefers-reduced-motion: no-preference`. */
export const inNoPreference = (stack) => stack.some((p) => /^@media\b/i.test(p) && mediaGuaranteesNoPreference(p.replace(/^@media\b/i, '')));

/** Extract inline <style> block bodies from an HTML document. */
export const styleBlocks = (html) => [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
