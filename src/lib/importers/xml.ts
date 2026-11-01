/* Tiny XML reader for the parts of .xlsx we need (React Native has no DOMParser). */

export interface XNode {
  name: string; // local name, namespace prefix stripped; '#text' for text nodes
  attrs: Record<string, string>;
  children: XNode[];
  value: string; // text nodes only
}

const ENTITIES: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
const decode = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
  if (e[0] === '#') {
    const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return isNaN(code) ? m : String.fromCodePoint(code);
  }
  return ENTITIES[e] ?? m;
});
const local = (name: string) => name.slice(name.indexOf(':') + 1);

export function parseXml(xml: string): XNode {
  const root: XNode = { name: '#root', attrs: {}, children: [], value: '' };
  const stack: XNode[] = [root];
  const re = /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([^\s/>]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const top = stack[stack.length - 1];
    if (m[1] != null) {
      top.children.push({ name: '#text', attrs: {}, children: [], value: m[1] });
    } else if (m[3]) {
      if (m[2]) { // closing tag
        if (stack.length > 1) stack.pop();
        continue;
      }
      const attrs: Record<string, string> = {};
      const ar = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
      let a: RegExpExecArray | null;
      while ((a = ar.exec(m[4] || ''))) attrs[a[1]] = decode(a[2] ?? a[3] ?? '');
      const node: XNode = { name: local(m[3]), attrs, children: [], value: '' };
      top.children.push(node);
      if (!m[5]) stack.push(node);
    } else if (m[6] != null && stack.length > 1) {
      top.children.push({ name: '#text', attrs: {}, children: [], value: decode(m[6]) });
    }
  }
  return root;
}

export function all(node: XNode, name: string, out: XNode[] = []): XNode[] {
  for (const c of node.children) {
    if (c.name === name) out.push(c);
    if (c.children.length) all(c, name, out);
  }
  return out;
}
export const first = (node: XNode, name: string): XNode | null => {
  for (const c of node.children) {
    if (c.name === name) return c;
    const f = c.children.length ? first(c, name) : null;
    if (f) return f;
  }
  return null;
};
export const elements = (node: XNode) => node.children.filter((c) => c.name !== '#text');
export function textContent(node: XNode): string {
  if (node.name === '#text') return node.value;
  return node.children.map(textContent).join('');
}
// Relationship ids are written as r:id with whatever prefix the writer chose.
export const relId = (n: XNode) => n.attrs['r:id'] ?? Object.entries(n.attrs).find(([k]) => k.endsWith(':id'))?.[1];
