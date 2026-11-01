/* .xlsx reader that keeps cell hyperlinks and fill colors. */
import { strFromU8, unzipSync } from 'fflate';
import { all, elements, first, parseXml, relId, textContent, type XNode } from './xml';
import type { SheetCell, SheetRow } from './rows';

const unescapeX = (s: string) => s.replace(/_x([0-9A-Fa-f]{4})_/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));

function resolvePath(base: string, target: string) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/').slice(0, -1);
  target.split('/').forEach((seg) => {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  });
  return parts.join('/');
}

/* ---------- colors ---------- */

const INDEXED = ('000000 FFFFFF FF0000 00FF00 0000FF FFFF00 FF00FF 00FFFF 000000 FFFFFF FF0000 00FF00 0000FF FFFF00 FF00FF 00FFFF ' +
  '800000 008000 000080 808000 800080 008080 C0C0C0 808080 9999FF 993366 FFFFCC CCFFFF 660066 FF8080 0066CC CCCCFF ' +
  '000080 FF00FF FFFF00 00FFFF 800080 800000 008080 0000FF 00CCFF CCFFFF CCFFCC FFFF99 99CCFF FF99CC CC99FF FFCC99 ' +
  '3366FF 33CCCC 99CC00 FFCC00 FF9900 FF6600 666699 969696 003366 339966 003300 333300 993300 993366 333399 333333').split(' ');

interface Hsl { h: number; s: number; l: number }

