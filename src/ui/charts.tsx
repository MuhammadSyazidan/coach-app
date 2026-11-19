import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { T } from './kit';
import { useTheme } from './theme';

/** Grafik batang sederhana: satu nilai per label. */
export function BarChart({ values, labels, unit, height = 140, highlightLast = true }: { values: number[]; labels: string[]; unit: string; height?: number; highlightLast?: boolean }) {
  const t = useTheme();
  const w = 320;
  const max = Math.max(1, ...values);
  const bw = w / Math.max(1, values.length);
  return (
    <View>
      <Svg width="100%" height={height + 22} viewBox={`0 0 ${w} ${height + 22}`}>
        <Line x1={0} x2={w} y1={height} y2={height} stroke={t.line} strokeWidth={1} />
        {values.map((v, i) => {
          const h = (v / max) * (height - 18);
          const last = highlightLast && i === values.length - 1;
          return (
            <React.Fragment key={i}>
              <Rect x={i * bw + bw * 0.18} y={height - h} width={bw * 0.64} height={h} rx={4} fill={last ? t.accent : t.run} opacity={last ? 1 : 0.75} />
              {v > 0 ? (
                <SvgText x={i * bw + bw / 2} y={height - h - 4} fontSize={10} fill={t.muted} textAnchor="middle">
                  {Math.round(v)}
                </SvgText>
              ) : null}
              <SvgText x={i * bw + bw / 2} y={height + 15} fontSize={10} fill={t.muted} textAnchor="middle">
                {labels[i]}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
      <T size="tiny" color="muted">{unit}</T>
    </View>
  );
}

/** Batang bertumpuk untuk distribusi zona (proporsi 0-1). */
export function ZoneBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const t = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row', height: 18, borderRadius: 9, overflow: 'hidden', backgroundColor: t.line }}>
        {parts.map((p) => (p.value > 0 ? <View key={p.label} style={{ flex: p.value, backgroundColor: p.color }} /> : null))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
        {parts.map((p) => (
          <View key={p.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.color }} />
            <T size="small">{`${p.label} ${Math.round(p.value * 100)}%`}</T>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Profil elevasi dengan batas segmen. */
export function ElevationChart({ km, ele, cuts, height = 120 }: { km: number[]; ele: number[]; cuts: number[]; height?: number }) {
  const t = useTheme();
  if (km.length < 2) return null;
  const w = 320;
  const total = km[km.length - 1] || 1;
  const lo = Math.min(...ele);
  const hi = Math.max(...ele);
  const span = Math.max(20, hi - lo);
  const step = Math.max(1, Math.floor(km.length / 300));
  const X = (x: number) => (x / total) * w;
  const Y = (e: number) => height - 16 - ((e - lo) / span) * (height - 30);
  let d = `M0 ${height - 16}`;
  for (let i = 0; i < km.length; i += step) d += ` L${X(km[i]).toFixed(1)} ${Y(ele[i]).toFixed(1)}`;
  d += ` L${w} ${Y(ele[ele.length - 1]).toFixed(1)} L${w} ${height - 16} Z`;
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}>
      <Path d={d} fill={t.accentSoft} stroke={t.accent} strokeWidth={1.5} />
      {cuts.map((c, i) => (
        <Line key={i} x1={X(c)} x2={X(c)} y1={8} y2={height - 16} stroke={t.line} strokeWidth={1} strokeDasharray="3 3" />
      ))}
      <SvgText x={2} y={height - 3} fontSize={10} fill={t.muted}>0 km</SvgText>
      <SvgText x={w - 2} y={height - 3} fontSize={10} fill={t.muted} textAnchor="end">{`${total.toFixed(1)} km`}</SvgText>
      <SvgText x={2} y={10} fontSize={10} fill={t.muted}>{`${Math.round(hi)} m`}</SvgText>
    </Svg>
  );
}

/** Cincin progres 270° (gaya gauge halaman Today). progress 0..1 */
export function Ring({ progress, size = 220, stroke = 12, children }: { progress: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const t = useTheme();
  const r = (size - stroke) / 2;
  const c = size / 2;
  const start = 135; // derajat, mulai kiri bawah
  const sweep = 270;
  const p = Math.max(0, Math.min(1, progress));
  const pt = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return [c + r * Math.cos(rad), c + r * Math.sin(rad)];
  };
  const arc = (from: number, to: number) => {
    const [x1, y1] = pt(from);
    const [x2, y2] = pt(to);
    const large = to - from > 180 ? 1 : 0;
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };
  return (
    <View style={{ width: size, height: size * 0.86, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', top: 0 }}>
        <Path d={arc(start, start + sweep)} stroke={t.cardAlt} strokeWidth={stroke} strokeLinecap="round" fill="none" />
        {p > 0.005 ? <Path d={arc(start, start + sweep * p)} stroke={t.highlight} strokeWidth={stroke} strokeLinecap="round" fill="none" /> : null}
      </Svg>
      <View style={{ alignItems: 'center', marginTop: -size * 0.08 }}>{children}</View>
    </View>
  );
}

/** Batang tipis per hari dengan label huruf di bawah (beban harian). */
export function MiniBars({ values, labels, highlight, height = 72, color }: { values: number[]; labels: string[]; highlight?: number; height?: number; color?: string }) {
  const t = useTheme();
  const max = Math.max(1, ...values);
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'flex-end' }}>
      {values.map((v, i) => (
        <View key={i} style={{ alignItems: 'center', gap: 6, width: 20 }}>
          <View style={{ width: 8, height, borderRadius: 4, backgroundColor: t.cardAlt, justifyContent: 'flex-end', overflow: 'hidden' }}>
            {v > 0 ? <View style={{ height: Math.max(4, (v / max) * height), backgroundColor: color ?? t.highlight, borderRadius: 4 }} /> : null}
          </View>
          <T size="tiny" color={i === highlight ? 'ink' : 'muted'} weight={i === highlight ? '700' : '400'}>{labels[i]}</T>
        </View>
      ))}
    </View>
  );
}
