/**
 * Rehype plugin: wrap every markdown table in a keyboard-focusable scroll container.
 *
 * A table whose columns need more than the viewport (375px phones) is cut off by the page's
 * overflow-x clip, so the right-hand columns are unreachable. The wrapper scrolls instead, and
 * tabindex="0" lets keyboard users scroll it (axe: scrollable-region-focusable). role="group" plus a
 * label gives the stop a name without adding a landmark per table.
 */
export default function rehypeScrollTables() {
  return (tree) => {
    const visit = (node) => {
      if (!Array.isArray(node.children)) return;
      node.children = node.children.map((child) => {
        if (child.type === 'element' && child.tagName === 'table') {
          return {
            type: 'element',
            tagName: 'div',
            properties: { className: ['table-scroll'], role: 'group', ariaLabel: 'Table, scrolls sideways when it does not fit', tabIndex: 0 },
            children: [child],
          };
        }
        visit(child);
        return child;
      });
    };
    visit(tree);
  };
}
