import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { clampRating } from '@/lib/fic';
import { useTheme } from './theme';
import { tap } from './haptics';

const STAR = 'M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z';

function Star({ pct, size }: { pct: number; size: number }) {
  const t = useTheme();
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={STAR} fill="none" stroke={t.muted} strokeWidth={1.6} strokeLinejoin="round" />
      </Svg>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: (size * pct) / 100, overflow: 'hidden' }}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d={STAR} fill={t.star} stroke={t.starLine} strokeWidth={1.6} strokeLinejoin="round" />
        </Svg>
      </View>
    </View>
  );
}

/* Read-only when onChange is omitted. Tap the left half of a star for a half star; tap the current value again to clear. */
export function Stars({ value, size = 18, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  const gap = size > 24 ? 6 : 2;
  const stars = [1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} pct={value >= i ? 100 : value >= i - 0.5 ? 50 : 0} />);
  if (!onChange) {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel={value ? `${value} out of 5 stars` : 'Not rated'} style={{ flexDirection: 'row', gap }}>
        {stars}
      </View>
    );
  }
  const set = (v: number) => { tap(); onChange(v === value ? 0 : v); };
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="My rating"
      accessibilityValue={{ min: 0, max: 5, now: value, text: value ? `${value} stars` : 'Not rated' }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(clampRating(value + (e.nativeEvent.actionName === 'increment' ? 0.5 : -0.5)))}
      style={{ flexDirection: 'row', gap }}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i}>
          {stars[i - 1]}
          {/* Two tap zones per star: left half = half star, right half = full star. */}
          <View style={{ position: 'absolute', top: -8, bottom: -8, left: 0, right: 0, flexDirection: 'row' }}>
            <Pressable style={{ flex: 1 }} onPress={() => set(i - 0.5)} />
            <Pressable style={{ flex: 1 }} onPress={() => set(i)} />
          </View>
        </View>
      ))}
    </View>
  );
}
