/* EPUB reader core: unzips the book, reads the spine and table of contents, and turns
   chapters into clean HTML (book styles dropped, images inlined) for the reader. Pure TS. */
import { strFromU8, unzipSync } from 'fflate';
import { toBase64 } from './base64';
import { all, elements, first, parseXml, textContent, type XNode } from './importers/xml';

export interface TocEntry { label: string; index: number; frag: string; depth: number }

export interface Epub {
  title: string;
  author: string;
  chapters: string[]; // zip paths, in reading order
  toc: TocEntry[];
  chapterHtml: (index: number) => string;
  // Where an <a href> inside chapter `from` points: another chapter, or an outside URL.
  resolve: (from: number, href: string) => { index: number; frag: string } | { external: string } | null;
}

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp',
};
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const SVG_SELF_CLOSING = new Set(['image', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'ellipse', 'use', 'stop']);

const dirOf = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : '');
function safeDecode(s: string) {
  try { return decodeURIComponent(s); } catch { return s; }
}
function joinPath(base: string, rel: string) {
  const parts = (dirOf(base) + safeDecode(rel)).split('/');
  const out: string[] = [];
  for (const p of parts) {
    if (p === '..') out.pop();
    else if (p !== '.' && p !== '') out.push(p);
  }
  return out.join('/');
}
const decodeEntities = (s: string) => s.replace(/&nbsp;/g, ' ');

