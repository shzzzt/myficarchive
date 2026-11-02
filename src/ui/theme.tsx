import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import type { StatusKey } from '@/lib/fic';

export type ThemePref = 'system' | 'light' | 'dark';

/* A palette is three hues: the main accent (buttons, highlights), a second accent, and the sky behind everything. */
export interface Hues { accent: number; accent2: number; sky: number }
export type PaletteKey = 'candy' | 'peach' | 'mint' | 'lilac' | 'ocean' | 'lemon' | 'custom';

export const PALETTES: { k: PaletteKey; label: string; hues: Hues }[] = [
  { k: 'candy', label: 'Candy', hues: { accent: 330, accent2: 220, sky: 220 } },
  { k: 'peach', label: 'Peach', hues: { accent: 12, accent2: 38, sky: 25 } },
  { k: 'mint', label: 'Mint', hues: { accent: 158, accent2: 190, sky: 150 } },
  { k: 'lilac', label: 'Lilac', hues: { accent: 278, accent2: 320, sky: 262 } },
  { k: 'ocean', label: 'Ocean', hues: { accent: 196, accent2: 232, sky: 205 } },
  { k: 'lemon', label: 'Lemon', hues: { accent: 44, accent2: 340, sky: 52 } },
];
export const DEFAULT_CUSTOM: Hues = { accent: 345, accent2: 95, sky: 100 };

const light = {
  dark: false,
  sky1: '#c4d8ff',
  sky2: '#e4ecff',
  dot: 'rgba(255,255,255,0.6)',
  cloud: '#ffffff',
  panel: '#ffffff',
  card: '#ffffff',
  ink: '#2b2b3a',
  ink2: '#555571',
  muted: '#7d7d9c',
  line: '#2b2b3a',
  softLine: '#dcdcef',
  field: '#f5f6ff',
  pink: '#ff8fc7',
  pinkDeep: '#e0559f',
  pinkInk: '#ffffff',
  pinkShadow: 'rgba(160,30,100,0.6)',
  blue: '#8db1f7',
  blueDeep: '#5f8ee8',
  lav: '#b8a6f7',
  lavSoft: '#eee9ff',
  star: '#ffb6d9',
  starLine: '#e2569f',
  shadow: 'rgba(43,43,58,0.18)',
  scrim: 'rgba(28,31,61,0.42)',
  // Glossy candy buttons and soft blue-glow shadows.
  gloss: { pink: ['#ffa6d2', '#e4569c'], blue: ['#a9c5f7', '#4f7fd6'] } as Record<'pink' | 'blue', [string, string]>,
  rim: 'rgba(255,255,255,0.9)',
  shine: ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0)'] as [string, string],
  glossInk: '#ffffff',
  glossTextShadow: 'rgba(47,47,69,0.3)',
  cardShadow: '0px 4px 0px rgba(47,47,69,0.08), 0px 12px 28px rgba(79,127,214,0.18)',
  btnShadow: '0px 0px 0px 1px rgba(47,47,69,0.12), 0px 4px 10px rgba(79,127,214,0.25)',
  softShadow: '0px 6px 14px rgba(79,127,214,0.22)',
  cloudShadow: 'rgba(79,127,214,0.16)',
  sparkle: ['#ffa6d2', '#ffffff', '#6f9be8'],
  sky: '#a9c5f7',
  pinkSoft: '#fff0f7',
  pinkLine: '#ffa6d2',
  cover: { s: 85, l1: 84, l2: 88, check: 'rgba(255,255,255,0.22)' },
  status: {
    want: { bg: '#ece6ff', fg: '#6145cf' },
    reading: { bg: '#d9e7ff', fg: '#2a5fc6' },
    finished: { bg: '#d5f3e3', fg: '#1f7d51' },
    hold: { bg: '#fff0c7', fg: '#8f5f00' },
    dnf: { bg: '#ffdfe6', fg: '#be3456' },
  } as Record<StatusKey, { bg: string; fg: string }>,
};

export type Theme = typeof light;

