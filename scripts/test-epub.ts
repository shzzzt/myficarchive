/// <reference types="node" />
/* Checks the EPUB parser in Node: npm run test:epub */
import { strict as assert } from 'node:assert';
import { parseEpub, tocLabelFor } from '../src/lib/epub';
import { buildSampleEpub } from './fixtures/make-epub';

const book = parseEpub(buildSampleEpub());
assert.equal(book.title, 'Euphoria & Other Stories');
assert.equal(book.author, 'peachyjams');
assert.deepEqual(book.chapters, ['OEBPS/text/preface.xhtml', 'OEBPS/text/chapter 1.xhtml', 'OEBPS/text/chapter2.xhtml']);

// EPUB 3 nav wins over NCX, keeps nesting, and decodes %20 paths and &nbsp;.
assert.deepEqual(book.toc.map((e) => [e.label, e.index, e.frag, e.depth]), [
  ['Preface', 0, '', 0], ['1. Moving In', 1, '', 0], ['Scene two', 1, 'scene2', 1], ['2. The Ending', 2, '', 0],
]);
assert.equal(tocLabelFor(book, 1), '1. Moving In');

const pre = book.chapterHtml(0);
assert.ok(/<img src="data:image\/png;base64,iVBORw0KGgo/.test(pre), 'image inlined as data URI');
assert.ok(!/<style|<link/i.test(pre), 'book styles dropped');

const ch1 = book.chapterHtml(1);
assert.ok(ch1.includes('<a id="top"></a>'), 'self-closing <a/> expanded so it does not swallow the chapter');
assert.ok(!ch1.includes('<script'), 'scripts removed');
assert.ok(ch1.includes('<em>not</em>'));

assert.deepEqual(book.resolve(0, 'chapter2.xhtml#end'), { index: 2, frag: 'end' });
assert.deepEqual(book.resolve(1, '#scene2'), { index: 1, frag: 'scene2' });
assert.deepEqual(book.resolve(0, 'https://archiveofourown.org/'), { external: 'https://archiveofourown.org/' });

// EPUB 2 books (no nav document) fall back to the NCX.
const old = parseEpub(buildSampleEpub({ nav: false }));
assert.deepEqual(old.toc.map((e) => e.label), ['Preface (ncx)', 'Chapter One (ncx)', 'Chapter Two (ncx)']);

assert.throws(() => parseEpub(new Uint8Array([1, 2, 3])), /readable EPUB/);
console.log(`ok: ${book.chapters.length} chapters, ${book.toc.length} toc entries`);
