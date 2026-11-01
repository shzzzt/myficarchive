import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  activeFilterCount, EMPTY_FILTERS, filterAndSort, groupAuthors, plural, RATING_FILTERS, SORTS, STATUSES, tagCounts,
  type Filters, type StatusKey,
} from '@/lib/fic';
import { useFicActions } from '@/state/actions';
import { useLibrary, type UIPrefs } from '@/state/library';
import { Lace, Sky } from '@/ui/decor';
import { FicCard } from '@/ui/FicCard';
import { Icon } from '@/ui/Icon';
import { Empty, Fab, Segmented } from '@/ui/common';
import { Chip, Gloss, IconButton, Pill, SparkleIcon, Txt } from '@/ui/kit';
import { Sheet, SheetHeading } from '@/ui/Sheet';
import { fonts, TAB_BAR_HEIGHT, useTheme, type ThemePref } from '@/ui/theme';

const THEME_ORDER: ThemePref[] = ['system', 'light', 'dark'];

export default function Library() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { fics, ui, setUI } = useLibrary();
  const { toggleFav, open } = useFicActions();
  const [sheet, setSheet] = useState<'sort' | 'filters' | null>(null);

  const items = useMemo(() => filterAndSort(fics, ui.f, ui.q, ui.sort, ui.dir), [fics, ui.f, ui.q, ui.sort, ui.dir]);
  const filtering = !!ui.q || activeFilterCount(ui.f) > 0;

  const header = (
    <>
      <LibraryHeader ui={ui} setUI={setUI} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Txt v="pixel" size={14} color={t.ink2} style={{ flex: 1 }}>
          <Txt v="pixel" size={14} color={t.pinkDeep}>{filtering ? items.length : fics.length}</Txt>
          {filtering ? ` of ${fics.length}` : fics.length === 1 ? ' fic' : ' fics'}
        </Txt>
        <Pill size="sm" icon="sort" label={(SORTS.find((s) => s.k === ui.sort) || SORTS[0]).label} onPress={() => setSheet('sort')} />
        <Pill
          size="sm" icon="filter"
          label={activeFilterCount(ui.f) ? `Filter · ${activeFilterCount(ui.f)}` : 'Filter'}
          kind={activeFilterCount(ui.f) ? 'pink' : 'default'}
          onPress={() => setSheet('filters')}
        />
      </View>
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      <Sky />
      <FlatList
        data={items}
        keyExtractor={(f) => f.id}
        renderItem={({ item }) => <View style={{ paddingHorizontal: 16 }}><FicCard fic={item} onPress={open} onFav={toggleFav} /></View>}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 110 }}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={8}
        windowSize={11}
        removeClippedSubviews
        ListEmptyComponent={
          !fics.length ? (
            <Empty icon="📚" title="Your archive is empty" text="Add your first fic with the + button, or import your spreadsheet.">
              <Pill kind="pink" label="Import a spreadsheet" onPress={() => router.navigate('/backup')} />
            </Empty>
          ) : (
            <Empty icon="🔍" title="No fics match" text="Try a different search or clear your filters.">
              <Pill label="Clear search & filters" onPress={() => setUI({ q: '', f: EMPTY_FILTERS })} />
            </Empty>
          )
        }
      />
      <Fab />
      <SortSheet visible={sheet === 'sort'} onClose={() => setSheet(null)} />
      <FilterSheet visible={sheet === 'filters'} onClose={() => setSheet(null)} />
    </View>
  );
}

