import { useMemo } from 'react';
import { FlatList, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { compact, parseWords } from '@/lib/fic';
import { goBack, useFicActions } from '@/state/actions';
import { useLibrary } from '@/state/library';
import { Empty, Fab } from '@/ui/common';
import { Cover, Sky } from '@/ui/decor';
import { FicCard } from '@/ui/FicCard';
import { Avatar, Card, Pill, Txt } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

export default function AuthorPage() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { fics } = useLibrary();
  const { open, toggleFav } = useFicActions();

  const list = useMemo(() => fics
    .filter((f) => f.author.toLowerCase() === String(name).toLowerCase())
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt)), [fics, name]);
  const display = list[0]?.author || String(name);
  const done = list.filter((f) => f.status === 'finished');
  const rated = list.filter((f) => f.rating);
  const avg = rated.length ? (rated.reduce((s, f) => s + f.rating, 0) / rated.length).toFixed(1) : '—';
  const words = done.reduce((s, f) => s + (parseWords(f.words) || 0), 0);

  const stat = (value: string, label: string) => (
    <View style={{ alignItems: 'center' }}>
      <Txt v="display" size={14} color={t.pinkDeep}>{value}</Txt>
      <Txt v="pixel" size={11} color={t.ink2}>{label}</Txt>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Sky />
      <FlatList
        data={list}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        renderItem={({ item }) => <View style={{ paddingHorizontal: 16 }}><FicCard fic={item} onPress={open} onFav={toggleFav} /></View>}
        ListHeaderComponent={(
          <View style={{ marginBottom: 16 }}>
            <Cover seed={display} seed2={display}>
              <Pill size="sm" kind="blue" icon="back" label="BACK" onPress={goBack} />
            </Cover>
            <Card outer={{ marginHorizontal: 16, marginTop: -44 }} style={{ paddingHorizontal: 18, paddingBottom: 16 }}>
              <View style={{ alignItems: 'center', marginTop: -42, marginBottom: 8 }}>
                <Avatar name={display} size={84} />
              </View>
              <Txt v="display" size={15} accessibilityRole="header" style={{ textAlign: 'center' }}>{display}</Txt>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 }}>
                {stat(String(list.length), 'saved')}
                {stat(String(done.length), 'finished')}
                {stat(avg, 'avg stars')}
                {stat(words ? compact(words) : '—', 'words read')}
              </View>
            </Card>
          </View>
        )}
        ListEmptyComponent={<Empty icon="🫧" title="No fics" text="Nothing saved from this author." />}
      />
      <Fab aboveTabs={false} />
    </View>
  );
}
