/**
 * Rehype plugin: heading ids must begin with a letter.
 *
 * Astro's own heading-id plugin runs after user rehype plugins and keeps an id that is already set,
 * so this plugin pre-assigns the id for the headings that need it. A GitHub-style slug of
 * "1. Voice Modes" or "[3.6.0] - 2026-10-22" starts with a digit, which is not a valid HTML id
 * (html-validate: valid-id). Only those headings get a prefix; every other heading is left to Astro,
 * so existing anchors keep working.
 */
const PREFIX = 's-';

function textOf(node) {
  if (node.type === 'text' || node.type === 'raw') return node.value;
  return Array.isArray(node.children) ? node.children.map(textOf).join('') : '';
}

// Same shape as github-slugger for the headings in play: lowercase, drop everything that is not a
// letter, mark, number, connector punctuation, hyphen or space, then spaces become hyphens.
function slug(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '').replace(/ /g, '-');
}

export default function rehypeLetterHeadingIds() {
  return (tree) => {
    const used = new Map();
    const visit = (node) => {
      if (node.type === 'element' && /^h[1-6]$/.test(node.tagName)) {
        const base = slug(textOf(node));
        if (/^[0-9]/.test(base) && typeof node.properties?.id !== 'string') {
          const n = used.get(base) ?? 0;
          used.set(base, n + 1);
          node.properties = node.properties || {};
          node.properties.id = PREFIX + base + (n ? `-${n}` : '');
        }
      }
      if (Array.isArray(node.children)) node.children.forEach(visit);
    };
    visit(tree);
  };
}