export function parseEpub(bytes: Uint8Array): Epub {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error("This file isn't a readable EPUB.");
  }
  const lower = new Map(Object.keys(files).map((k) => [k.toLowerCase(), k]));
  const get = (path: string) => files[path] ?? files[lower.get(path.toLowerCase()) ?? ''];
  const text = (path: string) => {
    const f = get(path);
    return f ? strFromU8(f) : null;
  };

  const container = text('META-INF/container.xml');
  const opfPath = container ? first(parseXml(container), 'rootfile')?.attrs['full-path'] : undefined;
  const opfText = opfPath ? text(opfPath) : null;
  if (!opfPath || !opfText) throw new Error("This EPUB is missing its table of contents (OPF).");
  const opf = parseXml(opfText);

  const manifest = new Map<string, { href: string; type: string; props: string }>();
  all(opf, 'item').forEach((it) => {
    manifest.set(it.attrs.id, { href: joinPath(opfPath, it.attrs.href || ''), type: it.attrs['media-type'] || '', props: it.attrs.properties || '' });
  });
  const spineEl = first(opf, 'spine');
  const chapters = (spineEl ? elements(spineEl) : [])
    .filter((r) => r.name === 'itemref')
    .map((r) => manifest.get(r.attrs.idref))
    .filter((m): m is { href: string; type: string; props: string } => !!m && /html|xml/.test(m.type) && !!get(m.href))
    .map((m) => m.href);
  if (!chapters.length) throw new Error('This EPUB has no readable chapters.');
  const indexOf = new Map(chapters.map((c, i) => [c.toLowerCase(), i]));

  const meta = (name: string) => decodeEntities(textContent(first(opf, name) || { name: '', attrs: {}, children: [], value: '' })).trim();

  /* ---- table of contents: EPUB 3 nav, else EPUB 2 NCX, else one entry per chapter ---- */
  const toc: TocEntry[] = [];
  const addEntry = (label: string, href: string, base: string, depth: number) => {
    const [p, frag = ''] = href.split('#');
    const i = indexOf.get(joinPath(base, p).toLowerCase());
    const clean = label.replace(/\s+/g, ' ').trim();
    if (i != null && clean) toc.push({ label: clean, index: i, frag: safeDecode(frag), depth });
  };
  const navItem = [...manifest.values()].find((m) => m.props.split(/\s+/).includes('nav'));
  const navText = navItem ? text(navItem.href) : null;
  if (navItem && navText) {
    const doc = parseXml(navText);
    const navs = all(doc, 'nav');
    const tocNav = navs.find((n) => Object.entries(n.attrs).some(([k, v]) => k.endsWith('type') && v.split(/\s+/).includes('toc'))) || navs[0];
    const walk = (ol: XNode, depth: number) => elements(ol).filter((li) => li.name === 'li').forEach((li) => {
      const a = elements(li).find((c) => c.name === 'a');
      if (a?.attrs.href) addEntry(decodeEntities(textContent(a)), a.attrs.href, navItem.href, depth);
      const sub = elements(li).find((c) => c.name === 'ol');
      if (sub) walk(sub, depth + 1);
    });
    const ol = tocNav && first(tocNav, 'ol');
    if (ol) walk(ol, 0);
  }
  if (!toc.length) {
    const ncxId = spineEl?.attrs.toc;
    const ncxItem = (ncxId && manifest.get(ncxId)) || [...manifest.values()].find((m) => m.type === 'application/x-dtbncx+xml');
    const ncxText = ncxItem ? text(ncxItem.href) : null;
    if (ncxItem && ncxText) {
      const navMap = first(parseXml(ncxText), 'navMap');
      const walk = (n: XNode, depth: number) => elements(n).filter((c) => c.name === 'navPoint').forEach((np) => {
        const label = first(np, 'text');
        const content = elements(np).find((c) => c.name === 'content');
        if (label && content?.attrs.src) addEntry(decodeEntities(textContent(label)), content.attrs.src, ncxItem.href, depth);
        walk(np, depth + 1);
      });
      if (navMap) walk(navMap, 0);
    }
  }
  if (!toc.length) chapters.forEach((_, i) => toc.push({ label: `Part ${i + 1}`, index: i, frag: '', depth: 0 }));

  /* ---- chapter HTML ---- */
  const imageCache = new Map<string, string>();
  const dataUri = (path: string) => {
    if (imageCache.has(path)) return imageCache.get(path)!;
    const f = get(path);
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const uri = f ? `data:${MIME[ext] || 'application/octet-stream'};base64,${toBase64(f)}` : '';
    imageCache.set(path, uri);
    return uri;
  };

  const chapterHtml = (index: number) => {
    const path = chapters[index];
    const raw = text(path) || '';
    const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/i.exec(raw);
    let html = bodyMatch ? bodyMatch[1] : raw;
    html = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<link\b[^>]*>/gi, '')
      // XHTML allows <a id="x"/>, which HTML would read as an unclosed tag swallowing the chapter.
      .replace(/<([a-zA-Z][\w:-]*)(\s[^<>]*?)?\s*\/>/g, (m, tag: string, attrs = '') => {
        const t = tag.toLowerCase();
        return VOID.has(t) || SVG_SELF_CLOSING.has(t.replace(/^svg:/, '')) ? m : `<${tag}${attrs}></${tag}>`;
      })
      .replace(/(<img\b[^>]*?\bsrc\s*=\s*)(["'])(.*?)\2/gi, (_, pre: string, q: string, src: string) =>
        /^(data|https?):/i.test(src) ? `${pre}${q}${src}${q}` : `${pre}${q}${dataUri(joinPath(path, src))}${q}`)
      .replace(/(<(?:svg:)?image\b[^>]*?\b(?:xlink:)?href\s*=\s*)(["'])(.*?)\2/gi, (_, pre: string, q: string, src: string) =>
        /^(data|https?):/i.test(src) ? `${pre}${q}${src}${q}` : `${pre}${q}${dataUri(joinPath(path, src))}${q}`);
    return html;
  };

  const resolve = (from: number, href: string) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return { external: href };
    const [p, frag = ''] = href.split('#');
    if (!p) return { index: from, frag: safeDecode(frag) };
    const i = indexOf.get(joinPath(chapters[from], p).toLowerCase());
    return i == null ? null : { index: i, frag: safeDecode(frag) };
  };

  return { title: meta('title'), author: meta('creator'), chapters, toc, chapterHtml, resolve };
}

// Which TOC entry covers a chapter (the last entry starting at or before it).
export function tocLabelFor(epub: Epub, index: number): string {
  let label = '';
  for (const e of epub.toc) if (e.index <= index && e.depth === 0) label = e.label;
  return label || `Part ${index + 1}`;
}
