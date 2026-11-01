/* Fic model and pure helpers (no React Native imports, so it can be tested in Node). */

export type StatusKey = 'want' | 'reading' | 'finished' | 'hold' | 'dnf';
export type LinkType = 'EPUB' | 'PDF' | 'AO3' | 'File';
export type FicStatus = 'Completed' | 'Ongoing';

export interface FicLink { type: LinkType; url: string }

/* An EPUB/PDF uploaded into the app. The bytes live on the device; this is just the record. */
export interface BookFile { id: string; name: string; kind: 'epub' | 'pdf'; size: number; addedAt: string }

export interface Fic {
  id: string;
  title: string;
  author: string;
  links: FicLink[];
  files: BookFile[];
  ao3: string;
  words: string;
  summary: string;
  thoughts: string;
  ficStatus: FicStatus;
  status: StatusKey;
  rating: number;
  tags: string[];
  favorite: boolean;
  addedAt: string;
  startedAt: string;
  finishedAt: string;
  updatedAt: string;
}

export const STATUSES: { k: StatusKey; label: string }[] = [
  { k: 'want', label: 'Want to Read' },
  { k: 'reading', label: 'Reading' },
  { k: 'finished', label: 'Finished' },
  { k: 'hold', label: 'On Hold' },
  { k: 'dnf', label: 'DNF' },
];
export const LINK_TYPES: LinkType[] = ['EPUB', 'PDF', 'AO3', 'File'];

export const statusLabel = (k: string) => (STATUSES.find((s) => s.k === k) || STATUSES[0]).label;
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const str = (v: unknown) => (v == null ? '' : String(v));

export function uid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && c.randomUUID) return c.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function statusKey(v: unknown): StatusKey {
  const s = str(v).toLowerCase().replace(/[^a-z]/g, '');
  if (!s) return 'want';
  const direct = STATUSES.find((x) => x.k === s);
  if (direct) return direct.k;
  if (s.startsWith('want') || s === 'tbr' || s === 'toread') return 'want';
  if (s.startsWith('read') && s !== 'read') return 'reading';
  if (s.startsWith('finish') || s === 'read' || s === 'done' || s === 'completed') return 'finished';
  if (s.includes('hold') || s === 'paused') return 'hold';
  if (s.includes('dnf') || s.includes('didnotfinish') || s === 'dropped') return 'dnf';
  return 'want';
}

export function normalizeUrl(u: unknown): string {
  const s = str(u).trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(s)) return 'https://' + s;
  return '';
}

export function guessLinkType(url: string): LinkType {
  const u = url.toLowerCase();
  if (u.includes('archiveofourown.org') || u.includes('ao3.org')) return 'AO3';
  if (/\.pdf(\?|$)/.test(u)) return 'PDF';
  if (/\.epub(\?|$)/.test(u)) return 'EPUB';
  return 'File';
}

