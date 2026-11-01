/* Sky background, lace header, drifting clouds, sparkles and fic cover art. */
import { memo, useEffect, useId, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, G, Path, Pattern, Rect } from 'react-native-svg';
import { hashHue } from '@/lib/fic';
import { SparkleIcon, Txt } from './kit';
import { useTheme } from './theme';

// SVG ids are document-global on web, so every pattern gets a unique one.
const useSvgId = (name: string) => name + useId().replace(/[^a-zA-Z0-9]/g, '');

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

// The native animation driver doesn't exist on web.
const NATIVE = Platform.OS !== 'web';

/* 0 → 1 → 0 forever, unless the phone asks for less motion. */
function useLoop(duration: number, delay = 0) {
  const [v] = useState(() => new Animated.Value(0));
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) { v.setValue(0); return; }
    const ease = Easing.inOut(Easing.sin);
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration, easing: ease, useNativeDriver: NATIVE }),
      Animated.timing(v, { toValue: 0, duration, easing: ease, useNativeDriver: NATIVE }),
    ]));
    const timer = setTimeout(() => anim.start(), delay);
    return () => { clearTimeout(timer); anim.stop(); };
  }, [v, duration, delay, reduced]);
  return v;
}

const CLOUD = 'M24 56c-11 0-20-7-20-17s9-17 19-16c3-10 13-17 24-15 6-6 16-8 25-4 10 4 15 13 14 22 11 0 20 7 20 15s-8 15-18 15H24z';

/* Puffy cloud with a soft shadow under it, drifting slowly sideways. */
export function Cloud({ width, style, delay = 0, color }: { width: number; style?: ViewStyle; delay?: number; color?: string }) {
  const t = useTheme();
  const v = useLoop(9000, delay);
  const height = width / 2 + 5;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width, height, opacity: 0.92 }, style, { transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 24] }) }] }]}>
      <Svg width={width} height={height} viewBox="0 0 120 65">
        <G transform="translate(0, 5)"><Path d={CLOUD} fill={t.cloudShadow} /></G>
        <Path d={CLOUD} fill={color || t.cloud} />
      </Svg>
    </Animated.View>
  );
}

/* Four-point star that gently shrinks, turns and fades. */
export function Sparkle({ size, color, style, delay = 0 }: { size: number; color: string; style?: ViewStyle; delay?: number }) {
  const v = useLoop(1400, delay);
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute' }, style, {
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }),
        transform: [
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }) },
          { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '20deg'] }) },
        ],
      }]}
    >
      <SparkleIcon size={size} color={color} />
    </Animated.View>
  );
}

/* Gradient + polka dots + cloud bank, with a few drifting clouds and sparkles. */
export const Sky = memo(function Sky() {
  const t = useTheme();
  const { width, height } = useWindowDimensions();
  const dots = useSvgId('dots');
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[t.sky1, t.sky2]} style={StyleSheet.absoluteFill} />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id={dots} width={26} height={26} patternUnits="userSpaceOnUse">
            <Circle cx={6} cy={6} r={2.4} fill={t.dot} />
            <Circle cx={19} cy={19} r={2.4} fill={t.dot} />
          </Pattern>
        </Defs>
        <Rect width={width} height={height} fill={`url(#${dots})`} />
        {[0.1, 0.3, 0.52, 0.74, 0.94].map((x, i) => (
          <Ellipse key={i} cx={width * x} cy={height - 18 + (i % 2) * 8} rx={58 + (i % 3) * 14} ry={40 + (i % 2) * 8} fill={t.cloud} opacity={0.85} />
        ))}
      </Svg>
      <Cloud width={150} style={{ left: -40, top: height * 0.5 }} />
      <Cloud width={110} style={{ right: '4%', top: height * 0.24 }} delay={3000} />
      <Cloud width={190} style={{ right: -60, top: height * 0.72 }} delay={6000} />
      <Sparkle size={22} color={t.sparkle[0]} style={{ left: '8%', top: height * 0.34 }} />
      <Sparkle size={15} color={t.sparkle[1]} style={{ right: '12%', top: height * 0.56 }} delay={500} />
      <Sparkle size={18} color={t.sparkle[2]} style={{ left: '16%', top: height * 0.8 }} delay={1000} />
    </View>
  );
});

