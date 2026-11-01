/* HTML documents that run inside the reader WebView. Top/bottom padding leaves room for the reader's bars. They talk to the app with JSON messages:
   page -> app: ready | progress | tap | link | next | prev | error
   app -> page: window.__cmd({ type: 'settings' | 'scrollTo' | 'chunk' | 'open', ... })
   EPUB fonts: the page's <style id="ff"> holds @font-face rules for the chosen bundled font (see reader-fonts.ts). */

export type ReaderTheme = 'paper' | 'sepia' | 'night';
export type ReaderFont = 'classic' | 'literata' | 'lora' | 'garamond' | 'atkinson' | 'nunito';
export interface ReaderSettings { size: number; margin: number; lineHeight: number; theme: ReaderTheme; zoom: number; font: ReaderFont }
export const DEFAULT_READER: ReaderSettings = { size: 19, margin: 22, lineHeight: 1.6, theme: 'paper', zoom: 1, font: 'classic' };

export const READER_FONTS: { k: ReaderFont; label: string; note: string }[] = [
  { k: 'classic', label: 'Classic', note: "Your phone's serif" },
  { k: 'literata', label: 'Literata', note: 'Made for e-books' },
  { k: 'lora', label: 'Lora', note: 'Soft, rounded serif' },
  { k: 'garamond', label: 'Garamond', note: 'Old-book feel' },
  { k: 'atkinson', label: 'Atkinson', note: 'Extra legible sans' },
  { k: 'nunito', label: 'Nunito', note: 'Cozy rounded sans' },
];

export const LINE_SPACINGS = [
  { k: 1.3, label: 'Snug' },
  { k: 1.6, label: 'Cozy' },
  { k: 1.9, label: 'Airy' },
  { k: 2.2, label: 'Roomy' },
];

export const readerFontFamily = (f: ReaderFont) => `Reader-${f}`;

export const READER_THEMES: Record<ReaderTheme, { bg: string; ink: string; muted: string; link: string; chrome: string; dark: boolean }> = {
  paper: { bg: '#fffdf8', ink: '#2b2b3a', muted: '#8a8aa6', link: '#d94b97', chrome: '#ffffff', dark: false },
  sepia: { bg: '#f4ecd8', ink: '#5b4636', muted: '#9a8468', link: '#b0487a', chrome: '#efe4cc', dark: false },
  night: { bg: '#1c1f3d', ink: '#e6e3ff', muted: '#9a97c6', link: '#ff93cc', chrome: '#26284a', dark: true },
};

// Serif stack: Georgia/Charter on iOS, Noto Serif on Android, whatever serif the platform has elsewhere.
const SERIF = `Georgia, Charter, 'Iowan Old Style', 'Noto Serif', 'Droid Serif', 'Times New Roman', serif`;

const SANS = `'Noto Sans', Roboto, 'Helvetica Neue', Arial, sans-serif`;
const fontStack = (f: ReaderFont) => (f === 'classic' ? SERIF : `"${readerFontFamily(f)}", ${f === 'atkinson' || f === 'nunito' ? SANS : SERIF}`);

const json = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

// Shared messaging glue: works in react-native-webview and in an <iframe> (web build).
const BRIDGE = `
  function post(msg) {
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else parent.postMessage(JSON.stringify(Object.assign({ __reader: true }, msg)), '*');
  }
  window.addEventListener('message', function (e) {
    try { var c = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; if (c && c.__reader && window.__cmd) window.__cmd(c); } catch (err) {}
  });
  window.onerror = function (m) { post({ type: 'error', message: String(m) }); };
  function frac() { var max = document.documentElement.scrollHeight - innerHeight; return max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0; }
  function toFrac(f) { var max = document.documentElement.scrollHeight - innerHeight; scrollTo(0, Math.round(max * f)); }
`;

function themeVars(s: ReaderSettings) {
  const t = READER_THEMES[s.theme];
  return { '--size': `${s.size}px`, '--margin': `${s.margin}px`, '--lh': String(s.lineHeight), '--font': fontStack(s.font || 'classic'), '--bg': t.bg, '--ink': t.ink, '--muted': t.muted, '--link': t.link };
}

