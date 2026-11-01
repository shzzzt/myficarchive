/* Sheet rows -> fic drafts. Skips blank rows, header rows and note rows.
   Columns are found by header text, so they can be in any order; see the template in assets/templates. */
import { guessLinkType, normalizeUrl, statusKey, type FicLink, type FicStatus, type StatusKey } from '../fic';

export interface SheetCell { text: string; link: string | null; blue: boolean }
export interface SheetRow { cells: (SheetCell | undefined)[]; rowBlue: boolean }

export interface FicDraft {
  title: string;
  author: string;
  words: string;
  summary: string;
  links: FicLink[];
  ao3: string;
  ficStatus: FicStatus;
  status?: StatusKey;
  rating?: number;
  favorite?: boolean;
  tags?: string[];
  thoughts?: string;
  startedAt?: string;
  finishedAt?: string;
}

type Key =
  | 'ao3' | 'epub' | 'pdf' | 'ficStatus' | 'status' | 'rating' | 'favorite' | 'tags' | 'thoughts'
  | 'started' | 'finished' | 'author' | 'title' | 'words' | 'summary' | 'link';
type Cols = Partial<Record<Key, number>>;

// Checked in order, so the specific headers ("AO3 link", "Fic status") win over the loose ones ("link", "title").
const HEADERS: [Key, RegExp][] = [
  ['ao3', /ao3|archiveofourown/],
  ['epub', /epub/],
  ['pdf', /pdf/],
  ['ficStatus', /ficstatus|completion|complete|ongoing|wip/],
  ['status', /readingstatus|readstatus|^status$|shelf/],
  ['rating', /rating|stars|score/],
  ['favorite', /fav|heart|loved/],
  ['tags', /tag/],
  ['thoughts', /thought|review|notes?$|comment/],
  ['started', /start/],
  ['finished', /finish|ended|dateread/],
  ['author', /author|writer|creator/],
  ['title', /title|fic(name)?$|name$/],
  ['words', /word/],
  ['summary', /summary|description|desc|blurb/],
  ['link', /link|url|file|drive/],
];

const norm = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function findColumns(cells: SheetRow['cells']): Cols | null {
  const map: Cols = {};
  cells.forEach((cell, i) => {
    const h = norm(cell && cell.text);
    if (!h) return;
    const hit = HEADERS.find(([k, re]) => map[k] == null && re.test(h));
    if (hit) map[hit[0]] = i;
  });
  return map.author != null && map.title != null ? map : null;
}

const isHeaderRow = (cells: SheetRow['cells']) => {
  const texts = cells.map((c) => norm(c && c.text));
  return texts.some((t) => /^author/.test(t)) && texts.some((t) => /^title/.test(t));
};

/* Excel keeps dates as day counts since 1899-12-30; typed text dates are parsed too. */
export function sheetDate(v: string): string {
  const s = v.trim();
  if (!s) return '';
  let d: Date | null = null;
  if (/^\d{5}(\.\d+)?$/.test(s)) d = new Date(Date.UTC(1899, 11, 30) + Math.floor(+s) * 86400000);
  else if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) {
    const [y, m, day] = s.split(/[-T ]/).map(Number);
    d = new Date(Date.UTC(y, m - 1, day));
  } else {
    const t = Date.parse(s);
    if (!Number.isNaN(t)) { const l = new Date(t); d = new Date(Date.UTC(l.getFullYear(), l.getMonth(), l.getDate())); }
  }
  return d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';
}

/* "4.5", "4,5", "★★★★½", "4/5" -> 0..5 in half steps. */
export function sheetRating(v: string): number {
  const s = v.trim();
  if (!s) return 0;
  const stars = (s.match(/[★⭐]/g) || []).length;
  const n = stars ? stars + (/½/.test(s) ? 0.5 : 0) : parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? Math.min(5, Math.max(0, Math.round(n * 2) / 2)) : 0;
}

const YES = /^(y|yes|true|1|x|✓|✔|♥|❤|♡|💜|💗)/i;

export function rowsToFics(rows: SheetRow[]): { fics: FicDraft[]; skipped: number } {
  let cols: Cols | null = null;
  for (let i = 0; i < Math.min(rows.length, 15) && !cols; i++) cols = findColumns(rows[i].cells);
  const c: Cols = cols || { author: 0, title: 1, words: 2, summary: 3 };

  const out: FicDraft[] = [];
  let skipped = 0;
  rows.forEach(({ cells, rowBlue }) => {
    const at = (i?: number) => (i != null ? cells[i] : undefined);
    const get = (i?: number) => (at(i)?.text || '').trim();
    // A hyperlinked cell wins over its text, so "Read here" style links still work.
    const url = (i?: number) => normalizeUrl(at(i)?.link || get(i));
    const filled = cells.filter((x) => x && x.text && x.text.trim()).length;
    if (!filled || isHeaderRow(cells)) return;
    const title = get(c.title);
    const author = get(c.author);
    // A real fic row has a title plus at least one other field; notes are usually a lone cell.
    if (!title || filled < 2 || title.length > 300) { skipped++; return; }

    const links: FicLink[] = [];
    const add = (u: string, type?: FicLink['type']) => { if (u && !links.some((l) => l.url === u)) links.push({ type: type || guessLinkType(u), url: u }); };
    add(normalizeUrl(at(c.title)?.link));
    add(url(c.epub), 'EPUB');
    add(url(c.pdf), 'PDF');
    add(url(c.link));
    const ao3 = url(c.ao3) || links.find((l) => l.type === 'AO3')?.url || '';

    const ficText = get(c.ficStatus);
    const ongoing = ficText
      ? /ongoing|wip|progress|updating/i.test(ficText)
      : rowBlue || [c.author, c.title, c.words, c.summary].some((i) => !!at(i)?.blue);

    const draft: FicDraft = {
      title,
      author: author || 'Anonymous',
      words: get(c.words),
      summary: get(c.summary),
      links,
      ao3,
      ficStatus: ongoing ? 'Ongoing' : 'Completed',
    };
    if (get(c.status)) draft.status = statusKey(get(c.status));
    if (get(c.rating)) draft.rating = sheetRating(get(c.rating));
    if (get(c.favorite)) draft.favorite = YES.test(get(c.favorite));
    if (get(c.tags)) draft.tags = get(c.tags).split(/[,;\n]+/).map((t) => t.replace(/^#/, '').trim()).filter(Boolean);
    if (get(c.thoughts)) draft.thoughts = get(c.thoughts);
    if (get(c.started)) draft.startedAt = sheetDate(get(c.started));
    if (get(c.finished)) draft.finishedAt = sheetDate(get(c.finished));
    out.push(draft);
  });
  return { fics: out, skipped };
}

/* Instruction tabs in a workbook (like the template's "How to use") aren't fic lists. */
export const isGuideSheet = (name: string) => /^(how to|guide|instructions?|read ?me|help|about|lists?)\b/i.test(name.trim());
