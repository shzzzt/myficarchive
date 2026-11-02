/* Palette tiles (each previewed in its own colors) and, for Custom, a hue row per color role. */
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Txt } from './kit';
import { hueSwatch, PALETTES, themeFor, useTheme, type Hues, type PaletteKey } from './theme';

const HUES = Array.from({ length: 18 }, (_, i) => i * 20);
const ROLES: { k: keyof Hues; label: string }[] = [
  { k: 'accent', label: 'Buttons & highlights' },
  { k: 'accent2', label: 'Second accent' },
  { k: 'sky', label: 'Background' },
];

export function ThemePicker({ value, custom, onChange, onCustom }: {
  value: PaletteKey;
  custom: Hues;
  onChange: (k: PaletteKey) => void;
  onCustom: (h: Hues) => void;
}) {
  const t = useTheme();
  const tiles: { k: PaletteKey; label: string }[] = [...PALETTES, { k: 'custom', label: 'Custom' }];
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} accessibilityRole="radiogroup">
        {tiles.map((p) => {
          const on = value === p.k;
          const pt = themeFor(t.dark, p.k, custom);
          return (
            <Pressable
              key={p.k}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${p.label} theme`}
              onPress={() => onChange(p.k)}
              style={{
                width: '22%', flexGrow: 1, borderRadius: 14, borderWidth: on ? 2.5 : 1.5, overflow: 'hidden',
                borderColor: on ? t.line : t.softLine, boxShadow: on ? t.btnShadow : undefined,
              }}
            >
              <LinearGradient colors={[pt.sky1, pt.sky2]} style={{ height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <LinearGradient colors={pt.gloss.pink} style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: pt.rim }} />
                <LinearGradient colors={pt.gloss.blue} style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: pt.rim }} />
              </LinearGradient>
              <View style={{ backgroundColor: on ? t.lavSoft : t.card, paddingVertical: 5, alignItems: 'center' }}>
                <Txt v="heavy" size={12} color={on ? t.ink : t.ink2} numberOfLines={1}>{p.label}</Txt>
              </View>
            </Pressable>
          );
        })}
      </View>

      {value === 'custom' ? ROLES.map((r) => (
        <View key={r.k} style={{ gap: 6 }}>
          <Txt v="semi" size={13} color={t.ink2}>{r.label}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }} accessibilityRole="radiogroup">
            {HUES.map((h) => {
              const on = custom[r.k] === h;
              return (
                <Pressable
                  key={h}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${r.label}: hue ${h}`}
                  hitSlop={3}
                  onPress={() => onCustom({ ...custom, [r.k]: h })}
                  style={{
                    width: 28, height: 28, borderRadius: 14, backgroundColor: hueSwatch(h, t.dark),
                    borderWidth: on ? 3 : 1.5, borderColor: on ? t.line : t.softLine,
                  }}
                />
              );
            })}
          </View>
        </View>
      )) : null}
    </View>
  );
}