/* White panel with an eyelet dot ribbon and a scalloped bottom edge that casts a soft shadow. */
export function Lace({ children }: { children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const eyelet = useSvgId('eyelet');
  const scallop = useSvgId('scallop');
  const scallopShadow = useSvgId('scallopShadow');
  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{ backgroundColor: t.panel, paddingTop: insets.top + 14, paddingHorizontal: 16, paddingBottom: 20 }}>
        {children}
        <Svg width={width} height={6} style={{ position: 'absolute', left: 0, bottom: 6 }}>
          <Defs>
            <Pattern id={eyelet} width={14} height={6} patternUnits="userSpaceOnUse">
              <Circle cx={7} cy={3} r={2} fill={t.sky1} />
            </Pattern>
          </Defs>
          <Rect width={width} height={6} fill={`url(#${eyelet})`} />
        </Svg>
      </View>
      <Svg width={width} height={16}>
        <Defs>
          <Pattern id={scallopShadow} width={22} height={16} patternUnits="userSpaceOnUse">
            <Circle cx={11} cy={2} r={12} fill={t.cloudShadow} />
          </Pattern>
          <Pattern id={scallop} width={22} height={16} patternUnits="userSpaceOnUse">
            <Circle cx={11} cy={0} r={11} fill={t.panel} />
          </Pattern>
        </Defs>
        <Rect width={width} height={16} fill={`url(#${scallopShadow})`} />
        <Rect width={width} height={16} fill={`url(#${scallop})`} />
      </Svg>
    </View>
  );
}

export function ScreenTitle({ children, left }: { children: string; left?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {left}
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt v="display" size={15} accessibilityRole="header" style={{ flexShrink: 1 }}>{children}</Txt>
        <SparkleIcon size={14} color={t.sparkle[0]} />
      </View>
    </View>
  );
}

/* Dreamy gradient + checkerboard with clouds and sparkles, seeded by the fic so each one has its own look. */
export function Cover({ seed, seed2, children }: { seed: string; seed2: string; children?: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const h1 = hashHue(seed, 1), h2 = hashHue(seed + seed2, 7);
  const height = 170 + insets.top;
  const check = useSvgId('check');
  const pos = (i: number) => ({ left: `${(hashHue(seed, i + 11) % 80) + 4}%` as const, top: insets.top + 40 + (hashHue(seed2, i + 3) % 70) });
  return (
    <View style={{ height, borderBottomWidth: 1.5, borderColor: t.line, overflow: 'hidden' }}>
      <LinearGradient
        colors={[`hsl(${h1}, ${t.cover.s}%, ${t.cover.l1}%)`, `hsl(${h2}, ${t.cover.s - 5}%, ${t.cover.l2}%)`]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id={check} width={28} height={28} patternUnits="userSpaceOnUse">
            <Rect x={0} y={0} width={14} height={14} fill={t.cover.check} />
            <Rect x={14} y={14} width={14} height={14} fill={t.cover.check} />
          </Pattern>
        </Defs>
        <Rect width={width} height={height} fill={`url(#${check})`} />
      </Svg>
      <Cloud width={110} color="#ffffff" style={{ left: -30, top: height - 62, opacity: t.dark ? 0.35 : 0.85 }} />
      <Cloud width={80} color="#ffffff" style={{ right: 10, top: insets.top + 52, opacity: t.dark ? 0.3 : 0.75 }} delay={4000} />
      {[22, 14, 18, 12].map((size, i) => (
        <Sparkle key={i} size={size} color={i % 2 ? '#ffffff' : t.sparkle[0]} style={pos(i)} delay={i * 350} />
      ))}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
        {children}
      </View>
    </View>
  );
}
