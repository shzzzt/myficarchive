/* In-app reader for uploaded EPUB (book fonts, adjustable) and PDF files. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { useFonts } from 'expo-font';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bookExists, readBookBase64, readBookBytes } from '@/lib/books';
import { parseEpub, tocLabelFor, type Epub } from '@/lib/epub';
import {
  DEFAULT_READER, epubChapterDoc, epubSettingsCmd, LINE_SPACINGS, pdfDoc, pdfSettingsCmd, READER_FONTS, READER_THEMES,
  type ReaderFont, type ReaderSettings, type ReaderTheme,
} from '@/lib/reader-html';
import { PREVIEW_FONTS, readerFontCss } from '@/lib/reader-fonts';
import { loadPdfJs } from '@/lib/pdfjs-source';
import { goBack } from '@/state/actions';
import { useFeedback } from '@/state/feedback';
import { getProgress, setProgress, type ReadingProgress } from '@/state/kv';
import { useLibrary } from '@/state/library';
import { Empty, Segmented } from '@/ui/common';
import { Icon } from '@/ui/Icon';
import { Pill, Txt } from '@/ui/kit';
import { ReaderFrame, type ReaderFrameHandle, type ReaderMessage } from '@/ui/ReaderFrame';
import { Sheet, SheetHeading } from '@/ui/Sheet';
import { useTheme } from '@/ui/theme';

const CHUNK = 256 * 1024;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default function Reader() {
  const { id, file } = useLocalSearchParams<{ id: string; file: string }>();
  const insets = useSafeAreaInsets();
  const { byId, ui, setUI, patch } = useLibrary();
  const { toast } = useFeedback();
  const fic = byId.get(String(id));
  const book = fic?.files.find((b) => b.id === file);
  const bookId = book?.id ?? '';

  const s: ReaderSettings = useMemo(() => ({ ...DEFAULT_READER, ...ui.reader }), [ui.reader]);
  const look = READER_THEMES[s.theme];
  const frame = useRef<ReaderFrameHandle>(null);
  const pdfData = useRef<string | null>(null);
  const markedReading = useRef(false);
  // @font-face CSS for the font the page currently has.
  const fontRef = useRef<{ font: ReaderFont; css: string }>({ font: 'classic', css: '' });

  const [status, setStatus] = useState<{ kind: 'loading' | 'ready' | 'error'; message?: string }>({ kind: 'loading' });
  const [epub, setEpub] = useState<Epub | null>(null);
  const [html, setHtml] = useState('');
  const [chapter, setChapter] = useState(0);
  const [prog, setProg] = useState<ReadingProgress>(() => getProgress(String(file)) || { chapter: 0, frac: 0, at: 0 });
  const [chrome, setChrome] = useState(true);
  const [sheet, setSheet] = useState<'settings' | 'toc' | null>(null);

  const progRef = useRef(prog);
  const save = useCallback((p: Partial<ReadingProgress>) => {
    const next = { ...progRef.current, ...p, at: Date.now() };
    progRef.current = next;
    setProg(next);
    if (bookId) setProgress(bookId, next);
  }, [bookId]);

  const openChapter = useCallback((book: Epub, index: number, start: { frac?: number; frag?: string }, settings: ReaderSettings) => {
    const i = clamp(index, 0, book.chapters.length - 1);
    setChapter(i);
    setHtml(epubChapterDoc(book.chapterHtml(i), settings, {
      label: tocLabelFor(book, i), start, hasPrev: i > 0, hasNext: i < book.chapters.length - 1, fontCss: fontRef.current.css,
    }));
    save({ chapter: i, chapters: book.chapters.length, frac: start.frac ?? 0 });
  }, [save]);

  // Load the book once.
  useEffect(() => {
    if (!book) return;
    let cancelled = false;
    const start = getProgress(book.id);
    (async () => {
      try {
        if (!(await bookExists(book))) throw new Error('missing');
        if (book.kind === 'epub') {
          const settings = { ...DEFAULT_READER, ...ui.reader };
          // If a font can't load, the page falls back to the built-in serif.
          const [parsed, css] = await Promise.all([readBookBytes(book).then(parseEpub), readerFontCss(settings.font).catch(() => '')]);
          if (cancelled) return;
          fontRef.current = { font: settings.font, css };
          setEpub(parsed);
          openChapter(parsed, start?.chapter ?? 0, { frac: start?.frac ?? 0 }, settings);
        } else {
          const [lib, data] = await Promise.all([loadPdfJs(), readBookBase64(book)]);
          if (cancelled) return;
          pdfData.current = data;
          setHtml(pdfDoc(lib, { ...DEFAULT_READER, ...ui.reader }, { frac: start?.frac ?? 0 }));
        }
        setStatus({ kind: 'ready' });
      } catch (e) {
        if (cancelled) return;
        const missing = e instanceof Error && e.message === 'missing';
        setStatus({ kind: 'error', message: missing ? "This file isn't on this phone any more. Upload it again from the fic's page." : (e instanceof Error ? e.message : "Couldn't open this file.") });
      }
    })();
    return () => { cancelled = true; };
    // Settings are read once for the first page; later changes are pushed live below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  // Push setting changes into the open page without reloading it. A new font is loaded first, then sent with its CSS.
  useEffect(() => {
    if (status.kind !== 'ready' || !book) return;
    if (book.kind !== 'epub') { frame.current?.send(pdfSettingsCmd(s)); return; }
    if (s.font === fontRef.current.font) { frame.current?.send(epubSettingsCmd(s)); return; }
    let live = true;
    readerFontCss(s.font).catch(() => '').then((css) => {
      if (!live) return;
      fontRef.current = { font: s.font, css };
      frame.current?.send(epubSettingsCmd(s, css));
    });
    return () => { live = false; };
  }, [s, status.kind, book]);

  // Each font's name in the settings sheet is drawn in that font.
  const [previewsLoaded] = useFonts(PREVIEW_FONTS);

  // Starting a fic in the app moves it from Want to Read to Reading.
  const markReading = useCallback(() => {
    if (markedReading.current || !fic || fic.status !== 'want') return;
    markedReading.current = true;
    patch(fic.id, { status: 'reading' }).then(() => toast('Marked as Reading ♡')).catch(() => {});
  }, [fic, patch, toast]);

  const onMessage = useCallback((m: ReaderMessage) => {
    switch (m.type) {
      case 'ready-for-data': {
        const data = pdfData.current;
        if (!data) return;
        for (let i = 0; i < data.length; i += CHUNK) frame.current?.send({ type: 'chunk', data: data.slice(i, i + CHUNK) });
        frame.current?.send({ type: 'open' });
        break;
      }
      case 'ready':
        markReading();
        if (typeof m.pages === 'number') save({ pages: m.pages });
        break;
      case 'progress':
        save({ frac: Number(m.frac) || 0, ...(typeof m.page === 'number' ? { page: m.page, pages: Number(m.pages) } : {}) });
        break;
      case 'tap':
        setChrome((c) => !c);
        break;
      case 'next':
      case 'prev':
        if (epub) openChapter(epub, chapter + (m.type === 'next' ? 1 : -1), { frac: 0 }, s);
        break;
      case 'link': {
        if (!epub) return;
        const r = epub.resolve(chapter, String(m.href));
        if (!r) return;
        if ('external' in r) Linking.openURL(r.external).catch(() => toast("Couldn't open that link"));
        else if (r.index === chapter) frame.current?.send({ type: 'scrollTo', frag: r.frag });
        else openChapter(epub, r.index, { frag: r.frag }, s);
        break;
      }
      case 'error':
        console.warn('reader:', m.message);
        break;
    }
  }, [epub, chapter, s, openChapter, save, markReading, toast]);

  const setReader = (p: Partial<ReaderSettings>) => setUI({ reader: { ...s, ...p } });

  if (!fic || !book) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 60, backgroundColor: look.bg }}>
        <Empty icon="🫧" title="File not found" text="It may have been removed from this fic.">
          <Pill kind="pink" label="Back" onPress={goBack} />
        </Empty>
      </View>
    );
  }

  const isEpub = book.kind === 'epub';
  const pct = Math.round((prog.frac || 0) * 100);
  const where = isEpub
    ? epub ? `${chapter + 1} / ${epub.chapters.length} · ${pct}%` : ''
    : prog.page ? `Page ${prog.page} of ${prog.pages ?? '…'}` : '';
  const title = isEpub && epub ? tocLabelFor(epub, chapter) : fic.title;

  return (
    <View style={{ flex: 1, backgroundColor: look.bg, paddingTop: insets.top }}>
      <StatusBar style={look.dark ? 'light' : 'dark'} />
      {status.kind === 'ready' && html ? (
        <ReaderFrame ref={frame} html={html} bg={look.bg} onMessage={onMessage} />
      ) : status.kind === 'error' ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Empty icon="📖" title="Can't open this book" text={status.message || ''}>
            <Pill kind="pink" label="Back" onPress={goBack} />
          </Empty>
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ActivityIndicator color={look.link} />
          <Txt v="pixel" size={14} color={look.muted}>Opening {book.name}…</Txt>
        </View>
      )}

      {chrome ? (
        <>
          <View style={[barStyle(look.chrome, look.muted), { top: insets.top, borderBottomWidth: 1 }]}>
            <BarButton icon="back" label="Back" color={look.ink} onPress={goBack} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt v="bold" size={14} color={look.ink} numberOfLines={1}>{title}</Txt>
              <Txt v="pixel" size={11} color={look.muted} numberOfLines={1}>{fic.title} · {fic.author}</Txt>
            </View>
            {isEpub && epub ? <BarButton icon="list" label="Table of contents" color={look.ink} onPress={() => setSheet('toc')} /> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Reading settings" onPress={() => setSheet('settings')} hitSlop={8}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Txt v="display" size={13} color={look.ink}>Aa</Txt>
            </Pressable>
          </View>
          <View style={[barStyle(look.chrome, look.muted), { bottom: 0, paddingBottom: insets.bottom, borderTopWidth: 1 }]}>
            {isEpub ? <BarButton icon="back" label="Previous chapter" color={chapter > 0 ? look.ink : look.muted}
              onPress={() => epub && chapter > 0 && openChapter(epub, chapter - 1, { frac: 0 }, s)} /> : <View style={{ width: 44 }} />}
            <Txt v="pixel" size={13} color={look.muted} style={{ flex: 1, textAlign: 'center' }}>{where}</Txt>
            {isEpub ? <BarButton icon="next" label="Next chapter" color={epub && chapter < epub.chapters.length - 1 ? look.ink : look.muted}
              onPress={() => epub && chapter < epub.chapters.length - 1 && openChapter(epub, chapter + 1, { frac: 0 }, s)} /> : <View style={{ width: 44 }} />}
          </View>
        </>
      ) : null}

      <Sheet visible={sheet === 'settings'} onClose={() => setSheet(null)} title="Reading settings" maxHeight={0.6} see
        footer={<Pill kind="pink" icon="check" label="Done" style={{ flex: 1 }} onPress={() => setSheet(null)} />}>
        {isEpub ? (
          <>
            <SheetHeading>Font</SheetHeading>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingVertical: 4 }} accessibilityRole="radiogroup">
              {READER_FONTS.map((f) => (
                <FontCard key={f.k} label={f.label} note={f.note} on={s.font === f.k}
                  family={f.k === 'classic' ? CLASSIC_SERIF : previewsLoaded ? `ReaderPreview_${f.k}` : undefined}
                  onPress={() => setReader({ font: f.k })} />
              ))}
            </ScrollView>

            <SheetHeading>Line spacing</SheetHeading>
            <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
              {LINE_SPACINGS.map((o) => (
                <SpacingOption key={o.k} label={o.label} spacing={o.k} on={Math.abs(s.lineHeight - o.k) < 0.05} onPress={() => setReader({ lineHeight: o.k })} />
              ))}
            </View>
            <Stepper label="Fine-tune spacing" value={s.lineHeight.toFixed(1)} onMinus={() => setReader({ lineHeight: clamp(+(s.lineHeight - 0.1).toFixed(1), 1.2, 2.4) })} onPlus={() => setReader({ lineHeight: clamp(+(s.lineHeight + 0.1).toFixed(1), 1.2, 2.4) })} />

            <SheetHeading>Size & margins</SheetHeading>
            <Stepper label="Text size" value={`${s.size}px`} onMinus={() => setReader({ size: clamp(s.size - 1, 13, 34) })} onPlus={() => setReader({ size: clamp(s.size + 1, 13, 34) })} />
            <Stepper label="Margins" value={`${s.margin}px`} onMinus={() => setReader({ margin: clamp(s.margin - 4, 6, 60) })} onPlus={() => setReader({ margin: clamp(s.margin + 4, 6, 60) })} />
          </>
        ) : (
          <Stepper label="Zoom" value={`${Math.round(s.zoom * 100)}%`} onMinus={() => setReader({ zoom: clamp(s.zoom - 0.25, 1, 3) })} onPlus={() => setReader({ zoom: clamp(s.zoom + 0.25, 1, 3) })} />
        )}
        <SheetHeading>Page color</SheetHeading>
        <Segmented
          options={[{ k: 'paper', label: 'Paper' }, { k: 'sepia', label: 'Sepia' }, { k: 'night', label: 'Night' }]}
          value={s.theme}
          onChange={(k) => setReader({ theme: k as ReaderTheme })}
        />
        {isEpub ? <Pill label="Reset to defaults" size="sm" style={{ marginTop: 18, alignSelf: 'flex-start' }} onPress={() => setReader({ size: DEFAULT_READER.size, margin: DEFAULT_READER.margin, lineHeight: DEFAULT_READER.lineHeight, font: DEFAULT_READER.font })} /> : null}
      </Sheet>

      <Sheet visible={sheet === 'toc'} onClose={() => setSheet(null)} title="Contents">
        {epub?.toc.map((e, i) => {
          const on = e.index === chapter && !e.frag;
          return (
            <TocRow key={i} label={e.label} depth={e.depth} on={on}
              onPress={() => { setSheet(null); openChapter(epub, e.index, e.frag ? { frag: e.frag } : { frac: 0 }, s); }} />
          );
        })}
      </Sheet>
    </View>
  );
}

const barStyle = (bg: string, border: string) => ({
  position: 'absolute' as const, left: 0, right: 0, minHeight: 52, paddingHorizontal: 6,
  flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: bg, borderColor: border + '55',
});

function BarButton({ icon, label, color, onPress }: { icon: 'back' | 'next' | 'list'; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}
      style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}>
      <Icon name={icon} size={24} color={color} />
    </Pressable>
  );
}

const CLASSIC_SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' });

function FontCard({ label, note, family, on, onPress }: { label: string; note: string; family?: string; on: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${label} font. ${note}`} onPress={onPress}
      style={({ pressed }) => ({
        width: 138, minHeight: 72, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center',
        borderWidth: 1.5, borderColor: on ? t.pinkDeep : t.softLine, backgroundColor: on ? t.pinkSoft : pressed ? t.field : t.card,
        boxShadow: on ? t.btnShadow : undefined,
      })}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Txt size={24} color={on ? t.pinkDeep : t.ink} style={{ fontFamily: family, lineHeight: 32 }}>Aa</Txt>
        <Txt size={17} color={t.ink} style={{ fontFamily: family, lineHeight: 24, flexShrink: 1 }} numberOfLines={1}>{label}</Txt>
      </View>
      <Txt v="pixel" size={11} color={t.muted} numberOfLines={1}>{note}</Txt>
    </Pressable>
  );
}

/* Preset with a little picture of three lines at that spacing. */
function SpacingOption({ label, spacing, on, onPress }: { label: string; spacing: number; on: boolean; onPress: () => void }) {
  const t = useTheme();
  const gap = Math.round((spacing - 1) * 9);
  const color = on ? t.pinkDeep : t.muted;
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${label} line spacing`} onPress={onPress}
      style={({ pressed }) => ({
        flex: 1, height: 66, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 6,
        borderWidth: 1.5, borderColor: on ? t.pinkDeep : t.softLine, backgroundColor: on ? t.pinkSoft : pressed ? t.field : t.card,
        boxShadow: on ? t.btnShadow : undefined,
      })}>
      <View style={{ width: 30, height: 26, justifyContent: 'center', gap }}>
        {[1, 0.8, 1].map((w, i) => <View key={i} style={{ height: 3, width: `${w * 100}%`, borderRadius: 2, backgroundColor: color }} />)}
      </View>
      <Txt v="pixel" size={12} color={on ? t.pinkDeep : t.ink2}>{label}</Txt>
    </Pressable>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  const t = useTheme();
  const btn = (text: string, onPress: () => void, a11y: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress}
      style={({ pressed }) => ({ width: 48, height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: t.line, backgroundColor: pressed ? t.lavSoft : t.card, alignItems: 'center', justifyContent: 'center' })}>
      <Txt v="heavy" size={20}>{text}</Txt>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }} accessibilityLabel={`${label}: ${value}`}>
      <Txt v="bold" size={15} style={{ flex: 1 }}>{label}</Txt>
      {btn('−', onMinus, `Decrease ${label.toLowerCase()}`)}
      <Txt v="display" size={11} style={{ minWidth: 64, textAlign: 'center' }}>{value}</Txt>
      {btn('+', onPlus, `Increase ${label.toLowerCase()}`)}
    </View>
  );
}

function TocRow({ label, depth, on, onPress }: { label: string; depth: number; on: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 46, justifyContent: 'center', paddingVertical: 8, paddingRight: 12, paddingLeft: 12 + depth * 18,
        borderRadius: 12, backgroundColor: on ? t.lavSoft : pressed ? t.field : 'transparent',
      })}>
      <Txt v={on ? 'heavy' : 'semi'} size={15} color={on ? t.pinkDeep : t.ink}>{label}</Txt>
    </Pressable>
  );
}
