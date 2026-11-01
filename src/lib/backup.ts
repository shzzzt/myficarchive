/* Backup formats (JSON + CSV) and turning imported files into fics. Pure: no React Native imports. */
import { dupKey, normalizeFic, statusLabel, type Fic, type FicInput } from './fic';
import { parseCsv, toCsv } from './importers/csv';
import { rowsToFics, type FicDraft, type SheetRow } from './importers/rows';
import { parseXlsx } from './importers/xlsx';
import { strFromU8 } from 'fflate';

export const CSV_COLS = ['id', 'title', 'author', 'words', 'ficStatus', 'status', 'rating', 'favorite', 'tags', 'links', 'ao3', 'summary', 'thoughts', 'addedAt', 'startedAt', 'finishedAt', 'updatedAt', 'files'] as const;

export function backupJson(fics: Fic[]): string {
  return JSON.stringify({ app: 'my-fic-archive', version: 1, exportedAt: new Date().toISOString(), fics }, null, 2);
}

export function backupCsv(fics: Fic[]): string {
  const rows = [[...CSV_COLS], ...fics.map((f) => CSV_COLS.map((c) => {
    if (c === 'tags') return f.tags.join('; ');
    if (c === 'links') return f.links.map((l) => `${l.type}: ${l.url}`).join('\n');
    if (c === 'status') return statusLabel(f.status);
    // Uploaded books are listed (not embedded) so a restore on the same phone keeps them attached.
    if (c === 'files') return f.files.length ? JSON.stringify(f.files) : '';
    return f[c];
  }))];
  return '﻿' + toCsv(rows);
}

export const isBackupCsv = (rows: string[][]) => {
  const h = (rows[0] || []).map((x) => x.trim().toLowerCase());
  return h.includes('id') && h.includes('addedat') && h.includes('title');
};

export function backupRowsToFics(rows: string[][]): Fic[] {
  const head = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((c) => c.trim())).map((r) => {
    const o: Record<string, unknown> = {};
    head.forEach((h, i) => { o[h] = r[i] || ''; });
    o.links = String(o.links || '').split('\n').map((line) => {
      const m = /^\s*(\w+):\s*(\S+)\s*$/.exec(line);
      return m ? { type: m[1].toUpperCase(), url: m[2] } : null;
    }).filter(Boolean);
    return normalizeFic(o as FicInput);
  }).filter((f) => f.title);
}

export type ParsedFile =
  | { kind: 'sheet'; drafts: FicDraft[]; skipped: number; sheets: number }
  | { kind: 'backup'; fics: Fic[] };

// Accepts .xlsx, generic .csv, backup .csv or backup .json.
export function parseImportFile(name: string, bytes: Uint8Array): ParsedFile {
  const lower = name.toLowerCase();
  const asText = () => strFromU8(bytes);
  if (lower.endsWith('.xlsx') || lower.endsWith('.xlsm')) {
    const sheets = parseXlsx(bytes);
    // Each sheet may have its own header row, so map them separately.
    const parsed = sheets.map((s) => rowsToFics(s.rows));
    return { kind: 'sheet', drafts: parsed.flatMap((p) => p.fics), skipped: parsed.reduce((s, p) => s + p.skipped, 0), sheets: sheets.length };
  }
  if (lower.endsWith('.json')) {
    let data: unknown;
    try { data = JSON.parse(asText()); } catch { throw new Error("That file isn't valid JSON."); }
    const list = Array.isArray(data) ? data : (data as { fics?: unknown }).fics;
    if (!Array.isArray(list)) throw new Error("That JSON isn't a Fic Archive backup.");
    return { kind: 'backup', fics: list.map((r) => normalizeFic(r as FicInput)).filter((f) => f.title) };
  }
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    const csv = parseCsv(asText());
    if (isBackupCsv(csv)) return { kind: 'backup', fics: backupRowsToFics(csv) };
    const rows: SheetRow[] = csv.map((r) => ({ cells: r.map((text) => ({ text, link: null, blue: false })), rowBlue: false }));
    const { fics, skipped } = rowsToFics(rows);
    return { kind: 'sheet', drafts: fics, skipped, sheets: 1 };
  }
  throw new Error('Please choose an .xlsx, .csv or .json file.');
}

// Splits spreadsheet drafts into new fics vs. ones already in the library.
export function planSheetImport(drafts: FicDraft[], existing: Fic[]) {
  const have = new Set(existing.map(dupKey));
  const seen = new Set<string>();
  const fresh: FicDraft[] = [];
  let dups = 0;
  drafts.forEach((d) => {
    const k = dupKey(d);
    if (have.has(k) || seen.has(k)) { dups++; return; }
    seen.add(k);
    fresh.push(d);
  });
  return { fresh, dups };
}

export function draftsToFics(fresh: FicDraft[]): Fic[] {
  const base = Date.now();
  // Stagger timestamps so the default "newest first" sort shows the sheet's top row first.
  return fresh.map((d, i) => normalizeFic({ ...d, status: 'want', addedAt: new Date(base - i).toISOString() }, false));
}

export function planRestore(backup: Fic[], current: Fic[]) {
  const byId = new Map(current.map((f) => [f.id, f]));
  const isNew = backup.filter((f) => !byId.has(f.id)).length;
  const changed = backup.filter((f) => !byId.has(f.id) || f.updatedAt > byId.get(f.id)!.updatedAt);
  return { isNew, newer: changed.length - isNew, changed };
}
