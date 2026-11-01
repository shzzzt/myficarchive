/// <reference types="node" />
/* Checks the importers and backup round-trip in Node: npm run test:import */
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';
import { backupCsv, backupJson, draftsToFics, parseImportFile, planRestore } from '../src/lib/backup';
import { normalizeFic, parseWords, fmtWords } from '../src/lib/fic';

const bytes = new Uint8Array(readFileSync(join(__dirname, 'fixtures', 'sample.xlsx')));
const parsed = parseImportFile('sample.xlsx', bytes);
assert.equal(parsed.kind, 'sheet');
if (parsed.kind !== 'sheet') throw new Error('unreachable');

const byTitle = Object.fromEntries(parsed.drafts.map((d) => [d.title, d]));
assert.deepEqual(Object.keys(byTitle), ['Euphoria', 'Moonlit Hours', 'Ongoing WIP', 'Tinted Blue', 'Formula Fic']);
assert.equal(parsed.skipped, 2, 'two note rows skipped');
assert.equal(byTitle['Euphoria'].links[0].url, 'https://drive.google.com/file/d/xyz/view');
assert.equal(byTitle['Euphoria'].summary, 'Jimin moves in next door.\nJungkook is not okay.');
assert.equal(byTitle['Moonlit Hours'].links[0].type, 'AO3');
assert.equal(byTitle['Moonlit Hours'].ao3, 'https://archiveofourown.org/works/123');
assert.equal(byTitle['Moonlit Hours'].ficStatus, 'Completed', 'pink fill is not ongoing');
assert.equal(byTitle['Ongoing WIP'].ficStatus, 'Ongoing', 'rgb light blue');
assert.equal(byTitle['Tinted Blue'].ficStatus, 'Ongoing', 'theme color + tint');
assert.equal(byTitle['Formula Fic'].links[0].url, 'https://drive.google.com/file/d/abc/view');

const fics = draftsToFics(parsed.drafts);
assert.ok(fics.every((f) => f.status === 'want'));
assert.ok(fics[0].addedAt > fics[1].addedAt, 'top row is newest');

// Backups round-trip without loss.
fics[0] = normalizeFic({ ...fics[0], rating: 4.5, favorite: true, tags: ['angst', 'soulmate au'], thoughts: 'line 1\n\n"quoted", line 3', finishedAt: '2026-09-12', status: 'finished' });
const enc = (s: string) => new TextEncoder().encode(s);
for (const [name, text] of [['b.json', backupJson(fics)], ['b.csv', backupCsv(fics)]] as const) {
  const back = parseImportFile(name, enc(text));
  assert.equal(back.kind, 'backup', name);
  if (back.kind === 'backup') assert.deepEqual(back.fics, fics, `${name} round-trip`);
}

const plan = planRestore(fics, fics.slice(0, 2));
assert.equal(plan.isNew, 3);
assert.equal(plan.newer, 0);

assert.equal(parseWords('31k'), 31000);
assert.equal(parseWords('22,000 words'), 22000);
assert.equal(fmtWords('1.2m'), '1.2M');
assert.equal(fmtWords('52000'), '52k');

// The import template (scripts/make-template.py): every column maps to a fic field, the guide tab is ignored.
const read = (f: string) => new Uint8Array(readFileSync(join(__dirname, '..', f)));
const empty = parseImportFile('t.xlsx', read('assets/templates/my-fic-archive-template.xlsx'));
assert.equal(empty.kind, 'sheet');
if (empty.kind === 'sheet') assert.equal(empty.drafts.length, 0, 'empty template imports nothing');

const filled = parseImportFile('t.xlsx', read('scripts/fixtures/template-filled.xlsx'));
if (filled.kind !== 'sheet') throw new Error('template should parse as a sheet');
assert.equal(filled.skipped, 0);
const [eu, moon, bare] = draftsToFics(filled.drafts);
assert.deepEqual(filled.drafts.map((d) => d.title), ['Euphoria', 'Moonlit Hours', 'Just a title']);
assert.equal(eu.author, 'peachyjams');
assert.equal(eu.words, '31k');
assert.equal(eu.status, 'finished');
assert.equal(eu.rating, 4.5);
assert.equal(eu.favorite, true);
assert.deepEqual(eu.tags, ['angst', 'soulmate au']);
assert.deepEqual(eu.links, [{ type: 'File', url: 'https://drive.google.com/file/d/xyz/view' }], 'title hyperlink');
assert.equal(eu.ao3, 'https://archiveofourown.org/works/111');
assert.equal(eu.summary, 'Jimin moves in next door.\nJungkook is not okay.');
assert.equal(eu.thoughts, 'cried twice ♡');
assert.equal(eu.startedAt, '2026-08-30', 'excel date serial');
assert.equal(eu.finishedAt, '2026-09-12');
assert.equal(eu.ficStatus, 'Completed');
assert.equal(moon.ficStatus, 'Ongoing');
assert.equal(moon.status, 'reading');
assert.equal(moon.rating, 3.5, 'star characters');
assert.equal(moon.favorite, false);
assert.equal(moon.words, '180000');
assert.deepEqual(moon.tags, ['slow burn', 'fluff']);
assert.deepEqual(moon.links, [
  { type: 'EPUB', url: 'https://drive.google.com/file/d/epub1' },
  { type: 'PDF', url: 'https://drive.google.com/file/d/pdf1' },
]);
assert.equal(moon.startedAt, '2026-10-02', 'typed text date');
assert.equal(bare.status, 'want', 'no status -> Want to Read');
assert.equal(bare.rating, 0);
assert.equal(bare.ficStatus, 'Completed', 'no Fic status, no fill -> Completed');

console.log(`ok: ${parsed.drafts.length} fics parsed, template maps every column, backups round-trip`);
