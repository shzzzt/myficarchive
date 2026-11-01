/* Small building blocks: text, soft-shadow cards, glossy pills, chips, badges, avatar, inputs. */
import { useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import {
  Pressable, StyleSheet, Text, TextInput, View,
  type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line, Path } from 'react-native-svg';
import { hashHue, statusLabel, type StatusKey } from '@/lib/fic';
import { avatarColor, fonts, useTheme } from './theme';
import { Icon, type IconName } from './Icon';

const NO_LIGATURES: TextStyle = { fontVariant: ['no-common-ligatures'] };

type Variant = 'display' | 'pixel' | 'body' | 'semi' | 'bold' | 'heavy';

export function Txt({ v = 'body', size = 16, color, style, ...rest }: TextProps & { v?: Variant; size?: number; color?: string }) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: fonts[v], fontSize: size, color: color || t.ink, lineHeight: Math.round(size * (v === 'display' ? 1.6 : v === 'body' ? 1.45 : 1.3)) },
        // Pixelify Sans turns "fi"/"fl" into ligatures that read like "A"; keep letters separate.
        v === 'body' ? null : NO_LIGATURES,
        style,
      ]}
    />
  );
}

/* Card: bordered surface with a soft blue glow under it. */
export function Card({ children, style, outer, radius = 20 }: { children: ReactNode; style?: StyleProp<ViewStyle>; outer?: StyleProp<ViewStyle>; radius?: number }) {
  const t = useTheme();
  return (
    <View style={outer}>
      <View style={[{ borderRadius: radius, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.card, boxShadow: t.cardShadow }, style]}>{children}</View>
    </View>
  );
}

/* Candy-glass surface: top-to-bottom gradient, white rim, thin dark ring, glow and a shine on the top half. */
export function Gloss({ kind = 'pink', radius = 999, style, children }: { kind?: 'pink' | 'blue'; radius?: number; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const t = useTheme();
  return (
    // zIndex keeps the gradient layers under the content; on web, absolute layers would otherwise paint over SVG icons.
    <View style={[{ borderRadius: radius, borderWidth: 1.5, borderColor: t.rim, boxShadow: t.btnShadow, zIndex: 0 }, style]}>
      <LinearGradient colors={t.gloss[kind]} style={[StyleSheet.absoluteFill, { borderRadius: radius, zIndex: -1 }]} />
      <LinearGradient
        colors={t.shine}
        pointerEvents="none"
        style={{ position: 'absolute', left: '10%', right: '10%', top: 2, height: '45%', borderRadius: radius, zIndex: -1 }}
      />
      {children}
    </View>
  );
}

export const glossText = (t: { glossTextShadow: string }): TextStyle => ({ textShadowColor: t.glossTextShadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 });

type PillKind = 'default' | 'pink' | 'blue' | 'danger';

export function Pill({
  label, icon, kind = 'default', size = 'md', block, trailing, style, disabled, ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  label: string; icon?: IconName; kind?: PillKind; size?: 'sm' | 'md' | 'lg'; block?: boolean; trailing?: IconName; style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const glossy = kind === 'pink' || kind === 'blue';
  const fg = glossy ? t.glossInk : kind === 'danger' ? t.status.dnf.fg : t.ink;
  const h = size === 'sm' ? 38 : size === 'lg' ? 58 : 46;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;
  const radius = size === 'lg' ? 18 : 999;
  const row: ViewStyle = {
    minHeight: h, paddingHorizontal: size === 'sm' ? 14 : 20, flexDirection: 'row', alignItems: 'center',
    justifyContent: trailing ? 'space-between' : 'center', gap: 8,
  };
  const content = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
        {icon ? <Icon name={icon} size={fontSize + 3} color={fg} /> : null}
        <Txt v="pixel" size={fontSize} color={fg} style={glossy ? glossText(t) : null} numberOfLines={1}>{label}</Txt>
      </View>
      {trailing ? <Icon name={trailing} size={fontSize + 3} color={fg} /> : null}
    </>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={size === 'sm' ? 4 : 0}
      style={[block ? { alignSelf: 'stretch' } : null, style, disabled ? { opacity: 0.5 } : null]}
      {...rest}
    >
      {({ pressed }) => (
        <View style={{ transform: [{ translateY: pressed ? 1 : 0 }], opacity: pressed ? 0.88 : 1 }}>
          {glossy ? (
            <Gloss kind={kind} radius={radius} style={row}>{content}</Gloss>
          ) : (
            <View
              style={[row, {
                borderRadius: radius, borderWidth: 1.5,
                borderColor: kind === 'danger' ? t.status.dnf.fg : t.line,
                backgroundColor: kind === 'danger' ? t.status.dnf.bg : t.card,
                boxShadow: t.btnShadow,
              }]}
            >
              {content}
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, ghost, color, fill, size = 44 }: { icon: IconName; label: string; onPress: () => void; ghost?: boolean; color?: string; fill?: string; size?: number }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}>
      {({ pressed }) => (
        <View
          style={[
            { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' },
            ghost ? null : { borderWidth: 1.5, borderColor: t.line, backgroundColor: t.card, boxShadow: t.btnShadow },
            pressed ? { opacity: 0.7, transform: [{ translateY: 1 }] } : null,
          ]}
        >
          <Icon name={icon} size={22} color={color || t.ink} fill={fill} />
        </View>
      )}
    </Pressable>
  );
}

// `digits` shows the label in Press Start 2P, whose numbers are easier to tell apart than Pixelify Sans's.
export function Chip({ label, on, onPress, dot, tag, digits, accessibilityLabel }: { label: string; on?: boolean; onPress?: () => void; dot?: string; tag?: boolean; digits?: boolean; accessibilityLabel?: string }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      accessibilityLabel={accessibilityLabel || label}
      onPress={onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.75 } : null)}
    >
      {/* Selected chips become little glossy candies; tags rest soft pink, the rest white with a sky rim. */}
      {on ? (
        <Gloss style={[chipRow, { minHeight: tag ? 34 : 38, paddingHorizontal: tag ? 12 : 14 }]}>
          {dot ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: dot, borderWidth: 1, borderColor: t.glossInk }} /> : null}
          <Txt v={digits ? 'display' : 'bold'} size={digits ? 10 : tag ? 13 : 14} color={t.glossInk} style={glossText(t)}>{label}</Txt>
        </Gloss>
      ) : (
        <View
          style={[chipRow, {
            minHeight: tag ? 34 : 38, paddingHorizontal: tag ? 12 : 14, borderRadius: 999, borderWidth: 1.5,
            borderColor: tag ? t.pinkLine : t.sky, backgroundColor: tag ? t.pinkSoft : t.card,
          }]}
        >
          {dot ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: dot }} /> : null}
          <Txt v={digits ? 'display' : 'bold'} size={digits ? 10 : tag ? 13 : 14} color={tag ? t.pinkDeep : t.ink2}>{label}</Txt>
        </View>
      )}
    </Pressable>
  );
}

