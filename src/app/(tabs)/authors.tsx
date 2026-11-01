import { useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groupAuthors } from '@/lib/fic';
import { useLibrary } from '@/state/library';
import { Empty } from '@/ui/common';
import { Lace, ScreenTitle, Sky } from '@/ui/decor';
import { Icon } from '@/ui/Icon';
import { Avatar, Card, Txt } from '@/ui/kit';
import { fonts, TAB_BAR_HEIGHT, useTheme } from '@/ui/theme';

export default function Authors() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { fics } = useLibrary();
  const [q, setQ] = useState('');

  const authors = useMemo(() => groupAuthors(fics)
    .filter((a) => !q.trim() || a.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.fics.length - a.fics.length || a.name.localeCompare(b.name)), [fics, q]);

  return (
    <View style={{ flex: 1 }}>
      <Sky />
      <FlatList
        data={authors}
        keyExtractor={(a) => a.name.toLowerCase()}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 30 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={(
          <Lace>
            <ScreenTitle>Authors</ScreenTitle>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, marginTop: 12, borderRadius: 999, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.field, paddingHorizontal: 14 }}>
              <Icon name="search" size={18} color={t.muted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Find an author"
                placeholderTextColor={t.muted}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Find an author"
                style={{ flex: 1, height: '100%', fontFamily: fonts.body, fontSize: 16, color: t.ink }}
              />
            </View>
          </Lace>
        )}
        ListEmptyComponent={
          <Empty icon="🌸" title={fics.length ? 'No authors match' : 'No authors yet'} text={fics.length ? 'Try another name.' : 'Authors appear here once you add fics.'} />
        }
        renderItem={({ item: a }) => {
          const done = a.fics.filter((f) => f.status === 'finished').length;
          const favs = a.fics.filter((f) => f.favorite).length;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${a.name}, ${a.fics.length} fics`}
              onPress={() => router.push({ pathname: '/author/[name]', params: { name: a.name } })}
              style={({ pressed }) => ({ paddingHorizontal: 16, opacity: pressed ? 0.85 : 1 })}
            >
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
                <Avatar name={a.name} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt v="pixel" size={15} numberOfLines={1}>{a.name}</Txt>
                  <Txt v="pixel" size={11} color={t.pinkDeep}>{done} finished{favs ? ` · ${favs} ♡` : ''}</Txt>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt v="display" size={15} color={t.pinkDeep}>{a.fics.length}</Txt>
                  <Txt v="pixel" size={10} color={t.ink2}>{a.fics.length === 1 ? 'fic' : 'fics'}</Txt>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
