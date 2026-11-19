import React from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconChevron } from './icons';
import { NUM_FONT, radius, space, useTheme } from './theme';

export function Screen({ title, subtitle, eyebrow, children, right, scroll = true, inset = true }: {
  title?: string; subtitle?: string; eyebrow?: string; children: React.ReactNode; right?: React.ReactNode; scroll?: boolean; inset?: boolean;
}) {
  const t = useTheme();
  const header = title ? (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: t.muted }]}>{eyebrow}</Text> : null}
        <Text style={[styles.title, { color: t.ink }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: t.muted }]}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: eyebrow ? 18 : 4 }}>{right}</View> : null}
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
  const body = <View style={[styles.card, { backgroundColor: bg }, style]}>{children}</View>;
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })} accessibilityRole="button">
      {body}
    </Pressable>
  );
}

/** Judul kartu dengan ikon berwarna di kiri (gaya widget halaman Today). */
export function CardHeader({ icon, title, subtitle, right }: { icon?: React.ReactNode; title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={{ marginBottom: subtitle ? 10 : 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {icon}
        <T size="h" weight="500" style={{ flex: 1 }}>{title}</T>
        {right}
      </View>
      {subtitle ? <T size="body" color="muted" style={{ marginTop: 6, marginLeft: icon ? 32 : 0 }}>{subtitle}</T> : null}
    </View>
  );
}

type ColorKey = 'ink' | 'muted' | 'accent' | 'good' | 'warn' | 'bad' | 'run' | 'strength' | 'highlight';

export function T({ children, size = 'body', color, weight, style, numberOfLines }: { children: React.ReactNode; size?: 'title' | 'h' | 'body' | 'small' | 'tiny' | 'big'; color?: ColorKey; weight?: '400' | '500' | '600' | '700'; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  const t = useTheme();
  const sz = { big: 34, title: 24, h: 18, body: 15, small: 13, tiny: 11.5 }[size];
  const lh = Math.round(sz * 1.35);
  const fw = weight ?? (size === 'title' || size === 'big' ? '700' : size === 'h' ? '600' : '400');
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontSize: sz, lineHeight: lh, fontWeight: fw, color: t[color ?? 'ink'] }, style]}>
      {children}
    </Text>
  );
}

/** Angka besar dengan font condensed. */
export function Num({ children, size = 40, color, style }: { children: React.ReactNode; size?: number; color?: ColorKey; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text style={[{ fontFamily: NUM_FONT, fontSize: size, lineHeight: Math.round(size * 1.1), color: t[color ?? 'ink'] }, style]}>{children}</Text>;
}

export function Button({ title, onPress, kind = 'primary', disabled, loading, style, small }: { title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.accent : kind === 'danger' ? t.badSoft : kind === 'secondary' ? t.cardAlt : 'transparent';
  const fg = kind === 'primary' ? t.accentInk : kind === 'danger' ? t.bad : kind === 'secondary' ? t.ink : t.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, small && styles.buttonSmall, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 14 : 16 }}>{title}</Text>}
    </Pressable>
  );
}

/** Tombol ikon untuk header. */
export function IconButton({ children, onPress, label, dot }: { children: React.ReactNode; onPress: () => void; label: string; dot?: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.6 : 1 })}>
      {children}
      {dot ? <View style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: t.good }} /> : null}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, tone }: { label: string; selected?: boolean; onPress?: () => void; tone?: 'run' | 'strength' }) {
  const t = useTheme();
  const on = tone === 'run' ? t.run : tone === 'strength' ? t.strength : t.accent;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.chip, { backgroundColor: selected ? on : t.cardAlt }]}>
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
              style={[styles.scaleItem, { backgroundColor: on ? t.accent : t.cardAlt }]}>
              <Text style={{ color: on ? '#fff' : t.ink, fontWeight: '700', fontSize: 16 }}>{labels?.[i] ?? v}</Text>
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
      style={[styles.stepBtn, { backgroundColor: t.cardAlt, opacity: disabled ? 0.35 : 1 }]}>
      <Text style={{ color: t.ink, fontSize: 22, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {btn('−', value - step, value - step < min)}
      <View style={{ minWidth: 64, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
        <Text style={{ color: t.ink, fontFamily: NUM_FONT, fontSize: 26 }}>{value}</Text>
        {suffix ? <Text style={{ color: t.muted, fontSize: 14 }}>{suffix}</Text> : null}
      </View>
      {btn('+', value + step, value + step > max)}
    </View>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: space.m }}>
      <T size="small" color="muted" weight="500" style={{ marginBottom: 6 }}>{label}</T>
      <TextInput
        placeholderTextColor={t.muted}
        {...props}
        style={[styles.input, { color: t.ink, backgroundColor: t.cardAlt }, props.multiline && { minHeight: 80, textAlignVertical: 'top' }]}
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
    muted: [t.cardAlt, t.muted], accent: [t.accentSoft, t.accent], good: [t.goodSoft, t.good], warn: [t.warnSoft, t.warn],
    bad: [t.badSoft, t.bad], run: [t.runSoft, t.run], strength: [t.strengthSoft, t.strength],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' }}>
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

/** Kelompok baris menu dengan ikon dan chevron (gaya halaman profil). */
export function MenuGroup({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.card, { backgroundColor: t.card, paddingVertical: 2, paddingHorizontal: 0 }]}>
      {items.map((c, i) => (
        <View key={i}>
          {c}
          {i < items.length - 1 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.line, marginLeft: 60 }} /> : null}
        </View>
      ))}
    </View>
  );
}

export function MenuRow({ icon, label, value, onPress }: { icon: React.ReactNode; label: string; value?: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.6 : 1 }]}>
      <View style={{ width: 28, alignItems: 'center' }}>{icon}</View>
      <T size="h" weight="400" style={{ flex: 1 }}>{label}</T>
      {value ? <T size="small" color="muted">{value}</T> : null}
      <IconChevron color={t.muted} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.l, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: space.l, marginTop: space.s, gap: space.m },
  eyebrow: { fontSize: 15, marginBottom: 2 },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 15, marginTop: 2 },
  card: { borderRadius: radius.l, padding: space.l, marginBottom: space.m },
  button: { borderRadius: radius.m, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 38 },
  chip: { borderRadius: 999, paddingVertical: 9, paddingHorizontal: 15 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scaleItem: { flex: 1, minHeight: 48, borderRadius: radius.m, alignItems: 'center', justifyContent: 'center' },
  stepBtn: { width: 46, height: 46, borderRadius: radius.m, alignItems: 'center', justifyContent: 'center' },
  input: { borderRadius: radius.m, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 15 },
});