// "31k", "180,000", "1.2m words" -> number; null if unknown.
export function parseWords(v: unknown): number | null {
  const s = str(v).toLowerCase().replace(/,/g, '').replace(/words?/g, '').replace(/\s+/g, '').replace(/\+$/, '');
  const m = /^~?(\d+(?:\.\d+)?)(k|m)?$/.exec(s);
  if (!m) return null;
  return Math.round(parseFloat(m[1]) * (m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : 1));
}
export function compact(n: number): string {
  if (n >= 1e6) return `${+(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${+(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k`;
  return String(n);
}
export function fmtWords(v: unknown): string {
  const n = parseWords(v);
  return n == null ? str(v).trim() : compact(n);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Formatting by hand keeps output identical across Hermes/JSC locales.
export function fmtDate(v: string, withYear = true): string {
  if (!v) return '';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T00:00:00') : new Date(v);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ' ' + d.getFullYear() : ''}`;
}

export const validDay = (v: unknown): string => {
  const s = str(v).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime()) ? s : '';
};
const validIso = (v: unknown): string => {
  if (!v) return '';
  const d = new Date(str(v));
  return isNaN(d.getTime()) ? '' : d.toISOString();
};
export const clampRating = (v: unknown): number => {
  const n = Math.round(parseFloat(str(v)) * 2) / 2;
  return isNaN(n) ? 0 : Math.max(0, Math.min(5, n));
};
export function normTags(v: unknown): string[] {
  const arr = Array.isArray(v) ? v : str(v).split(/[;,\n]/);
  const seen = new Set<string>();
  return arr.map((t) => str(t).trim().replace(/^#/, '')).filter((t) => {
    const k = t.toLowerCase();
    if (!t || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function hashHue(s: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (const ch of s.toLowerCase()) { h ^= ch.codePointAt(0) || 0; h = Math.imul(h, 16777619); }
  return Math.abs(h) % 360;
}

export type FicInput = Partial<Omit<Fic, 'links' | 'files' | 'tags' | 'rating' | 'favorite'>> & {
  links?: { type?: string; url?: string }[];
  files?: unknown;
  tags?: string[] | string;
  rating?: number | string;
  favorite?: boolean | string;
  [k: string]: unknown;
};

function normalizeFiles(v: unknown): BookFile[] {
  let arr: unknown = v;
  if (typeof v === 'string') {
    try { arr = v.trim() ? JSON.parse(v) : []; } catch { arr = []; }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object' && !!(f as { id?: unknown }).id)
    .map((f) => ({
      id: str(f.id),
      name: str(f.name) || 'book',
      kind: f.kind === 'pdf' ? 'pdf' as const : 'epub' as const,
      size: Number(f.size) || 0,
      addedAt: validIso(f.addedAt) || new Date().toISOString(),
    }));
}

export function normalizeFic(r: FicInput, keepId = true): Fic {
  const now = new Date().toISOString();
  const links = (Array.isArray(r.links) ? r.links : [])
    .map((l) => ({
      type: (LINK_TYPES as string[]).includes(str(l && l.type)) ? (l.type as LinkType) : 'File' as LinkType,
      url: normalizeUrl(l && l.url),
    }))
    .filter((l) => l.url);
  return {
    id: keepId && r.id ? String(r.id) : uid(),
    title: str(r.title).trim(),
    author: str(r.author).trim() || 'Anonymous',
    links,
    files: normalizeFiles(r.files),
    ao3: normalizeUrl(r.ao3),
    words: str(r.words).trim(),
    summary: str(r.summary).replace(/\r\n?/g, '\n').trim(),
    thoughts: str(r.thoughts).replace(/\r\n?/g, '\n'),
    ficStatus: /ongoing|wip|progress/i.test(str(r.ficStatus)) ? 'Ongoing' : 'Completed',
    status: statusKey(r.status),
    rating: clampRating(r.rating),
    tags: normTags(r.tags),
    favorite: r.favorite === true || /^(true|yes|1|♥)$/i.test(str(r.favorite).trim()),
    addedAt: validIso(r.addedAt) || now,
    startedAt: validDay(r.startedAt),
    finishedAt: validDay(r.finishedAt),
    updatedAt: validIso(r.updatedAt) || now,
  };
}

/* ---------- filtering & sorting ---------- */

export type SortKey = 'added' | 'title' | 'author' | 'rating' | 'words' | 'finished';
export const SORTS: { k: SortKey; label: string; dir: 'asc' | 'desc' }[] = [
  { k: 'added', label: 'Date added', dir: 'desc' },
  { k: 'title', label: 'Title', dir: 'asc' },
  { k: 'author', label: 'Author', dir: 'asc' },
  { k: 'rating', label: 'Rating', dir: 'desc' },
  { k: 'words', label: 'Word count', dir: 'desc' },
  { k: 'finished', label: 'Date finished', dir: 'desc' },
];
export const RATING_FILTERS = [
  { k: 'any', label: 'Any' }, { k: '3', label: '3★+' }, { k: '4', label: '4★+' },
  { k: '4.5', label: '4.5★+' }, { k: '5', label: '5★' }, { k: 'unrated', label: 'Unrated' },
];

export interface Filters {
  statuses: StatusKey[];
  rating: string;
  fav: boolean;
  fic: 'all' | FicStatus;
  tags: string[];
  author: string;
}
export const EMPTY_FILTERS: Filters = { statuses: [], rating: 'any', fav: false, fic: 'all', tags: [], author: '' };

export const activeFilterCount = (f: Filters) =>
  f.statuses.length + (f.rating !== 'any' ? 1 : 0) + (f.fav ? 1 : 0) + (f.fic !== 'all' ? 1 : 0) + f.tags.length + (f.author ? 1 : 0);

const hayCache = new WeakMap<Fic, string>();
function haystack(f: Fic) {
  let h = hayCache.get(f);
  if (!h) {
    h = [f.title, f.author, f.summary, f.thoughts, f.tags.join(' ')].join('\n').toLowerCase();
    hayCache.set(f, h);
  }
  return h;
}

export function filterAndSort(fics: Fic[], f: Filters, q: string, sort: SortKey, dir: 'asc' | 'desc'): Fic[] {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  const statuses = new Set(f.statuses);
  const tags = f.tags.map((t) => t.toLowerCase());
  const minRating = f.rating === 'any' || f.rating === 'unrated' ? null : +f.rating;

  const list = fics.filter((x) => {
    if (statuses.size && !statuses.has(x.status)) return false;
    if (f.fav && !x.favorite) return false;
    if (f.fic !== 'all' && x.ficStatus !== f.fic) return false;
    if (f.rating === 'unrated' && x.rating) return false;
    if (minRating != null && x.rating < minRating) return false;
    if (f.author && x.author.toLowerCase() !== f.author.toLowerCase()) return false;
    if (tags.length && !x.tags.some((t) => tags.includes(t.toLowerCase()))) return false;
    if (tokens.length) {
      const h = haystack(x);
      if (!tokens.every((t) => h.includes(t))) return false;
    }
    return true;
  });

  const coll = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
  const sign = dir === 'asc' ? 1 : -1;
  const key: (x: Fic) => string | number | null = {
    added: (x: Fic) => x.addedAt,
    title: (x: Fic) => x.title,
    author: (x: Fic) => x.author,
    rating: (x: Fic) => x.rating,
    words: (x: Fic) => parseWords(x.words),
    finished: (x: Fic) => x.finishedAt || null,
  }[sort] || ((x: Fic) => x.addedAt);
  return list.sort((a, b) => {
    const ka = key(a), kb = key(b);
    // Missing values always sink to the bottom regardless of direction.
    if (ka == null && kb == null) return coll.compare(a.title, b.title);
    if (ka == null) return 1;
    if (kb == null) return -1;
    const c = typeof ka === 'number' ? ka - (kb as number) : coll.compare(ka, kb as string);
    return c ? c * sign : coll.compare(a.title, b.title);
  });
}

export function tagCounts(fics: Fic[]) {
  const counts = new Map<string, { name: string; n: number }>();
  fics.forEach((f) => f.tags.forEach((t) => {
    const k = t.toLowerCase();
    const cur = counts.get(k);
    counts.set(k, { name: cur ? cur.name : t, n: (cur ? cur.n : 0) + 1 });
  }));
  return [...counts.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
}

export function groupAuthors(fics: Fic[]) {
  const m = new Map<string, { name: string; fics: Fic[] }>();
  fics.forEach((f) => {
    const k = f.author.toLowerCase();
    const cur = m.get(k) || { name: f.author, fics: [] };
    cur.fics.push(f);
    m.set(k, cur);
  });
  return [...m.values()];
}

export const dupKey = (f: { title: string; author: string }) => `${f.title.trim().toLowerCase()}|${f.author.trim().toLowerCase()}`;
