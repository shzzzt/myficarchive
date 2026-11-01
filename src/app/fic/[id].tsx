import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deleteBook, pickAndStoreBook } from '@/lib/books';
import { fmtDate, fmtWords, type BookFile, type Fic } from '@/lib/fic';
import { goBack, useFicActions } from '@/state/actions';
import { useFeedback } from '@/state/feedback';
import { clearProgress, getJSON, removeKey, setJSON, thoughtsKey, useProgress } from '@/state/kv';
import { useLibrary } from '@/state/library';
import { Empty, StatusPicker } from '@/ui/common';
import { DateField } from '@/ui/DateField';
import { Cover, Sky } from '@/ui/decor';
import { tap } from '@/ui/haptics';
import { Avatar, Badge, Card, Chip, Gloss, IconButton, Input, Pill, SectionTitle, StatusBadge, Txt, glossText } from '@/ui/kit';
import { Icon } from '@/ui/Icon';
import { Stars } from '@/ui/Stars';
import { useTheme } from '@/ui/theme';

export default function FicDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { byId, patch, setUI, ui } = useLibrary();
  const { toast, confirm } = useFeedback();
  const { toggleFav, openUrl, remove } = useFicActions();
  const f = byId.get(String(id));

  if (!f) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 60 }}>
        <Sky />
        <Empty icon="🫧" title="Fic not found" text="It may have been deleted.">
          <Pill kind="pink" label="Back to library" onPress={() => router.replace('/')} />
        </Empty>
      </View>
    );
  }

  const update = async (p: Partial<Fic>, done?: string) => {
    try {
      const { note } = await patch(f.id, p);
      if (note || done) toast(note || done!);
    } catch {
      toast("Couldn't save. Your change wasn't stored.");
    }
  };

  const upload = async () => {
    try {
      const book = await pickAndStoreBook();
      if (!book) return;
      try {
        await patch(f.id, { files: [...f.files, book] });
      } catch (e) {
        await deleteBook(book);
        throw e;
      }
      toast(`${book.kind.toUpperCase()} added ♡ Tap Read to start`);
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Couldn't add that file");
    }
  };

  const removeBook = async (b: BookFile) => {
    const ok = await confirm({
      title: 'Remove this file?',
      message: `“${b.name}” will be deleted from this phone. The fic and your notes stay.`,
      ok: 'Remove',
      danger: true,
    });
    if (!ok) return;
    try {
      await patch(f.id, { files: f.files.filter((x) => x.id !== b.id) });
      await deleteBook(b);
      clearProgress(b.id);
      toast('File removed');
    } catch {
      toast("Couldn't remove the file");
    }
  };

  const words = fmtWords(f.words);
  const links = [...f.links];
  if (f.ao3 && !links.some((l) => l.url === f.ao3)) links.push({ type: 'AO3', url: f.ao3 });

  return (
    <View style={{ flex: 1 }}>
      <Sky />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <Cover seed={f.title} seed2={f.author}>
          <Pill size="sm" kind="blue" icon="back" label="BACK" onPress={goBack} />
          <Pill size="sm" kind="pink" icon="edit" label="Edit" onPress={() => router.push({ pathname: '/edit/[id]', params: { id: f.id } })} />
        </Cover>

        <Card outer={{ marginHorizontal: 16, marginTop: -44 }} style={{ paddingHorizontal: 18, paddingBottom: 20 }}>
          <View style={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}>
            <IconButton
              icon="heart"
              label={f.favorite ? 'Remove from favorites' : 'Add to favorites'}
              color={f.favorite ? t.pinkDeep : t.muted}
              fill={f.favorite ? t.pink : 'none'}
              onPress={() => toggleFav(f.id)}
            />
          </View>
          <View style={{ alignItems: 'center', marginTop: -42, marginBottom: 8 }}>
            <Avatar name={f.author} size={84} />
          </View>
          <Txt v="heavy" size={22} style={{ textAlign: 'center', marginBottom: 4 }} accessibilityRole="header">{f.title}</Txt>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`More by ${f.author}`}
            onPress={() => router.push({ pathname: '/author/[name]', params: { name: f.author } })}
            style={{ alignSelf: 'center', paddingVertical: 4, marginBottom: 8 }}
          >
            <Txt color={t.ink2}>by <Txt v="pixel" size={15} color={t.pinkDeep}>{f.author}</Txt></Txt>
          </Pressable>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
            <StatusBadge status={f.status} />
            {f.ficStatus === 'Ongoing' ? <Badge kind="ongoing" label="Ongoing" /> : <Badge label="Completed" />}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 26, marginTop: 12 }}>
            <Stat value={words || '—'} label="words" />
            <Stat value={f.rating ? String(f.rating) : '—'} label="my stars" />
            <Stat value={String(f.tags.length)} label="tags" />
          </View>

          <View style={{ gap: 10, marginTop: 18 }}>
            {f.files.map((b, i) => (
              <BookCard
                key={b.id}
                book={b}
                primary={i === 0}
                onOpen={() => router.push({ pathname: '/read/[id]', params: { id: f.id, file: b.id } })}
                onRemove={() => removeBook(b)}
              />
            ))}
            {links.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {links.map((l, i) => (
                  <Pill
                    key={l.url + i}
                    icon="open"
                    kind={l.type === 'AO3' ? 'default' : i === 0 && !f.files.length ? 'pink' : 'blue'}
                    label={l.type === 'AO3' ? 'AO3' : l.type === 'File' ? 'File link' : `${l.type} link`}
                    accessibilityLabel={l.type === 'AO3' ? 'Open on AO3' : l.type === 'File' ? 'Open file link' : `Open ${l.type} link`}
                    onPress={() => openUrl(l.url)}
                    style={{ flexGrow: 1 }}
                  />
                ))}
              </View>
            ) : null}
            {f.files.length ? (
              <Pill size="sm" icon="upload" label="Upload another file" onPress={upload} style={{ alignSelf: 'center' }} />
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel="Upload EPUB or PDF to read here" onPress={upload}>
                {({ pressed }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.lav, backgroundColor: pressed ? t.lav : t.lavSoft }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.card, borderWidth: 1.5, borderColor: t.lav, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="upload" size={20} color={t.pinkDeep} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt v="pixel" size={15}>Read it here</Txt>
                      <Txt size={13} color={t.ink2}>Upload an EPUB or PDF. It stays on this phone and works offline.</Txt>
                    </View>
                  </View>
                )}
              </Pressable>
            )}
          </View>

          <Section title="Reading status">
            <StatusPicker value={f.status} onChange={(k) => { tap(); update({ status: k }); }} />
          </Section>

          <Section title="My rating">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Stars value={f.rating} size={38} onChange={(v) => update({ rating: v })} />
              {f.rating
                ? <Txt v="display" size={11} color={t.ink2}>{f.rating} / 5</Txt>
                : <Txt v="pixel" size={14} color={t.ink2}>tap to rate</Txt>}
            </View>
          </Section>

          <Section title="Dates">
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <DateField label="Started" value={f.startedAt} onChange={(v) => v !== f.startedAt && update({ startedAt: v }, 'Date saved')} />
              <DateField label="Finished" value={f.finishedAt} onChange={(v) => v !== f.finishedAt && update({ finishedAt: v }, 'Date saved')} />
            </View>
          </Section>

          {f.tags.length ? (
            <Section title="Tags">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {f.tags.map((tag) => (
                  <Chip
                    key={tag} tag label={`#${tag}`}
                    accessibilityLabel={`Show fics tagged ${tag}`}
                    onPress={() => { setUI({ q: '', f: { ...ui.f, tags: [tag] } }); router.navigate('/'); }}
                  />
                ))}
              </View>
            </Section>
          ) : null}

          <Section title="Summary">
            {f.summary
              ? <Txt selectable>{f.summary}</Txt>
              : <Txt color={t.muted} style={{ fontStyle: 'italic' }}>No summary saved.</Txt>}
          </Section>

          <Thoughts fic={f} onSave={(v) => update({ thoughts: v }, 'Thoughts saved ♡')} />

          <Txt size={13} color={t.muted} style={{ textAlign: 'center', marginTop: 18 }}>
            Added {fmtDate(f.addedAt)} · last edited {fmtDate(f.updatedAt)}
          </Txt>
          <Pill
            kind="danger" icon="trash" label="Delete fic" block style={{ marginTop: 12 }}
            onPress={async () => { if (await remove(f.id)) router.replace('/'); }}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const fmtSize = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

