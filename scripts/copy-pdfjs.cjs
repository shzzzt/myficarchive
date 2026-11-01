// Copies the pdf.js legacy build into assets/ so the PDF reader works offline.
// Run after changing the pdfjs-dist version: npm run copy:pdfjs
const fs = require('node:fs');
const path = require('node:path');

const src = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'legacy', 'build');
const out = path.join(__dirname, '..', 'assets', 'pdfjs');
fs.mkdirSync(out, { recursive: true });
// .txt so Metro ships them as plain assets instead of bundling them as code.
for (const name of ['pdf.min.mjs', 'pdf.worker.min.mjs']) {
  fs.copyFileSync(path.join(src, name), path.join(out, `${name}.txt`));
}
console.log('pdf.js', require('pdfjs-dist/package.json').version, 'copied to assets/pdfjs');
