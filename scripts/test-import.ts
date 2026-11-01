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

console.log(`ok: ${parsed.drafts.length} fics parsed, backups round-trip`);
