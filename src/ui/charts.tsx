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