const darkTheme: Theme = {
  dark: true,
  sky1: '#1c1f3d',
  sky2: '#2b2752',
  dot: 'rgba(190,180,255,0.12)',
  cloud: '#3a3770',
  panel: '#26284a',
  card: '#2a2c50',
  ink: '#f0eeff',
  ink2: '#c9c6ec',
  muted: '#a3a0cf',
  line: '#8c88d6',
  softLine: '#403f72',
  field: '#1f2142',
  pink: '#ff93cc',
  pinkDeep: '#ff79bf',
  pinkInk: '#2b1530',
  pinkShadow: 'transparent',
  blue: '#7ea3f0',
  blueDeep: '#9bb9ff',
  lav: '#a995ff',
  lavSoft: '#36325f',
  star: '#ff93cc',
  starLine: '#ffb3dc',
  shadow: 'rgba(0,0,0,0.35)',
  scrim: 'rgba(8,8,20,0.6)',
  gloss: { pink: ['#ffa6d2', '#d94f95'], blue: ['#9bb9ff', '#4a6fd0'] },
  rim: 'rgba(255,255,255,0.55)',
  shine: ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)'],
  glossInk: '#ffffff',
  glossTextShadow: 'rgba(20,10,40,0.45)',
  cardShadow: '0px 4px 0px rgba(0,0,0,0.22), 0px 12px 28px rgba(8,6,30,0.45)',
  btnShadow: '0px 0px 0px 1px rgba(0,0,0,0.35), 0px 4px 12px rgba(169,149,255,0.25)',
  softShadow: '0px 6px 14px rgba(8,6,30,0.4)',
  cloudShadow: 'rgba(8,6,30,0.35)',
  sparkle: ['#ff93cc', '#d9d2ff', '#7ea3f0'],
  sky: '#5b5a9e',
  pinkSoft: '#42284a',
  pinkLine: '#a0508a',
  cover: { s: 35, l1: 30, l2: 36, check: 'rgba(255,255,255,0.05)' },
  status: {
    want: { bg: '#3b3270', fg: '#d2c6ff' },
    reading: { bg: '#263f74', fg: '#bcd3ff' },
    finished: { bg: '#1f4a3a', fg: '#a5ecc6' },
    hold: { bg: '#4d3d17', fg: '#ffdc8a' },
    dnf: { bg: '#5a2638', fg: '#ffb8c9' },
  },
};

/* ---- Palette generator: rebuilds the Candy recipe above around any three hues. ---- */

