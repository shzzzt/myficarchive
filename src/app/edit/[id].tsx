import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, View } from 'react-native';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  groupAuthors, LINK_TYPES, normalizeFic, normalizeUrl, normTags, tagCounts, today,
  type Fic, type FicStatus, type LinkType, type StatusKey,
} from '@/lib/fic';
import { goBack } from '@/state/actions';
import { useFeedback } from '@/state/feedback';
import { draftKey, getJSON, removeKey, setJSON } from '@/state/kv';
import { useLibrary } from '@/state/library';
import { Segmented, StatusPicker } from '@/ui/common';
import { DateField } from '@/ui/DateField';
import { Lace, ScreenTitle, Sky } from '@/ui/decor';
import { Card, Chip, IconButton, Input, Label, Pill, Txt, type TextInputRef } from '@/ui/kit';
import { Stars } from '@/ui/Stars';
import { useTheme } from '@/ui/theme';

interface Form {
  title: string; author: string; words: string; ao3: string; summary: string; thoughts: string;
  favorite: boolean; startedAt: string; finishedAt: string; links: { type: LinkType; url: string }[];
  tags: string[]; status: StatusKey; ficStatus: FicStatus; rating: number;
}

const toForm = (f: Fic | null): Form => ({
  title: f?.title ?? '', author: f?.author ?? '', words: f?.words ?? '', ao3: f?.ao3 ?? '',
  summary: f?.summary ?? '', thoughts: f?.thoughts ?? '', favorite: f?.favorite ?? false,
  startedAt: f?.startedAt ?? '', finishedAt: f?.finishedAt ?? '', links: f ? f.links.map((l) => ({ ...l })) : [],
  tags: f ? [...f.tags] : [], status: f?.status ?? 'want', ficStatus: f?.ficStatus ?? 'Completed', rating: f?.rating ?? 0,
});
// Empty link rows don't count as a change.
const snapshot = (d: Form) => JSON.stringify({ ...d, links: d.links.filter((l) => l.url.trim()) });

