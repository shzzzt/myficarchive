/* Builds a small AO3-style EPUB for tests (and writes one to disk when run directly). */
import { strToU8, zipSync } from 'fflate';

// 1x1 pink PNG.
const PNG = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 248, 207, 240, 31, 0, 5, 0, 1, 255, 137, 153, 61, 29, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);

const para = (n: number, words: string) => Array.from({ length: n }, (_, i) => `<p>${words} (${i + 1})</p>`).join('\n');

export function buildSampleEpub({ nav = true } = {}): Uint8Array {
  const chapter = (title: string, body: string) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>${title}</title><link rel="stylesheet" type="text/css" href="../style.css"/><style>p{font-family:Comic Sans MS}</style></head>
<body><h2>${title}</h2>${body}</body></html>`;
  return zipSync({
    mimetype: strToU8('application/epub+zip'),
    'META-INF/container.xml': strToU8(`<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`),
    'OEBPS/content.opf': strToU8(`<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Euphoria &amp; Other Stories</dc:title><dc:creator>peachyjams</dc:creator></metadata>
  <manifest>
    ${nav ? '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>' : ''}
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
    <item id="img" href="images/cover.png" media-type="image/png"/>
    <item id="p" href="text/preface.xhtml" media-type="application/xhtml+xml"/>
    <item id="c1" href="text/chapter%201.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="text/chapter2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx"><itemref idref="p"/><itemref idref="c1"/><itemref idref="c2"/></spine>
</package>`),
    'OEBPS/nav.xhtml': strToU8(`<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body>
<nav epub:type="toc"><ol><li><a href="text/preface.xhtml">Preface</a></li><li><a href="text/chapter%201.xhtml">1. Moving&nbsp;In</a>
<ol><li><a href="text/chapter%201.xhtml#scene2">Scene two</a></li></ol></li><li><a href="text/chapter2.xhtml">2. The Ending</a></li></ol></nav></body></html>`),
    'OEBPS/toc.ncx': strToU8(`<?xml version="1.0"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/"><navMap>
<navPoint id="a"><navLabel><text>Preface (ncx)</text></navLabel><content src="text/preface.xhtml"/></navPoint>
<navPoint id="b"><navLabel><text>Chapter One (ncx)</text></navLabel><content src="text/chapter%201.xhtml"/></navPoint>
<navPoint id="c"><navLabel><text>Chapter Two (ncx)</text></navLabel><content src="text/chapter2.xhtml"/></navPoint></navMap></ncx>`),
    'OEBPS/style.css': strToU8('body { font-family: Arial; }'),
    'OEBPS/images/cover.png': PNG,
    'OEBPS/text/preface.xhtml': strToU8(chapter('Preface', `<p><img src="../images/cover.png" alt="cover"/></p><p>Posted originally on the <a href="https://archiveofourown.org/">Archive of Our Own</a>. Skip to <a href="chapter2.xhtml#end">the end</a>.</p>`)),
    'OEBPS/text/chapter 1.xhtml': strToU8(chapter('1. Moving In', `<a id="top"/>${para(30, 'Jimin moves in next door and Jungkook is <em>not</em> okay.')}<h3 id="scene2">Scene two</h3>${para(30, 'They share a balcony. It is a problem.')}<script>alert(1)</script>`)),
    'OEBPS/text/chapter2.xhtml': strToU8(chapter('2. The Ending', `${para(25, 'The ending made me cry twice.')}<p id="end">The end. ♡</p>`)),
  });
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('node:fs').writeFileSync(process.argv[2] || 'sample.epub', buildSampleEpub());
  console.log('wrote', process.argv[2] || 'sample.epub');
}
