import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { fmtDate, fmtWords, type Fic } from '@/lib/fic';
import { Avatar, Badge, Card, IconButton, StatusBadge, Txt } from './kit';
import { Stars } from './Stars';
import { useTheme } from './theme';

export const FicCard = memo(function FicCard({ fic, onPress, onFav }: { fic: Fic; onPress: (id: string) => void; onFav: (id: string) => void }) {
  const t = useTheme();
  const words = fmtWords(fic.words);
  const sub = fic.status === 'finished' && fic.finishedAt ? `finished ${fmtDate(fic.finishedAt, false)}` : `added ${fmtDate(fic.addedAt, false)}`;
  return (
    // The heart sits on top of the card rather than inside it, so it is never a button nested in a button.
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${fic.title} by ${fic.author}`}
        onPress={() => onPress(fic.id)}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}
      >
        <Card style={{ padding: 14, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Avatar name={fic.author} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt v="pixel" size={14} numberOfLines={1}>{fic.author}</Txt>
              <Txt v="pixel" size={11} color={t.pinkDeep}>{sub}</Txt>
            </View>
            <View style={{ width: 40 }} />
          </View>
          <Txt v="heavy" size={17} style={{ marginBottom: 8 }}>{fic.title}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <StatusBadge status={fic.status} />
            {fic.ficStatus === 'Ongoing' ? <Badge kind="ongoing" label="Ongoing" /> : null}
            {words ? <Badge label={`${words} words`} /> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: t.softLine }}>
            <Stars value={fic.rating} />
            <Txt size={12} color={t.muted} numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>
              {fic.tags.slice(0, 3).map((x) => '#' + x).join(' ')}
            </Txt>
          </View>
        </Card>
      </Pressable>
      <View style={{ position: 'absolute', top: 15.5, right: 15.5 }}>
        <IconButton
          ghost icon="heart" size={40}
          label={fic.favorite ? 'Remove from favorites' : 'Add to favorites'}
          color={fic.favorite ? t.pinkDeep : t.muted}
          fill={fic.favorite ? t.pink : 'none'}
          onPress={() => onFav(fic.id)}
        />
      </View>
    </View>
  );
});