/* An uploaded book: file info with remove in the corner, a progress bar, then one wide read button. */
function BookCard({ book, primary, onOpen, onRemove }: { book: BookFile; primary: boolean; onOpen: () => void; onRemove: () => void }) {
  const t = useTheme();
  const p = useProgress(book.id);
  const started = !!p && (p.frac > 0 || p.chapter > 0 || (p.page ?? 1) > 1);
  const kind = book.kind.toUpperCase();
  const pct = !p ? 0
    : book.kind === 'epub' ? (p.chapters ? (p.chapter + p.frac) / p.chapters : p.frac)
      : p.pages ? (p.page ?? 1) / p.pages : 0;
  const where = !started ? 'Not started yet'
    : book.kind === 'epub' ? `Chapter ${p!.chapter + 1}${p!.chapters ? ` of ${p!.chapters}` : ''}`
      : `Page ${p!.page ?? 1}${p!.pages ? ` of ${p!.pages}` : ''}`;
  const accent = primary ? t.pinkDeep : t.blueDeep;
  return (
    <View style={{ borderRadius: 20, borderWidth: 1.5, borderColor: t.sky, backgroundColor: t.field, padding: 12, gap: 12, boxShadow: t.softShadow }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Gloss kind={primary ? 'pink' : 'blue'} radius={12} style={{ width: 46, height: 54, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Icon name="book" size={18} color={t.glossInk} />
          <Txt v="display" size={7} color={t.glossInk} style={glossText(t)}>{kind}</Txt>
        </Gloss>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt v="semi" size={15} numberOfLines={1}>{book.name}</Txt>
          <Txt v="pixel" size={12} color={t.muted}>{kind} file · {fmtSize(book.size)}</Txt>
        </View>
        <IconButton ghost icon="trash" size={36} label={`Remove ${book.name}`} color={t.muted} onPress={onRemove} />
      </View>

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt v="pixel" size={13} color={t.ink2}>{where}</Txt>
          {started ? <Txt v="display" size={9} color={accent}>{Math.round(pct * 100)}%</Txt> : null}
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: t.softLine, overflow: 'hidden' }}>
          <View style={{ width: `${Math.min(100, Math.max(started ? 3 : 0, pct * 100))}%`, height: '100%', borderRadius: 4, backgroundColor: accent }} />
        </View>
      </View>

      <Pill
        size="lg"
        block
        kind={primary ? 'pink' : 'blue'}
        icon="book"
        trailing="next"
        label={`${started ? 'Continue' : 'Start'} reading`}
        accessibilityLabel={`${started ? 'Continue reading' : 'Read'} ${kind} in the app. ${where}`}
        onPress={onOpen}
      />
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <Txt v="display" size={15} color={t.pinkDeep}>{value}</Txt>
      <Txt v="pixel" size={11} color={t.ink2}>{label}</Txt>
    </View>
  );
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 22 }}>
      <SectionTitle title={title} right={right} />
      {children}
    </View>
  );
}