export function epubChapterDoc(body: string, s: ReaderSettings, opts: { label: string; start: { frac?: number; frag?: string }; hasPrev: boolean; hasNext: boolean; fontCss: string }) {
  const vars = Object.entries(themeVars(s)).map(([k, v]) => `${k}:${v}`).join(';');
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style id="ff">${opts.fontCss}</style>
<style>
:root{${vars}}
html{background:var(--bg);-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{margin:0;padding:76px var(--margin) 84px;background:var(--bg);color:var(--ink);font-family:var(--font);font-size:var(--size);line-height:var(--lh);overflow-wrap:break-word;hyphens:auto;-webkit-hyphens:auto}
#book *{font-family:inherit!important;color:inherit;background:transparent!important;line-height:inherit;max-width:100%}
#book p{margin:0 0 .9em}
#book [id]{scroll-margin-top:72px}
#book h1,#book h2,#book h3,#book h4{line-height:1.25;margin:1.4em 0 .7em;font-weight:700}
#book h1{font-size:1.5em}#book h2{font-size:1.3em}#book h3{font-size:1.12em}
#book img,#book svg{max-width:100%;height:auto}
#book a{color:var(--link)}
#book hr{border:0;border-top:1px solid var(--muted);opacity:.5;margin:2em auto;width:40%}
#book blockquote{margin:1em 0;padding-left:1em;border-left:3px solid var(--link)}
#book table{border-collapse:collapse}#book td,#book th{border:1px solid var(--muted);padding:4px 6px}
.end{display:flex;gap:12px;justify-content:center;margin:48px 0 24px;font-family:var(--font)}
.end button{font:inherit;font-size:16px;color:var(--ink);background:transparent;border:1.5px solid var(--muted);border-radius:999px;padding:10px 18px}
.end .next{border-color:var(--link);color:var(--link);font-weight:700}
</style></head><body><div id="book">${body}</div>
<div class="end">${opts.hasPrev ? '<button class="prev" data-go="prev">‹ Previous</button>' : ''}${opts.hasNext ? '<button class="next" data-go="next">Next chapter ›</button>' : '<span style="color:var(--muted)">The end ♡</span>'}</div>
<script>
${BRIDGE}
var start = ${json(opts.start)};
// Resolves once the faces in use have loaded, so positions are measured with the final font.
function fontsReady() { return document.fonts ? document.fonts.ready : Promise.resolve(); }
function applySettings(v, fontCss) {
  var f = frac(), r = document.documentElement.style;
  if (typeof fontCss === 'string') document.getElementById('ff').textContent = fontCss;
  Object.keys(v).forEach(function (k) { r.setProperty(k, v[k]); });
  requestAnimationFrame(function () { toFrac(f); fontsReady().then(function () { toFrac(f); }); });
}
window.__cmd = function (c) {
  if (c.type === 'settings') applySettings(c.vars, c.fontCss);
  if (c.type === 'scrollTo') { var el = c.frag && document.getElementById(c.frag); if (el) el.scrollIntoView(); else toFrac(c.frac || 0); }
};
document.addEventListener('click', function (e) {
  var go = e.target.closest('[data-go]'); if (go) { post({ type: go.getAttribute('data-go') }); return; }
  var a = e.target.closest('a[href]'); if (a) { e.preventDefault(); post({ type: 'link', href: a.getAttribute('href') }); return; }
  post({ type: 'tap' });
});
var t = 0;
addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(function () { post({ type: 'progress', frac: frac() }); }, 250); }, { passive: true });
function restore() {
  var el = start.frag && document.getElementById(start.frag);
  if (el) el.scrollIntoView(); else if (start.frac) toFrac(start.frac);
  post({ type: 'ready', frac: frac() });
}
function begin() { fontsReady().then(restore); }
if (document.readyState === 'complete') begin(); else addEventListener('load', begin);
</script></body></html>`;
}

/* PDF: pdf.js (bundled with the app) renders pages lazily into canvases. The PDF bytes arrive
   afterwards as base64 chunks via __cmd({type:'chunk'}) then __cmd({type:'open'}). */
export function pdfDoc(lib: { pdf: string; worker: string }, s: ReaderSettings, start: { frac?: number }) {
  const t = READER_THEMES[s.theme];
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>
html,body{margin:0;background:${t.bg};color:${t.ink};font-family:${SERIF}}
#pages{width:calc(100% * var(--zoom, ${s.zoom}));padding:64px 0 76px;box-sizing:border-box}
.page{position:relative;margin:0 auto 12px;width:calc(100% - 16px);background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.18)}
.page canvas{display:block;width:100%;height:100%}
.night .page canvas{filter:invert(.9) hue-rotate(180deg)}
.sepia .page canvas{filter:sepia(.35) brightness(.98)}
.num{position:absolute;bottom:-1px;right:6px;font-size:11px;color:#999}
#msg{padding:40px 24px;text-align:center;color:${t.muted}}
</style></head><body class="${s.theme}"><div id="msg">Opening PDF…</div><div id="pages"></div>
<script>
${BRIDGE}
var LIB = ${json(lib.pdf)};
var WORKER = ${json(lib.worker)};
var start = ${json(start)};
var chunks = [], pdf = null, pages = [], rendered = new Map(), zoom = ${s.zoom};
var lastPage = 0;
function b64ToBytes(b64) { var bin = atob(b64), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
async function open() {
  try {
    var lib = await import(URL.createObjectURL(new Blob([LIB], { type: 'text/javascript' })));
    lib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([WORKER], { type: 'text/javascript' }));
    pdf = await lib.getDocument({ data: b64ToBytes(chunks.join('')), isEvalSupported: false, useSystemFonts: true }).promise;
    chunks = [];
    var first = await pdf.getPage(1), vp = first.getViewport({ scale: 1 });
    var holder = document.getElementById('pages');
    for (var n = 1; n <= pdf.numPages; n++) {
      var d = document.createElement('div'); d.className = 'page'; d.dataset.n = n;
      d.style.aspectRatio = vp.width + ' / ' + vp.height;
      d.innerHTML = '<span class="num">' + n + '</span>';
      holder.appendChild(d); pages.push(d); io.observe(d);
    }
    document.getElementById('msg').remove();
    requestAnimationFrame(function () { if (start.frac) toFrac(start.frac); report(); post({ type: 'ready', pages: pdf.numPages }); });
  } catch (e) { document.getElementById('msg').textContent = "Couldn't open this PDF."; post({ type: 'error', message: String(e && e.message || e) }); }
}
async function render(div) {
  var n = +div.dataset.n; if (rendered.has(n)) return;
  rendered.set(n, true);
  var page = await pdf.getPage(n);
  var w = div.clientWidth, base = page.getViewport({ scale: 1 });
  var vp = page.getViewport({ scale: (w / base.width) * Math.min(devicePixelRatio || 1, 2.5) });
  var c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
  await page.render({ canvas: c, canvasContext: c.getContext('2d'), viewport: vp }).promise;
  if (rendered.has(n)) { var old = div.querySelector('canvas'); if (old) old.remove(); div.prepend(c); }
  // Keep memory bounded: drop canvases far from the current page.
  rendered.forEach(function (_, k) { if (Math.abs(k - lastPage) > 6) { rendered.delete(k); var cv = pages[k - 1].querySelector('canvas'); if (cv) cv.remove(); } });
}
var io = new IntersectionObserver(function (entries) { entries.forEach(function (e) { if (e.isIntersecting) render(e.target); }); }, { rootMargin: '150% 0px' });
function report() {
  var mid = innerHeight / 2, cur = 1;
  for (var i = 0; i < pages.length; i++) { var r = pages[i].getBoundingClientRect(); if (r.top <= mid) cur = i + 1; else break; }
  lastPage = cur;
  post({ type: 'progress', frac: frac(), page: cur, pages: pages.length });
}
var t = 0;
addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(report, 200); }, { passive: true });
document.addEventListener('click', function () { post({ type: 'tap' }); });
window.__cmd = function (c) {
  if (c.type === 'chunk') chunks.push(c.data);
  if (c.type === 'open') open();
  if (c.type === 'settings') {
    document.body.className = c.theme; document.documentElement.style.background = c.bg; document.body.style.background = c.bg;
    if (c.zoom !== zoom) {
      var f = frac(); zoom = c.zoom; document.getElementById('pages').style.setProperty('--zoom', zoom);
      rendered.forEach(function (_, k) { var cv = pages[k - 1].querySelector('canvas'); if (cv) cv.remove(); });
      rendered.clear();
      requestAnimationFrame(function () { toFrac(f); pages.forEach(function (p) { var r = p.getBoundingClientRect(); if (r.bottom > -innerHeight && r.top < innerHeight * 2) render(p); }); });
    }
  }
};
post({ type: 'ready-for-data' });
</script></body></html>`;
}

export function epubSettingsCmd(s: ReaderSettings, fontCss?: string) {
  return { type: 'settings', vars: themeVars(s), ...(fontCss != null ? { fontCss } : {}) };
}
export function pdfSettingsCmd(s: ReaderSettings) {
  return { type: 'settings', theme: s.theme, bg: READER_THEMES[s.theme].bg, zoom: s.zoom };
}