function hexToHsl(hex: string): Hsl {
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

// Resolve an Excel <fgColor>/<bgColor> element to HSL, applying theme + tint.
function colorOf(el: XNode | null, theme: (string | null)[]): Hsl | null {
  if (!el) return null;
  const a = el.attrs;
  let hex: string | null = null;
  if (a.rgb) hex = a.rgb.slice(-6);
  else if (a.theme != null) hex = theme[+a.theme] || null;
  else if (a.indexed != null) hex = INDEXED[+a.indexed] || null;
  if (!hex || !/^[0-9a-f]{6}$/i.test(hex)) return null;
  const hsl = hexToHsl(hex);
  const tint = parseFloat(a.tint || '0');
  if (tint < 0) hsl.l = hsl.l * (1 + tint);
  else if (tint > 0) hsl.l = hsl.l * (1 - tint) + tint;
  return hsl;
}

const isLightBlue = (c: Hsl | null) => !!c && c.h >= 175 && c.h <= 255 && c.s >= 0.2 && c.l >= 0.6 && c.l <= 0.97;

function readTheme(text: string | null): (string | null)[] {
  if (!text) return [];
  const scheme = first(parseXml(text), 'clrScheme');
  if (!scheme) return [];
  const byName: Record<string, string> = {};
  elements(scheme).forEach((c) => {
    const v = elements(c)[0];
    if (v) byName[c.name] = v.name === 'srgbClr' ? v.attrs.val : v.attrs.lastClr;
  });
  // Excel's theme index order swaps the first two pairs relative to the XML order.
  return ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink']
    .map((k) => byName[k] || null);
}

// For each cellXfs index: does that style have a light-blue fill?
function readStyleFills(text: string | null, theme: (string | null)[]): boolean[] {
  if (!text) return [];
  const doc = parseXml(text);
  const fillsEl = first(doc, 'fills');
  const fills = fillsEl ? elements(fillsEl).map((f) => {
    const pf = first(f, 'patternFill');
    if (!pf) return false;
    const type = pf.attrs.patternType;
    if (type && type !== 'solid') return false;
    return isLightBlue(colorOf(first(pf, 'fgColor') || first(pf, 'bgColor'), theme));
  }) : [];
  const xfsEl = first(doc, 'cellXfs');
  return xfsEl ? elements(xfsEl).map((xf) => !!fills[+(xf.attrs.fillId || 0)]) : [];
}

/* ---------- sheets ---------- */

const colIndex = (letters: string) => letters.split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
const splitRef = (ref?: string) => {
  const m = /^([A-Z]+)(\d+)$/i.exec(ref || '');
  return m ? { c: colIndex(m[1].toUpperCase()), r: +m[2] } : null;
};

export interface Sheet { name: string; rows: SheetRow[] }

export function parseXlsx(bytes: Uint8Array): Sheet[] {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error("This doesn't look like an .xlsx file.");
  }
  const lower: Record<string, Uint8Array> = {};
  Object.keys(files).forEach((k) => { lower[k.replace(/^\//, '').toLowerCase()] = files[k]; });
  const text = (path: string) => {
    const f = lower[path.replace(/^\//, '').toLowerCase()];
    return f ? strFromU8(f) : null;
  };
  const readRels = (path: string) => {
    const map: Record<string, string> = {};
    const t = text(path);
    if (t) all(parseXml(t), 'Relationship').forEach((r) => { map[r.attrs.Id] = r.attrs.Target; });
    return map;
  };

  const wbText = text('xl/workbook.xml');
  if (!wbText) throw new Error("Couldn't find a workbook inside this file.");
  const wb = parseXml(wbText);
  const wbRels = readRels('xl/_rels/workbook.xml.rels');
  const theme = readTheme(text('xl/theme/theme1.xml'));
  const blueStyles = readStyleFills(text('xl/styles.xml'), theme);

  const ssText = text('xl/sharedStrings.xml');
  const shared = ssText ? all(parseXml(ssText), 'si').map((si) => {
    // Skip phonetic runs (rPh); concatenate every other <t>.
    const parts: string[] = [];
    const walk = (n: XNode) => n.children.forEach((c) => {
      if (c.name === 'rPh') return;
      if (c.name === 't') parts.push(textContent(c));
      else walk(c);
    });
    walk(si);
    return unescapeX(parts.join(''));
  }) : [];

  const sheets: Sheet[] = [];
  for (const sh of all(wb, 'sheet')) {
    if (sh.attrs.state === 'hidden' || sh.attrs.state === 'veryHidden') continue;
    const target = wbRels[relId(sh) || ''];
    if (!target) continue;
    const path = resolvePath('xl/workbook.xml', target);
    const st = text(path);
    if (!st) continue;
    const doc = parseXml(st);
    const sheetRels = readRels(path.replace(/([^/]+)$/, '_rels/$1.rels'));

    // Hyperlinks can cover single cells or ranges.
    const links: Record<string, string> = {};
    all(doc, 'hyperlink').forEach((h) => {
      const url = sheetRels[relId(h) || ''];
      if (!url) return;
      const [a, b] = (h.attrs.ref || '').split(':');
      const s = splitRef(a), e = splitRef(b || a);
      if (!s || !e) return;
      for (let row = s.r; row <= e.r; row++) for (let c = s.c; c <= e.c; c++) links[`${row}:${c}`] = url;
    });

    const rows: SheetRow[] = [];
    all(doc, 'row').forEach((rowEl) => {
      const rowNum = +rowEl.attrs.r || rows.length + 1;
      const rowBlue = rowEl.attrs.customFormat === '1' && !!blueStyles[+(rowEl.attrs.s || 0)];
      const cells: SheetCell[] = [];
      let nextCol = 0;
      rowEl.children.filter((c) => c.name === 'c').forEach((c) => {
        const pos = splitRef(c.attrs.r);
        const col = pos ? pos.c : nextCol;
        nextCol = col + 1;
        const t = c.attrs.t;
        const vEl = first(c, 'v');
        let value = '';
        if (t === 's') value = shared[+(vEl ? textContent(vEl) : -1)] || '';
        else if (t === 'inlineStr') value = all(c, 't').map(textContent).join('');
        else if (vEl) value = textContent(vEl);
        if (t === 'b') value = value === '1' ? 'TRUE' : 'FALSE';
        let link: string | null = links[`${rowNum}:${col}`] || null;
        const f = first(c, 'f');
        if (f) {
          const m = /HYPERLINK\(\s*"([^"]+)"\s*(?:[,;]\s*"([^"]*)")?/i.exec(textContent(f));
          if (m) {
            link = link || m[1];
            if (!value && m[2]) value = m[2]; // formula saved without a cached value
          }
        }
        cells[col] = { text: unescapeX(value), link, blue: !!blueStyles[+(c.attrs.s || 0)] };
      });
      rows.push({ cells, rowBlue });
    });
    sheets.push({ name: sh.attrs.name, rows });
  }
  return sheets;
}