function LibraryHeader({ ui, setUI }: { ui: UIPrefs; setUI: (p: Partial<UIPrefs>) => void }) {
  const t = useTheme();
  const [q, setQ] = useState(ui.q);
  // Follow outside changes to the saved query (e.g. "Clear search & filters").
  const [seenQ, setSeenQ] = useState(ui.q);
  if (ui.q !== seenQ) { setSeenQ(ui.q); setQ(ui.q); }
  useEffect(() => {
    const h = setTimeout(() => { if (q !== ui.q) setUI({ q }); }, 150);
    return () => clearTimeout(h);
  }, [q, ui.q, setUI]);

  const toggleStatus = (k: StatusKey) => {
    const s = ui.f.statuses;
    setUI({ f: { ...ui.f, statuses: s.includes(k) ? s.filter((x) => x !== k) : [...s, k] } });
  };
  const nextTheme = THEME_ORDER[(THEME_ORDER.indexOf(ui.theme) + 1) % 3];

  return (
    <Lace>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Gloss style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}>
          <SparkleIcon size={20} color={t.glossInk} />
        </Gloss>
        <View style={{ flex: 1 }}>
          <Txt v="display" size={15} accessibilityRole="header">My Fic Archive</Txt>
          <Txt v="pixel" size={13} color={t.pinkDeep}>♡ reading journal</Txt>
        </View>
        <IconButton
          icon={ui.theme === 'light' ? 'sun' : ui.theme === 'dark' ? 'moon' : 'auto'}
          label={`Theme: ${ui.theme}. Switch to ${nextTheme}`}
          onPress={() => setUI({ theme: nextTheme })}
        />
      </View>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, borderRadius: 999, borderWidth: 1.5,
        borderColor: t.line, backgroundColor: t.field, paddingLeft: 14, paddingRight: 6,
      }}>
        <Icon name="search" size={18} color={t.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search title, author, tags, thoughts…"
          placeholderTextColor={t.muted}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search title, author, summary, tags and thoughts"
          style={{ flex: 1, height: '100%', fontFamily: fonts.body, fontSize: 16, color: t.ink }}
        />
        {q ? <IconButton ghost icon="x" size={36} label="Clear search" color={t.muted} onPress={() => { setQ(''); setUI({ q: '' }); }} /> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginTop: 12 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 2 }}>
        <Chip label="All" on={!ui.f.statuses.length} onPress={() => setUI({ f: { ...ui.f, statuses: [] } })} />
        {STATUSES.map((s) => (
          <Chip key={s.k} label={s.label} dot={t.status[s.k].fg} on={ui.f.statuses.includes(s.k)} onPress={() => toggleStatus(s.k)} />
        ))}
        <Chip label="♡ Favorites" on={ui.f.fav} onPress={() => setUI({ f: { ...ui.f, fav: !ui.f.fav } })} />
      </ScrollView>
    </Lace>
  );
}

function SortSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const { ui, setUI } = useLibrary();
  return (
    <Sheet visible={visible} onClose={onClose} title="Sort by" footer={<Pill kind="pink" label="Done" onPress={onClose} style={{ flex: 1 }} />}>
      <View style={{ gap: 6 }}>
        {SORTS.map((o) => {
          const on = ui.sort === o.k;
          return (
            <Pressable
              key={o.k}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => {
                if (on) setUI({ dir: ui.dir === 'asc' ? 'desc' : 'asc' });
                else setUI({ sort: o.k, dir: o.dir });
                onClose();
              }}
              style={{
                minHeight: 50, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                borderColor: on ? t.line : t.softLine, backgroundColor: on ? t.lavSoft : t.card,
              }}
            >
              <Txt v="bold">{o.label}</Txt>
              {on ? <Txt size={13} color={t.ink2}>{ui.dir === 'asc' ? '↑ ascending' : '↓ descending'}</Txt> : null}
            </Pressable>
          );
        })}
      </View>
      <SheetHeading>Order</SheetHeading>
      <Segmented
        options={[{ k: 'asc', label: 'Ascending ↑' }, { k: 'desc', label: 'Descending ↓' }]}
        value={ui.dir}
        onChange={(k) => setUI({ dir: k as 'asc' | 'desc' })}
      />
    </Sheet>
  );
}

function FilterSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const { fics, ui, setUI } = useLibrary();
  const f = ui.f;
  const set = useCallback((p: Partial<Filters>) => setUI({ f: { ...f, ...p } }), [f, setUI]);
  const tags = useMemo(() => tagCounts(fics), [fics]);
  const authors = useMemo(() => groupAuthors(fics).sort((a, b) => a.name.localeCompare(b.name)), [fics]);
  const count = useMemo(() => filterAndSort(fics, f, ui.q, ui.sort, ui.dir).length, [fics, f, ui.q, ui.sort, ui.dir]);
  const tagOn = (name: string) => f.tags.some((x) => x.toLowerCase() === name.toLowerCase());
  const [authorQ, setAuthorQ] = useState('');
  const shownAuthors = authors.filter((a) => !authorQ || a.name.toLowerCase().includes(authorQ.toLowerCase())).slice(0, 30);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Filters"
      footer={(
        <>
          <Pill label="Reset" onPress={() => set(EMPTY_FILTERS)} style={{ flex: 1 }} />
          <Pill kind="pink" label={`Show ${plural(count, 'fic')}`} onPress={onClose} style={{ flex: 2 }} />
        </>
      )}
    >
      <SheetHeading>Reading status</SheetHeading>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {STATUSES.map((s) => (
          <Chip
            key={s.k} label={s.label} dot={t.status[s.k].fg} on={f.statuses.includes(s.k)}
            onPress={() => set({ statuses: f.statuses.includes(s.k) ? f.statuses.filter((x) => x !== s.k) : [...f.statuses, s.k] })}
          />
        ))}
      </View>
      <SheetHeading>My rating</SheetHeading>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {RATING_FILTERS.map((r) => <Chip key={r.k} digits={r.k !== 'any' && r.k !== 'unrated'} label={r.label} on={f.rating === r.k} onPress={() => set({ rating: r.k })} />)}
      </View>
      <SheetHeading>Fic status</SheetHeading>
      <Segmented
        options={[{ k: 'all', label: 'Any' }, { k: 'Completed', label: 'Completed' }, { k: 'Ongoing', label: 'Ongoing' }]}
        value={f.fic}
        onChange={(k) => set({ fic: k as Filters['fic'] })}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, minHeight: 44 }}>
        <Txt v="pixel" size={15}>♡ Favorites only</Txt>
        <Switch
          value={f.fav}
          onValueChange={(v) => set({ fav: v })}
          trackColor={{ true: t.pink, false: t.softLine }}
          thumbColor="#ffffff"
          accessibilityLabel="Favorites only"
        />
      </View>
      <SheetHeading>Author</SheetHeading>
      {f.author ? (
        <Chip label={`${f.author}  ×`} on onPress={() => set({ author: '' })} accessibilityLabel={`Remove author filter ${f.author}`} />
      ) : (
        <>
          <TextInput
            value={authorQ}
            onChangeText={setAuthorQ}
            placeholder="Find an author"
            placeholderTextColor={t.muted}
            autoCapitalize="none"
            style={{ minHeight: 44, borderRadius: 14, borderWidth: 1.5, borderColor: t.softLine, backgroundColor: t.field, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 16, color: t.ink, marginBottom: 8 }}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {shownAuthors.map((a) => <Chip key={a.name} label={`${a.name} · ${a.fics.length}`} onPress={() => set({ author: a.name })} />)}
          </View>
        </>
      )}
      <SheetHeading>{f.tags.length > 1 ? 'Tags (any of)' : 'Tags'}</SheetHeading>
      {tags.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {tags.map((tg) => (
            <Chip
              key={tg.name} tag label={`#${tg.name} ${tg.n}`} on={tagOn(tg.name)}
              onPress={() => set({ tags: tagOn(tg.name) ? f.tags.filter((x) => x.toLowerCase() !== tg.name.toLowerCase()) : [...f.tags, tg.name] })}
            />
          ))}
        </View>
      ) : (
        <Txt size={14} color={t.muted}>No tags yet. Add some when editing a fic.</Txt>
      )}
    </Sheet>
  );
}

