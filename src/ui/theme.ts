import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

// Gaya visual: latar hitam pekat dengan kartu abu gelap dan angka besar (terinspirasi aplikasi jam olahraga),
// plus mode terang dengan struktur yang sama.

const dark = {
  bg: '#000000',
  card: '#1C1C1E',
  cardAlt: '#2C2C2E',
  ink: '#FFFFFF',
  muted: '#8E8E93',
  line: '#2C2C2E',
  accent: '#FF6A2B',
  accentInk: '#FFFFFF',
  accentSoft: '#3A1E12',
  highlight: '#F4BE45',
  good: '#30D158',
  goodSoft: '#12301B',
  warn: '#FF9F0A',
  warnSoft: '#3A2A0D',
  bad: '#FF453A',
  badSoft: '#3A1513',
  run: '#FFB020',
  runSoft: '#3A2D0D',
  strength: '#BF5AF2',
  strengthSoft: '#2E1838',
  info: '#40C8E0',
  zones: ['#8E8E93', '#40C8E0', '#30D158', '#FF9F0A', '#FF453A'],
  tabBar: '#121212',
  statusBar: 'light' as 'light' | 'dark',
};

export type Theme = typeof dark;

const light: Theme = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  cardAlt: '#E9E9EE',
  ink: '#000000',
  muted: '#6C6C70',
  line: '#E1E1E6',
  accent: '#F25A1C',
  accentInk: '#FFFFFF',
  accentSoft: '#FDE8DE',
  highlight: '#E0A11B',
  good: '#24A148',
  goodSoft: '#E1F5E6',
  warn: '#D97B00',
  warnSoft: '#FDF0DC',
  bad: '#E0352B',
  badSoft: '#FCE3E1',
  run: '#E08A00',
  runSoft: '#FCF0D9',
  strength: '#9B3FD1',
  strengthSoft: '#F1E4F9',
  info: '#1595B0',
  zones: ['#A1A1A6', '#1595B0', '#24A148', '#E08A00', '#E0352B'],
  tabBar: '#FFFFFF',
  statusBar: 'dark',
};

export type ThemeMode = 'sistem' | 'gelap' | 'terang';

export const ThemeModeContext = createContext<ThemeMode>('sistem');

export function useIsDark(): boolean {
  const mode = useContext(ThemeModeContext);
  const sys = useColorScheme();
  return mode === 'gelap' || (mode === 'sistem' && sys !== 'light');
}

export function useTheme(): Theme {
  return useIsDark() ? dark : light;
}

/** Font angka besar (condensed). Fallback ke font sistem sampai font termuat. */
export const NUM_FONT = 'BarlowCondensed_700Bold';
export const NUM_FONT_SEMI = 'BarlowCondensed_600SemiBold';

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;
export const radius = { s: 8, m: 12, l: 16 } as const;
