import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STATUSES, type StatusKey } from '@/lib/fic';
import { Icon } from './Icon';
import { Card, Gloss, Txt } from './kit';
import { TAB_BAR_HEIGHT, useTheme } from './theme';

export function Empty({ icon, title, text, children }: { icon: string; title: string; text: string; children?: ReactNode }) {
  const t = useTheme();
  return (
    <Card outer={{ marginHorizontal: 16 }} style={{ padding: 28, alignItems: 'center' }}>
      <Txt size={44} style={{ lineHeight: 52, marginBottom: 6 }}>{icon}</Txt>
      <Txt v="display" size={13} style={{ marginBottom: 8, textAlign: 'center' }}>{title}</Txt>
      <Txt color={t.ink2} style={{ textAlign: 'center', marginBottom: children ? 16 : 0 }}>{text}</Txt>
      {children}
    </Card>
  );
}

export function Segmented({ options, value, onChange }: { options: { k: string; label: string }[]; value: string; onChange: (k: string) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = value === o.k;
        return (
          <Pressable
            key={o.k}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.k)}
            style={{
              flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
              borderColor: on ? t.line : t.softLine, backgroundColor: on ? t.lavSoft : t.card, boxShadow: on ? t.btnShadow : undefined,
            }}
          >
            <Txt v="heavy" size={14} color={on ? t.ink : t.ink2} numberOfLines={1}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/* Floating "+" above the tab bar (or above the bottom edge on stack screens). */
export function Fab({ aboveTabs = true }: { aboveTabs?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add a fic"
      onPress={() => router.push({ pathname: '/edit/[id]', params: { id: 'new' } })}
      style={({ pressed }) => ({
        position: 'absolute', right: 18, bottom: (aboveTabs ? TAB_BAR_HEIGHT : 0) + insets.bottom + 18,
        transform: [{ translateY: pressed ? 2 : 0 }], opacity: pressed ? 0.9 : 1,
      })}
    >
      <Gloss style={{ width: 62, height: 62, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, boxShadow: `${t.btnShadow}, 0px 10px 22px rgba(228,86,156,0.3)` }}>
        <Icon name="plus" size={30} color={t.glossInk} />
      </Gloss>
    </Pressable>
  );
}

export function StatusPicker({ value, onChange }: { value: StatusKey; onChange: (k: StatusKey) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
      {STATUSES.map((s) => {
        const on = value === s.k;
        const c = t.status[s.k];
        return (
          <Pressable
            key={s.k}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(s.k)}
            style={{
              flexGrow: 1, flexBasis: '30%', minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
              borderWidth: 1.5, borderColor: on ? t.line : t.softLine, backgroundColor: on ? c.bg : t.card, boxShadow: on ? t.btnShadow : undefined,
            }}
          >
            <Txt v="heavy" size={13} color={on ? c.fg : t.ink2}>{s.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
