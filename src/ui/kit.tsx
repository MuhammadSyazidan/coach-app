import React from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, space, useTheme } from './theme';

export function Screen({ title, subtitle, children, right, scroll = true, inset = true }: { title?: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode; scroll?: boolean; inset?: boolean }) {
  const t = useTheme();
  const header = title ? (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: t.ink }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: t.muted }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  ) : null;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={inset ? ['top'] : []}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }]}>
          {header}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, onPress, tone }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tone?: 'accent' | 'good' | 'warn' | 'bad' }) {
  const t = useTheme();
  const bg = tone === 'accent' ? t.accentSoft : tone === 'good' ? t.goodSoft : tone === 'warn' ? t.warnSoft : tone === 'bad' ? t.badSoft : t.card;
  const body = <View style={[styles.card, { backgroundColor: bg, borderColor: tone ? 'transparent' : t.line }, style]}>{children}</View>;
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })} accessibilityRole="button">
      {body}
    </Pressable>
  );
}

export function T({ children, size = 'body', color, weight, style, numberOfLines }: { children: React.ReactNode; size?: 'title' | 'h' | 'body' | 'small' | 'tiny' | 'big'; color?: 'ink' | 'muted' | 'accent' | 'good' | 'warn' | 'bad' | 'run' | 'strength'; weight?: '400' | '500' | '600' | '700'; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  const t = useTheme();
  const sz = { big: 34, title: 24, h: 17, body: 15, small: 13, tiny: 11.5 }[size];
  const lh = Math.round(sz * 1.35);
  const fw = weight ?? (size === 'title' || size === 'h' || size === 'big' ? '700' : '400');
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontSize: sz, lineHeight: lh, fontWeight: fw, color: t[color ?? 'ink'] }, style]}>
      {children}
    </Text>
  );
}

export function Button({ title, onPress, kind = 'primary', disabled, loading, style, small }: { title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.accent : kind === 'danger' ? t.badSoft : kind === 'secondary' ? t.card : 'transparent';
  const fg = kind === 'primary' ? t.accentInk : kind === 'danger' ? t.bad : kind === 'secondary' ? t.ink : t.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, borderColor: kind === 'secondary' ? t.line : 'transparent', opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 14 : 16 }}>{title}</Text>}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, tone }: { label: string; selected?: boolean; onPress?: () => void; tone?: 'run' | 'strength' }) {
  const t = useTheme();
  const on = tone === 'run' ? t.run : tone === 'strength' ? t.strength : t.accent;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, { backgroundColor: selected ? on : t.card, borderColor: selected ? on : t.line }]}>
      <Text style={{ color: selected ? '#fff' : t.ink, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

/** Skala ketuk 1..n dengan label di ujung. */
export function Scale({ value, onChange, from = 1, to = 5, left, right, labels }: { value?: number; onChange: (v: number) => void; from?: number; to?: number; left?: string; right?: string; labels?: string[] }) {
  const t = useTheme();
  const items = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {items.map((v, i) => {
          const on = value === v;
          return (
            <Pressable
              key={v}
              onPress={() => onChange(v)}
              accessibilityRole="button"
              accessibilityLabel={labels?.[i] ?? String(v)}
              style={[styles.scaleItem, { backgroundColor: on ? t.accent : t.card, borderColor: on ? t.accent : t.line }]}>
              <Text style={{ color: on ? '#fff' : t.ink, fontWeight: '700' }}>{labels?.[i] ?? v}</Text>
            </Pressable>
          );
        })}
      </View>
      {left || right ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <T size="tiny" color="muted">{left}</T>
          <T size="tiny" color="muted">{right}</T>
        </View>
      ) : null}
    </View>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99, step = 1, suffix }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  const t = useTheme();
  const btn = (label: string, next: number, disabled: boolean) => (
    <Pressable
      onPress={() => !disabled && onChange(Math.round(next * 100) / 100)}
      accessibilityRole="button"
      accessibilityLabel={label === '−' ? 'Kurangi' : 'Tambah'}
      style={[styles.stepBtn, { borderColor: t.line, backgroundColor: t.card, opacity: disabled ? 0.4 : 1 }]}>
      <Text style={{ color: t.ink, fontSize: 20, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {btn('−', value - step, value - step < min)}
      <Text style={{ color: t.ink, fontSize: 18, fontWeight: '700', minWidth: 56, textAlign: 'center' }}>
        {value}
        {suffix ? ` ${suffix}` : ''}
      </Text>
      {btn('+', value + step, value + step > max)}
    </View>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: space.m }}>
      <T size="small" weight="600" style={{ marginBottom: 4 }}>{label}</T>
      <TextInput
        placeholderTextColor={t.muted}
        {...props}
        style={[styles.input, { color: t.ink, borderColor: t.line, backgroundColor: t.card }, props.multiline && { minHeight: 80, textAlignVertical: 'top' }]}
      />
      {hint ? <T size="tiny" color="muted" style={{ marginTop: 4 }}>{hint}</T> : null}
    </View>
  );
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <View style={{ marginTop: space.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.s }}>
        <T size="h" style={{ flex: 1 }}>{title}</T>
        {action}
      </View>
      {children}
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.s }, style]}>{children}</View>;
}

export function Badge({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'accent' | 'good' | 'warn' | 'bad' | 'run' | 'strength' }) {
  const t = useTheme();
  const map = {
    muted: [t.line, t.muted], accent: [t.accentSoft, t.accent], good: [t.goodSoft, t.good], warn: [t.warnSoft, t.warn],
    bad: [t.badSoft, t.bad], run: [t.runSoft, t.run], strength: [t.strengthSoft, t.strength],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.line, marginVertical: space.m }} />;
}

export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <Card style={{ alignItems: 'flex-start', gap: 8 }}>
      <T size="h">{title}</T>
      <T color="muted">{body}</T>
      {action}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.l, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: space.l, gap: space.m },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 15, marginTop: 2 },
  card: { borderRadius: radius.l, padding: space.l, borderWidth: StyleSheet.hairlineWidth, marginBottom: space.m },
  button: { borderRadius: radius.m, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, minHeight: 50 },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 38 },
  chip: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scaleItem: { flex: 1, minHeight: 46, borderRadius: radius.m, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  stepBtn: { width: 46, height: 46, borderRadius: radius.m, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: radius.m, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
});
