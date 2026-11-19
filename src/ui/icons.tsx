import React from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type P = { color: ColorValue; size?: number };
const S = ({ size = 24, children }: { size?: number; children: React.ReactNode }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {children}
  </Svg>
);
const sw = 1.9;

export const IconToday = ({ color, size }: P) => (
  <S size={size}>
    <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={sw} />
    <Path d="M13 6.5l-4 6h3.5l-1 5 4-6.2H12l1-4.8z" fill={color} />
  </S>
);
export const IconCalendar = ({ color, size }: P) => (
  <S size={size}>
    <Rect x={3.5} y={5} width={17} height={15} rx={2.5} stroke={color} strokeWidth={sw} />
    <Path d="M3.5 10h17M8 3v4M16 3v4" stroke={color} strokeWidth={sw} strokeLinecap="round" />
  </S>
);
export const IconList = ({ color, size }: P) => (
  <S size={size}>
    <Rect x={4.5} y={3.5} width={15} height={17} rx={2} stroke={color} strokeWidth={sw} />
    <Path d="M8 8h8M8 12h8M8 16h5" stroke={color} strokeWidth={sw} strokeLinecap="round" />
  </S>
);
export const IconFlag = ({ color, size }: P) => (
  <S size={size}>
    <Path d="M5 21V4M5 4h11l-2 4 2 4H5" stroke={color} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
  </S>
);
export const IconUser = ({ color, size }: P) => (
  <S size={size}>
    <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={sw} />
    <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke={color} strokeWidth={sw} strokeLinecap="round" />
  </S>
);
export const IconChart = ({ color, size }: P) => (
  <S size={size}>
    <Path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke={color} strokeWidth={sw} strokeLinecap="round" />
  </S>
);
export const IconChevron = ({ color, size }: P) => (
  <S size={size}>
    <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </S>
);
export const IconWatch = ({ color, size }: P) => (
  <S size={size}>
    <Path d="M9 3h6l1 3.2M9 3L8 6.2M9 21h6l1-3.2M9 21l-1-3.2" stroke={color} strokeWidth={sw} strokeLinejoin="round" />
    <Circle cx={12} cy={12} r={6} stroke={color} strokeWidth={sw} />
    <Path d="M9.5 12l1.8 1.8 3.2-3.6" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </S>
);
export const IconRun = ({ color, size }: P) => (
  <S size={size}>
    <Circle cx={15} cy={4.5} r={2} fill={color} />
    <Path d="M6 21l3.5-5.5 3 2.5 1-6.5 3 3h3M8.5 10.5L12 8l1.5 4" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
  </S>
);
export const IconDumbbell = ({ color, size }: P) => (
  <S size={size}>
    <Path d="M8 12h8" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    <Rect x={4.5} y={7} width={3.5} height={10} rx={1.2} fill={color} />
    <Rect x={16} y={7} width={3.5} height={10} rx={1.2} fill={color} />
    <Path d="M2.5 10v4M21.5 10v4" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
  </S>
);
export const IconLoad = ({ color, size }: P) => (
  <S size={size}>
    <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={sw} />
    <Path d="M8 15V9M12 15v-4M16 15V7.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" />
  </S>
);
export const IconTrend = ({ color, size }: P) => (
  <S size={size}>
    <Path d="M3 19h4v-4h4v-4h4V7h6" stroke={color} strokeWidth={2.1} strokeLinejoin="round" strokeLinecap="round" />
    <Path d="M17 4h4v4" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
  </S>
);
export const IconHeart = ({ color, size }: P) => (
  <S size={size}>
    <Path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0112 7.3 4.3 4.3 0 0119.5 10c0 5.4-7.5 10-7.5 10z" fill={color} />
  </S>
);
export const IconLink = ({ color, size }: P) => (
  <S size={size}>
    <Path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" stroke={color} strokeWidth={sw} strokeLinecap="round" />
  </S>
);
export const IconBell = ({ color, size }: P) => (
  <S size={size}>
    <Path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15L6 16zM10 20.5a2 2 0 004 0" stroke={color} strokeWidth={sw} strokeLinejoin="round" />
  </S>
);
export const IconMoon = ({ color, size }: P) => (
  <S size={size}>
    <Path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" fill={color} />
  </S>
);
export const IconBook = ({ color, size }: P) => (
  <S size={size}>
    <Path d="M5 4.5A1.5 1.5 0 016.5 3H19v15H6.5A1.5 1.5 0 005 19.5v-15zM5 19.5A1.5 1.5 0 006.5 21H19" stroke={color} strokeWidth={sw} strokeLinejoin="round" />
  </S>
);
export const IconStar = ({ color, size }: P) => (
  <S size={size}>
    <Path d="M12 3l2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.8L12 3z" fill={color} />
  </S>
);
export const IconDownload = ({ color, size }: P) => (
  <S size={size}>
    <Path d="M12 4v11M7 10l5 5 5-5M5 20h14" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </S>
);
export const IconTrash = ({ color, size }: P) => (
  <S size={size}>
    <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke={color} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
  </S>
);
export const IconEdit = ({ color, size }: P) => (
  <S size={size}>
    <Path d="M4 20h4L19 9l-4-4L4 16v4z" stroke={color} strokeWidth={sw} strokeLinejoin="round" />
  </S>
);
export const IconMountain = ({ color, size }: P) => (
  <S size={size}>
    <Path d="M2 20l7-12 4 6 2.5-3.5L22 20H2z" fill={color} />
  </S>
);