const rgbOf = (h: number, s: number, l: number): [number, number, number] => {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255)) as [number, number, number];
};
const lum = (h: number, s: number, l: number) => {
  const [r, g, b] = rgbOf(h, s, l).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const hex = (h: number, s: number, l: number) => '#' + rgbOf(h, s, l).map((v) => v.toString(16).padStart(2, '0')).join('');
const rgba = (h: number, s: number, l: number, a: number) => `rgba(${rgbOf(h, s, l).join(',')},${a})`;
// Yellows and greens are much brighter than pink at the same lightness; darken them until white text and text on cards still read.
const capped = (h: number, s: number, l: number, maxLum: number) => {
  while (l > 20 && lum(h, s, l) > maxLum) l -= 1;
  return hex(h, s, l);
};

export function makeTheme(dark: boolean, { accent: a, accent2: b, sky: s }: Hues): Theme {
  const l = (s + 35) % 360; // lavender sits a little past the sky
  if (!dark) {
    return {
      ...light,
      sky1: hex(s, 100, 88), sky2: hex(s, 100, 95),
      ink: hex(s, 15, 20), ink2: hex(s, 14, 39), muted: hex(s, 15, 55), line: hex(s, 15, 20),
      softLine: hex(s, 45, 90), field: hex(s, 100, 98),
      pink: hex(a, 100, 78), pinkDeep: capped(a, 69, 61, 0.2), pinkShadow: rgba(a, 68, 37, 0.6),
      blue: hex(b, 87, 76), blueDeep: capped(b, 75, 64, 0.22),
      lav: hex(l, 85, 81), lavSoft: hex(l, 100, 96),
      star: hex(a, 100, 86), starLine: capped(a, 73, 61, 0.22),
      shadow: rgba(s, 15, 20, 0.18), scrim: rgba(s, 37, 17, 0.42),
      gloss: { pink: [hex(a, 100, 83), capped(a, 72, 62, 0.25)], blue: [hex(b, 82, 82), capped(b, 62, 57, 0.25)] },
      glossTextShadow: rgba(s, 19, 23, 0.3),
      cardShadow: `0px 4px 0px ${rgba(s, 19, 23, 0.08)}, 0px 12px 28px ${rgba(b, 62, 57, 0.18)}`,
      btnShadow: `0px 0px 0px 1px ${rgba(s, 19, 23, 0.12)}, 0px 4px 10px ${rgba(b, 62, 57, 0.25)}`,
      softShadow: `0px 6px 14px ${rgba(b, 62, 57, 0.22)}`,
      cloudShadow: rgba(b, 62, 57, 0.16),
      sparkle: [hex(a, 100, 83), '#ffffff', hex(b, 72, 67)],
      sky: hex(b, 82, 82), pinkSoft: hex(a, 100, 97), pinkLine: hex(a, 100, 83),
    };
  }
  const n = (s + 15) % 360;
  return {
    ...darkTheme,
    sky1: hex(s, 37, 17), sky2: hex((s + 12) % 360, 36, 24),
    dot: rgba(l, 100, 85, 0.12), cloud: hex((s + 10) % 360, 34, 33),
    panel: hex(s, 32, 22), card: hex(s, 31, 24),
    ink: hex(n, 100, 97), ink2: hex(n, 55, 85), muted: hex(n, 35, 72), line: hex(n, 50, 69),
    softLine: hex((s + 5) % 360, 29, 35), field: hex(s, 35, 19),
    pink: hex(a, 100, 79), pinkDeep: hex(a, 100, 74), pinkInk: hex(a, 39, 14),
    blue: hex(b, 79, 72), blueDeep: hex(b, 100, 80),
    lav: hex(l, 100, 79), lavSoft: hex(l, 31, 28),
    star: hex(a, 100, 79), starLine: hex(a, 100, 85),
    scrim: rgba(s, 43, 6, 0.6),
    gloss: { pink: [hex(a, 100, 83), capped(a, 64, 58, 0.25)], blue: [hex(b, 100, 80), capped(b, 59, 55, 0.25)] },
    glossTextShadow: rgba(l, 60, 10, 0.45),
    cardShadow: `0px 4px 0px rgba(0,0,0,0.22), 0px 12px 28px ${rgba(s, 67, 7, 0.45)}`,
    btnShadow: `0px 0px 0px 1px rgba(0,0,0,0.35), 0px 4px 12px ${rgba(l, 100, 79, 0.25)}`,
    softShadow: `0px 6px 14px ${rgba(s, 67, 7, 0.4)}`,
    cloudShadow: rgba(s, 67, 7, 0.35),
    sparkle: [hex(a, 100, 79), hex(l, 100, 91), hex(b, 79, 72)],
    sky: hex((s + 5) % 360, 27, 49), pinkSoft: hex(a, 30, 22), pinkLine: hex(a, 33, 47),
  };
}

export const paletteHues = (k: PaletteKey, custom: Hues) => (k === 'custom' ? custom : (PALETTES.find((p) => p.k === k) ?? PALETTES[0]).hues);

// Candy keeps its hand-tuned colors; everything else is generated.
export const themeFor = (dark: boolean, k: PaletteKey, custom: Hues): Theme =>
  k === 'candy' ? (dark ? darkTheme : light) : makeTheme(dark, paletteHues(k, custom));

/* A plain swatch for a hue, for hue pickers. */
export const hueSwatch = (h: number, dark: boolean) => hex(h, dark ? 85 : 90, dark ? 70 : 72);

// Press Start 2P for display text, Pixelify Sans for UI labels, Nunito for long reading text and inputs.
export const fonts = {
  display: 'PressStart2P_400Regular',
  pixel: 'PixelifySans_400Regular',
  semi: 'PixelifySans_500Medium',
  bold: 'PixelifySans_600SemiBold',
  heavy: 'PixelifySans_700Bold',
  body: 'Nunito_400Regular',
};

const ThemeCtx = createContext<Theme>(light);

export function ThemeProvider({ pref, palette = 'candy', custom = DEFAULT_CUSTOM, children }: { pref: ThemePref; palette?: PaletteKey; custom?: Hues; children: ReactNode }) {
  const system = useColorScheme();
  const isDark = pref === 'dark' || (pref === 'system' && system === 'dark');
  const { accent, accent2, sky } = custom;
  const theme = useMemo(() => themeFor(isDark, palette, { accent, accent2, sky }), [palette, isDark, accent, accent2, sky]);
  return <ThemeCtx.Provider value={theme}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);

export const avatarColor = (hue: number) => `hsl(${hue}, 85%, 85%)`;

export const TAB_BAR_HEIGHT = 68;