const chipRow: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 6 };

export function StatusBadge({ status }: { status: StatusKey }) {
  const t = useTheme();
  const c = t.status[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.fg }} />
      <Txt v="heavy" size={12} color={c.fg}>{statusLabel(status)}</Txt>
    </View>
  );
}

export function Badge({ label, kind = 'soft' }: { label: string; kind?: 'soft' | 'ongoing' }) {
  const t = useTheme();
  if (kind === 'ongoing') {
    return (
      <View style={[styles.badge, { borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.pinkDeep }]}>
        <Txt v="pixel" size={12} color={t.pinkDeep}>{label}</Txt>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: t.field }]}>
      <Txt v="pixel" size={12} color={t.ink2}>{label}</Txt>
    </View>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const t = useTheme();
  const initial = (name.trim()[0] || '?').toUpperCase();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: avatarColor(hashHue(name)),
        // Big profile avatars get a white frame and a glow, small list ones keep the plain outline.
        ...(size >= 64
          ? { borderWidth: 4, borderColor: t.card, boxShadow: `0px 0px 0px 1.5px ${t.line}, ${t.softShadow}` }
          : { borderWidth: 1.5, borderColor: t.line }),
      }}
    >
      <Txt v="pixel" size={size * 0.44} color="#2b2b3a">{initial}</Txt>
    </View>
  );
}

export type TextInputRef = ComponentRef<typeof TextInput>;

export function Input({ style, invalid, tall, multiline, onFocus, onBlur, ...rest }: TextInputProps & { invalid?: boolean; tall?: boolean; ref?: Ref<TextInputRef> }) {
  const t = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      placeholderTextColor={t.muted}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      onFocus={(e) => { setFocus(true); onFocus?.(e); }}
      onBlur={(e) => { setFocus(false); onBlur?.(e); }}
      style={[
        {
          minHeight: multiline ? (tall ? 200 : 130) : 48, borderRadius: 14, borderWidth: 1.5,
          borderColor: invalid ? t.status.dnf.fg : focus ? t.lav : t.softLine,
          backgroundColor: t.field, paddingHorizontal: 14, paddingVertical: multiline ? 12 : 10,
          fontFamily: fonts.body, fontSize: 16, color: t.ink,
        },
        style,
      ]}
      {...rest}
    />
  );
}

export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <SparkleIcon size={13} color={t.sparkle[2]} />
      <Txt v="pixel" size={16} accessibilityRole="header">{title}</Txt>
      <Svg height={4} style={{ flex: 1 }}>
        <Line x1={3} y1={2} x2="100%" y2={2} stroke={t.sky} strokeWidth={3} strokeLinecap="round" strokeDasharray="0.1 7" />
      </Svg>
      {right}
    </View>
  );
}

export function Label({ children, required }: { children: string; required?: boolean }) {
  const t = useTheme();
  return (
    <Txt v="pixel" size={14} style={{ marginBottom: 6, marginLeft: 4 }}>
      {children}{required ? <Txt v="pixel" size={14} color={t.pinkDeep}> *</Txt> : null}
    </Txt>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 26, paddingHorizontal: 10, borderRadius: 999 },
});

/* Four-point twinkle star. */
export function SparkleIcon({ size = 14, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z" fill={color} />
    </Svg>
  );
}