export default function EditFic() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { byId, fics, save } = useLibrary();
  const { toast, confirm } = useFeedback();
  const existing = isNew ? null : byId.get(String(id)) || null;
  const key = draftKey(isNew ? 'new' : String(id));

  const [initial, setInitial] = useState(() => snapshot(toForm(existing)));
  const [d, setD] = useState<Form>(() => toForm(existing));
  const [pendingDraft, setPendingDraft] = useState<{ at: number; data: Form } | null>(() => {
    const dr = getJSON<{ at: number; data: Form } | null>(key, null);
    return dr && snapshot(dr.data) !== snapshot(toForm(existing)) ? dr : null;
  });
  const [invalid, setInvalid] = useState<{ title?: boolean; author?: boolean }>({});
  const [tagText, setTagText] = useState('');
  const [authorFocus, setAuthorFocus] = useState(false);
  const titleRef = useRef<TextInputRef>(null);
  const authorRef = useRef<TextInputRef>(null);
  const afterRender = useRef<(() => void) | null>(null);

  const dirty = snapshot(d) !== initial;

  // Persist unsaved edits so nothing is lost if the app is closed mid-edit.
  useEffect(() => {
    const h = setTimeout(() => {
      if (pendingDraft) return; // don't overwrite a draft the user hasn't decided on yet
      if (dirty) setJSON(key, { at: Date.now(), data: d });
      else removeKey(key);
    }, 250);
    return () => clearTimeout(h);
  }, [d, dirty, key, pendingDraft]);

  useEffect(() => {
    if (!afterRender.current) return;
    const run = afterRender.current;
    afterRender.current = null;
    run();
  });

  usePreventRemove(dirty, ({ repeat }) => {
    confirm({ title: 'Discard changes?', message: "Your edits to this fic won't be saved.", ok: 'Discard', cancel: 'Keep editing', danger: true })
      .then((ok) => {
        if (!ok) return;
        removeKey(key);
        afterRender.current = repeat;
        setInitial(snapshot(d)); // no longer dirty, so the repeated action goes through
      });
  });

  const set = (p: Partial<Form>) => setD((prev) => ({ ...prev, ...p }));
  const allTags = useMemo(() => tagCounts(fics), [fics]);
  const authorNames = useMemo(() => groupAuthors(fics).map((a) => a.name), [fics]);
  const authorMatches = authorFocus && d.author.trim()
    ? authorNames.filter((n) => n.toLowerCase().includes(d.author.trim().toLowerCase()) && n !== d.author).slice(0, 6)
    : [];
  const tagSuggestions = allTags
    .filter((tg) => !d.tags.some((x) => x.toLowerCase() === tg.name.toLowerCase()) && (!tagText.trim() || tg.name.toLowerCase().includes(tagText.trim().toLowerCase())))
    .slice(0, 12);

  const addTags = (text: string) => {
    const added = normTags(text);
    setTagText('');
    if (added.length) set({ tags: normTags([...d.tags, ...added]) });
  };

  const setStatus = (k: StatusKey) => {
    const p: Partial<Form> = { status: k };
    if (k === 'reading' && !d.startedAt) p.startedAt = today();
    if (k === 'finished' && !d.finishedAt) p.finishedAt = today();
    set(p);
  };

  const onSave = async () => {
    const title = d.title.trim(), author = d.author.trim();
    setInvalid({ title: !title, author: !author });
    if (!title || !author) {
      toast(!title ? 'Title is required' : 'Author is required');
      (!title ? titleRef : authorRef).current?.focus();
      return;
    }
    if (d.links.some((l) => l.url.trim() && !normalizeUrl(l.url))) {
      toast("One of the links doesn't look like a web address");
      return;
    }
    const tags = tagText.trim() ? normTags([...d.tags, tagText]) : d.tags;
    const fic = normalizeFic({ ...(existing || {}), ...d, tags, id: existing?.id, addedAt: existing?.addedAt });
    try {
      const saved = await save(fic);
      removeKey(key);
      toast(isNew ? 'Added to your archive ♡' : 'Saved ♡');
      afterRender.current = () => {
        if (isNew) router.replace({ pathname: '/fic/[id]', params: { id: saved.id } });
        else goBack();
      };
      setD({ ...d, tags });
      setInitial(snapshot({ ...d, tags }));
    } catch (e) {
      console.error(e);
      toast("Couldn't save. Your draft is kept, so nothing is lost.");
    }
  };

  if (!isNew && !existing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Sky />
        <Pill label="Back" onPress={goBack} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Sky />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
          <Lace>
            <ScreenTitle left={<IconButton icon="back" label="Back" onPress={goBack} />}>{isNew ? 'Add a fic' : 'Edit fic'}</ScreenTitle>
          </Lace>

          {pendingDraft ? (
            <View style={{ marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: t.status.hold.fg, backgroundColor: t.status.hold.bg, gap: 10 }}>
              <Txt size={14} color={t.status.hold.fg}>You have unsaved changes from {new Date(pendingDraft.at).toLocaleString()}.</Txt>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pill size="sm" kind="pink" label="Restore" onPress={() => { setD(pendingDraft.data); setPendingDraft(null); toast('Draft restored'); }} />
                <Pill size="sm" label="Discard" onPress={() => { removeKey(key); setPendingDraft(null); }} />
              </View>
            </View>
          ) : null}

          <View style={{ paddingHorizontal: 16, gap: 16 }}>
            <Card style={{ padding: 16, gap: 16 }}>
              <View>
                <Label required>Title</Label>
                <Input
                  ref={titleRef}
                  value={d.title}
                  invalid={invalid.title}
                  onChangeText={(v) => { set({ title: v }); if (v.trim()) setInvalid((x) => ({ ...x, title: false })); }}
                  placeholder="e.g. Euphoria"
                  returnKeyType="next"
                  onSubmitEditing={() => authorRef.current?.focus()}
                  autoFocus={isNew}
                  accessibilityLabel="Title, required"
                />
              </View>
              <View>
                <Label required>Author</Label>
                <Input
                  ref={authorRef}
                  value={d.author}
                  invalid={invalid.author}
                  onChangeText={(v) => { set({ author: v }); if (v.trim()) setInvalid((x) => ({ ...x, author: false })); }}
                  onFocus={() => setAuthorFocus(true)}
                  onBlur={() => setAuthorFocus(false)}
                  placeholder="AO3 username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Author, required"
                />
                {authorMatches.length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {authorMatches.map((n) => <Chip key={n} label={n} onPress={() => set({ author: n })} />)}
                  </View>
                ) : null}
              </View>
              <View>
                <Label>Word count</Label>
                <Input value={d.words} onChangeText={(v) => set({ words: v })} placeholder="31k" autoCapitalize="none" />
              </View>
            </Card>

            <Card style={{ padding: 16, gap: 16 }}>
              <View>
                <Label>File links</Label>
                {d.links.map((l, i) => (
                  <View key={i} style={{ marginBottom: 12, gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                        {LINK_TYPES.map((type) => (
                          <Chip
                            key={type} label={type} on={l.type === type}
                            onPress={() => set({ links: d.links.map((x, j) => (j === i ? { ...x, type } : x)) })}
                          />
                        ))}
                      </View>
                      <IconButton ghost icon="x" size={40} label="Remove link" color={t.muted} onPress={() => set({ links: d.links.filter((_, j) => j !== i) })} />
                    </View>
                    <Input
                      value={l.url}
                      onChangeText={(v) => set({ links: d.links.map((x, j) => (j === i ? { ...x, url: v } : x)) })}
                      placeholder="https://drive.google.com/…"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      accessibilityLabel={`${l.type} link`}
                    />
                  </View>
                ))}
                <Pill size="sm" icon="plus" label="Add link" style={{ alignSelf: 'flex-start' }}
                  onPress={() => set({ links: [...d.links, { type: d.links.length ? 'PDF' : 'EPUB', url: '' }] })} />
                <Txt size={12} color={t.muted} style={{ marginTop: 6, marginLeft: 4 }}>Google Drive links work great. Label each one EPUB, PDF or AO3.</Txt>
              </View>
              <View>
                <Label>AO3 link</Label>
                <Input value={d.ao3} onChangeText={(v) => set({ ao3: v })} placeholder="https://archiveofourown.org/works/…" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
              </View>
            </Card>

            <Card style={{ padding: 16, gap: 16 }}>
              <View>
                <Label>Reading status</Label>
                <StatusPicker value={d.status} onChange={setStatus} />
              </View>
              <View>
                <Label>Fic status</Label>
                <Segmented options={[{ k: 'Completed', label: 'Completed' }, { k: 'Ongoing', label: 'Ongoing' }]} value={d.ficStatus} onChange={(k) => set({ ficStatus: k as FicStatus })} />
              </View>
              <View>
                <Label>My rating</Label>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Stars value={d.rating} size={38} onChange={(v) => set({ rating: v })} />
                  {d.rating
                    ? <Txt v="display" size={11} color={t.ink2}>{d.rating} / 5</Txt>
                    : <Txt v="pixel" size={14} color={t.ink2}>tap to rate</Txt>}
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
                <Txt v="pixel" size={15}>♡ Favorite</Txt>
                <Switch value={d.favorite} onValueChange={(v) => set({ favorite: v })} trackColor={{ true: t.pink, false: t.softLine }} thumbColor="#ffffff" accessibilityLabel="Favorite" />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <DateField label="Started" value={d.startedAt} onChange={(v) => set({ startedAt: v })} />
                <DateField label="Finished" value={d.finishedAt} onChange={(v) => set({ finishedAt: v })} />
              </View>
            </Card>

            <Card style={{ padding: 16, gap: 16 }}>
              <View>
                <Label>Tags</Label>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: 8, borderRadius: 14, borderWidth: 1.5, borderColor: t.softLine, backgroundColor: t.field, minHeight: 48 }}>
                  {d.tags.map((tag) => (
                    <Chip key={tag} tag on label={`#${tag}  ×`} accessibilityLabel={`Remove tag ${tag}`} onPress={() => set({ tags: d.tags.filter((x) => x !== tag) })} />
                  ))}
                  <Input
                    value={tagText}
                    onChangeText={(v) => (v.includes(',') ? addTags(v) : setTagText(v))}
                    onSubmitEditing={() => addTags(tagText)}
                    submitBehavior="submit"
                    placeholder="angst, fluff, soulmate au…"
                    autoCapitalize="none"
                    returnKeyType="done"
                    accessibilityLabel="Add a tag"
                    style={{ flexGrow: 1, minWidth: 140, minHeight: 36, borderWidth: 0, paddingHorizontal: 6, paddingVertical: 4, backgroundColor: 'transparent' }}
                  />
                </View>
                {tagSuggestions.length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {tagSuggestions.map((tg) => <Chip key={tg.name} tag label={`+ ${tg.name}`} onPress={() => set({ tags: normTags([...d.tags, tg.name]) })} />)}
                  </View>
                ) : null}
              </View>
              <View>
                <Label>Summary</Label>
                <Input value={d.summary} onChangeText={(v) => set({ summary: v })} multiline placeholder="Paste the summary…" />
              </View>
              <View>
                <Label>My thoughts</Label>
                <Input value={d.thoughts} onChangeText={(v) => set({ thoughts: v })} multiline tall placeholder="My review, feelings, favorite moments…" />
              </View>
            </Card>
          </View>
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 12, backgroundColor: t.sky2, borderTopWidth: 1, borderColor: t.softLine }}>
          <Pill label="Cancel" onPress={goBack} style={{ flex: 1 }} />
          <Pill kind="pink" icon="check" label={isNew ? 'Add to archive' : 'Save changes'} onPress={onSave} style={{ flex: 2 }} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

