/* Sheet rows -> fic drafts. Skips blank rows, header rows and note rows. */
import { guessLinkType, type FicLink, type FicStatus } from '../fic';

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
}

type Cols = { author?: number; title?: number; words?: number; summary?: number; link?: number };

const norm = (s?: string) => (s || '').toLowerCase().replace(/[^a-z]/g, '');

function findColumns(cells: SheetRow['cells']): Cols | null {
  const map: Cols = {};
  cells.forEach((cell, i) => {
    const h = norm(cell && cell.text);
    if (!h) return;
    if (map.author == null && /author|writer|creator/.test(h)) map.author = i;
    else if (map.title == null && /title|fic(name)?$|name$/.test(h)) map.title = i;
    else if (map.words == null && /word/.test(h)) map.words = i;
    else if (map.summary == null && /summary|description|desc|blurb/.test(h)) map.summary = i;
    else if (map.link == null && /link|url|file|drive/.test(h)) map.link = i;
  });
  return map.author != null && map.title != null ? map : null;
}

const isHeaderRow = (cells: SheetRow['cells']) => {
  const texts = cells.map((c) => norm(c && c.text));
  return texts.some((t) => /^author/.test(t)) && texts.some((t) => /^title/.test(t));
};

export function rowsToFics(rows: SheetRow[]): { fics: FicDraft[]; skipped: number } {
  let cols: Cols | null = null;
  for (let i = 0; i < Math.min(rows.length, 15) && !cols; i++) cols = findColumns(rows[i].cells);
  const c: Cols = cols || { author: 0, title: 1, words: 2, summary: 3 };

  const out: FicDraft[] = [];
  let skipped = 0;
  rows.forEach(({ cells, rowBlue }) => {
    const at = (i?: number) => (i != null ? cells[i] : undefined);
    const get = (i?: number) => (at(i)?.text || '').trim();
    const filled = cells.filter((x) => x && x.text && x.text.trim()).length;
    if (!filled || isHeaderRow(cells)) return;
    const title = get(c.title);
    const author = get(c.author);
    // A real fic row has a title plus at least one other field; notes are usually a lone cell.
    if (!title || filled < 2 || title.length > 300) { skipped++; return; }

    const linkCell = at(c.link);
    const url = at(c.title)?.link || (linkCell && (linkCell.link || linkCell.text.trim())) || '';
    const links: FicLink[] = /^https?:\/\//i.test(url) ? [{ type: guessLinkType(url), url }] : [];
    const ongoing = rowBlue || [c.author, c.title, c.words, c.summary].some((i) => !!at(i)?.blue);

    out.push({
      title,
      author: author || 'Anonymous',
      words: get(c.words),
      summary: get(c.summary),
      links,
      ao3: links[0] && links[0].type === 'AO3' ? links[0].url : '',
      ficStatus: ongoing ? 'Ongoing' : 'Completed',
    });
  });
  return { fics: out, skipped };
}