/* Inline journal editor. Unsaved text is kept in a draft so it survives the app closing. */
function Thoughts({ fic, onSave }: { fic: Fic; onSave: (v: string) => Promise<void> }) {
  const t = useTheme();
  const { confirm } = useFeedback();
  const key = thoughtsKey(fic.id);
  const [draft, setDraft] = useState<string | null>(() => getJSON<string | null>(key, null));
  const editing = draft != null;

  const change = (v: string) => { setDraft(v); setJSON(key, v); };
  const cancel = async () => {
    if (draft !== fic.thoughts && draft?.trim()) {
      const ok = await confirm({ title: 'Discard these thoughts?', message: 'What you just wrote will be lost.', ok: 'Discard', cancel: 'Keep writing', danger: true });
      if (!ok) return;
    }
    removeKey(key);
    setDraft(null);
  };
  const save = async () => {
    await onSave(draft || '');
    removeKey(key);
    setDraft(null);
  };

  return (
    <View style={{ marginTop: 22 }}>
      <SectionTitle
        title="My thoughts"
        right={editing ? null : (
          <Pressable accessibilityRole="button" onPress={() => change(fic.thoughts)} hitSlop={10}>
            <Txt v="heavy" size={14} color={t.pinkDeep}>{fic.thoughts ? 'Edit' : 'Write'}</Txt>
          </Pressable>
        )}
      />
      {editing ? (
        <>
          <Input value={draft} onChangeText={change} multiline tall autoFocus placeholder="My review, feelings, favorite moments…" accessibilityLabel="My thoughts" />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Pill label="Cancel" onPress={cancel} style={{ flex: 1 }} />
            <Pill kind="pink" icon="check" label="Save thoughts" onPress={save} style={{ flex: 2 }} />
          </View>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Edit your thoughts"
          onPress={() => change(fic.thoughts)}
          style={{ backgroundColor: t.lavSoft, borderRadius: 16, padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.lav }}
        >
          {fic.thoughts.trim()
            ? <Txt>{fic.thoughts}</Txt>
            : <Txt color={t.muted} style={{ fontStyle: 'italic' }}>Nothing written yet. How did this one make you feel?</Txt>}
        </Pressable>
      )}
    </View>
  );
}
