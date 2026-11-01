import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { compact, groupAuthors, MONTHS_LONG, parseWords, plural, STATUSES } from '@/lib/fic';
import { useLibrary } from '@/state/library';
import { Empty } from '@/ui/common';
import { Lace, ScreenTitle, Sky } from '@/ui/decor';
import { Card, Txt } from '@/ui/kit';
import { TAB_BAR_HEIGHT, useTheme } from '@/ui/theme';

export default function Stats() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { fics } = useLibrary();
  const [active, setActive] = useState<number | null>(null);

  const s = useMemo(() => {
    const done = fics.filter((f) => f.status === 'finished');
    const rated = fics.filter((f) => f.rating);
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, d, n: 0 };
    });
    const idx = new Map(months.map((m) => [m.key, m]));
    let undated = 0;
    done.forEach((f) => {
      if (!f.finishedAt) { undated++; return; }
      const m = idx.get(f.finishedAt.slice(0, 7));
      if (m) m.n++;
    });
    const peak = months.reduce((a, b) => (b.n > a.n ? b : a), months[0]);
    return {
      total: fics.length,
      done: done.length,
      thisYear: done.filter((f) => f.finishedAt.startsWith(String(now.getFullYear()))).length,
      reading: fics.filter((f) => f.status === 'reading').length,
      favs: fics.filter((f) => f.favorite).length,
      wordsRead: done.reduce((a, f) => a + (parseWords(f.words) || 0), 0),
      wordsSaved: fics.reduce((a, f) => a + (parseWords(f.words) || 0), 0),
      avg: rated.length ? rated.reduce((a, f) => a + f.rating, 0) / rated.length : 0,
      rated: rated.length,
      months, undated, peak,
      maxM: Math.max(1, ...months.map((m) => m.n)),
      authors: groupAuthors(fics).sort((a, b) => b.fics.length - a.fics.length || a.name.localeCompare(b.name)).slice(0, 8),
      statusCounts: STATUSES.map((x) => ({ ...x, n: fics.filter((f) => f.status === x.k).length })),
    };
  }, [fics]);

  const monthName = (d: Date) => `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
  const tip = active != null
    ? `${monthName(s.months[active].d)}: ${plural(s.months[active].n, 'fic')} finished`
    : s.peak.n ? `Best month: ${monthName(s.peak.d)} (${plural(s.peak.n, 'fic')})` : 'No finished dates in the last year yet.';
  const maxA = Math.max(1, ...s.authors.map((a) => a.fics.length));
  const maxS = Math.max(1, ...s.statusCounts.map((x) => x.n));

  return (
    <View style={{ flex: 1 }}>
      <Sky />
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 30 }}>
        <Lace><ScreenTitle>Reading stats</ScreenTitle></Lace>
        {!fics.length ? (
          <Empty icon="📈" title="No stats yet" text="Add some fics and your reading life shows up here." />
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 16 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Tile value={String(s.total)} label="total fics" sub={`${s.favs} favorites`} />
              <Tile value={String(s.done)} label="finished" sub={`${s.thisYear} this year · ${s.reading} reading now`} />
              <Tile value={compact(s.wordsRead)} label="words read" sub={`${compact(s.wordsSaved)} words saved`} />
              <Tile value={s.avg ? s.avg.toFixed(2) : '—'} label="avg rating" sub={`${s.rated} rated`} />
            </View>

            <Card style={{ padding: 16 }}>
              <Txt v="pixel" size={16} accessibilityRole="header">Fics finished per month</Txt>
              <Txt size={12} color={t.muted} style={{ marginBottom: 12 }}>
                Last 12 months · tap a bar{s.undated ? ` · ${s.undated} finished without a date` : ''}
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 150, paddingTop: 22, borderBottomWidth: 1.5, borderColor: t.softLine }}>
                {s.months.map((m, i) => {
                  const on = active === i;
                  const pct = (m.n / s.maxM) * 100;
                  return (
                    <Pressable
                      key={m.key}
                      accessibilityRole="button"
                      accessibilityLabel={`${monthName(m.d)}: ${plural(m.n, 'fic')}`}
                      onPress={() => setActive(on ? null : i)}
                      style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}
                    >
                      {(m === s.peak && m.n && active == null) || (on && m.n) ? (
                        <Txt v="pixel" size={12} style={{ marginBottom: 2 }}>{m.n}</Txt>
                      ) : null}
                      <View
                        style={{
                          width: '70%', maxWidth: 22, height: m.n ? `${pct}%` : 2,
                          backgroundColor: m.n ? (on ? t.pinkDeep : t.lav) : t.softLine,
                          borderTopLeftRadius: m.n ? 4 : 2, borderTopRightRadius: m.n ? 4 : 2,
                        }}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {s.months.map((m) => (
                  <Txt key={m.key} v="pixel" size={10} color={t.muted} style={{ flex: 1, textAlign: 'center' }}>{MONTHS_LONG[m.d.getMonth()][0]}</Txt>
                ))}
              </View>
              <Txt size={13} color={t.ink2} style={{ textAlign: 'center', marginTop: 8 }}>{tip}</Txt>
            </Card>

            <Card style={{ padding: 16 }}>
              <Txt v="pixel" size={16} accessibilityRole="header">Top authors</Txt>
              <Txt size={12} color={t.muted} style={{ marginBottom: 8 }}>By fics saved</Txt>
              {s.authors.map((a) => (
                <Bar
                  key={a.name}
                  name={a.name}
                  value={`${a.fics.length} · ${a.fics.filter((f) => f.status === 'finished').length} read`}
                  pct={(a.fics.length / maxA) * 100}
                  color={t.blue}
                  onPress={() => router.push({ pathname: '/author/[name]', params: { name: a.name } })}
                />
              ))}
            </Card>

            <Card style={{ padding: 16 }}>
              <Txt v="pixel" size={16} accessibilityRole="header">By reading status</Txt>
              <Txt size={12} color={t.muted} style={{ marginBottom: 8 }}>Where everything in your archive stands</Txt>
              {s.statusCounts.map((x) => (
                <Bar key={x.k} name={x.label} value={String(x.n)} pct={(x.n / maxS) * 100} color={t.status[x.k].fg} />
              ))}
            </Card>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Tile({ value, label, sub }: { value: string; label: string; sub: string }) {
  const t = useTheme();
  return (
    <Card outer={{ flexBasis: '47%', flexGrow: 1 }} style={{ padding: 14, minHeight: 112 }}>
      <Txt v="display" size={20} color={t.pinkDeep} style={{ marginBottom: 4 }}>{value}</Txt>
      <Txt v="pixel" size={12} color={t.ink2}>{label}</Txt>
      <Txt size={12} color={t.muted} style={{ marginTop: 2 }}>{sub}</Txt>
    </Card>
  );
}

function Bar({ name, value, pct, color, onPress }: { name: string; value: string; pct: number; color: string; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={`${name}: ${value}`} style={{ paddingVertical: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
        <Txt v="bold" size={14} numberOfLines={1} style={{ flex: 1 }}>{name}</Txt>
        <Txt v="pixel" size={13} color={t.ink2}>{value}</Txt>
      </View>
      <View style={{ height: 10, borderRadius: 4, backgroundColor: t.field, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderTopRightRadius: 4, borderBottomRightRadius: 4 }} />
      </View>
    </Pressable>
  );
}
