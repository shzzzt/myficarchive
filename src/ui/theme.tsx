import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import type { StatusKey } from '@/lib/fic';

export type ThemePref = 'system' | 'light' | 'dark';

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

const dark: Theme = {
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

export function ThemeProvider({ pref, children }: { pref: ThemePref; children: ReactNode }) {
  const system = useColorScheme();
  const isDark = pref === 'dark' || (pref === 'system' && system === 'dark');
  return <ThemeCtx.Provider value={isDark ? dark : light}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);

export const avatarColor = (hue: number) => `hsl(${hue}, 85%, 85%)`;

export const TAB_BAR_HEIGHT = 68;
