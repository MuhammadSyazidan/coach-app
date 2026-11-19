import { useColorScheme } from 'react-native';

const light = {
  bg: '#F6F5F2',
  card: '#FFFFFF',
  ink: '#16181D',
  muted: '#6A6F78',
  line: '#E4E2DD',
  accent: '#E4572E',
  accentInk: '#FFFFFF',
  accentSoft: '#FCE9E3',
  good: '#2F9E66',
  goodSoft: '#E3F4EA',
  warn: '#B97700',
  warnSoft: '#FBF0D9',
  bad: '#D64545',
  badSoft: '#FBE4E4',
  run: '#2F6FDB',
  runSoft: '#E4EDFC',
  strength: '#7B4FD0',
  strengthSoft: '#EEE7FA',
  zones: ['#9FB4C7', '#5B9BD5', '#2F9E66', '#E8A33C', '#D64545'],
};

export type Theme = typeof light;

const dark: Theme = {
  bg: '#101114',
  card: '#1A1C21',
  ink: '#F1F1F1',
  muted: '#A0A4AB',
  line: '#2A2D33',
  accent: '#FF6B42',
  accentInk: '#FFFFFF',
  accentSoft: '#3A2119',
  good: '#4CC38A',
  goodSoft: '#16301F',
  warn: '#E9B44C',
  warnSoft: '#33290F',
  bad: '#F06B6B',
  badSoft: '#3A1919',
  run: '#6B9BF2',
  runSoft: '#18243A',
  strength: '#A783F0',
  strengthSoft: '#261C3A',
  zones: ['#7E93A6', '#5B9BD5', '#4CC38A', '#E8A33C', '#F06B6B'],
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;
export const radius = { s: 8, m: 12, l: 18 } as const;
