import React from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type P = { color: ColorValue; size?: number };
const S = ({ size = 24, children }: { size?: number; children: React.ReactNode }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {children}
  </Svg>
);

export const IconHome = ({ color, size }: P) => (
  <S size={size}>
    <Path d="M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1v-8z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
  </S>
);
export const IconCalendar = ({ color, size }: P) => (
  <S size={size}>
    <Rect x={3.5} y={5} width={17} height={15} rx={2.5} stroke={color} strokeWidth={2} />
    <Path d="M3.5 10h17M8 3v4M16 3v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </S>
);
export const IconFlag = ({ color, size }: P) => (
  <S size={size}>
    <Path d="M5 21V4M5 4h11l-2 4 2 4H5" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
  </S>
);
export const IconChart = ({ color, size }: P) => (
  <S size={size}>
    <Path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </S>
);
export const IconUser = ({ color, size }: P) => (
  <S size={size}>
    <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={2} />
    <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </S>
);
