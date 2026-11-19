import { router } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { DAY_SHORT, dayIndex, formatMinutes, formatShort } from '@/core/dates';
import type { PlannedSession } from '@/core/types';

import { IconChevron, IconDumbbell, IconMountain, IconRun } from './icons';
import { Badge, Card, Row, T } from './kit';
import { useTheme } from './theme';

export function SessionIcon({ s, size = 40 }: { s: Pick<PlannedSession, 'kind' | 'runKind' | 'status'>; size?: number }) {
  const t = useTheme();
  const isRun = s.kind === 'run';
  const color = s.status === 'done' ? t.good : isRun ? t.run : t.strength;
  const bg = s.status === 'done' ? t.goodSoft : isRun ? t.runSoft : t.strengthSoft;
  const Icon = !isRun ? IconDumbbell : s.runKind === 'trail' || s.runKind === 'hill' ? IconMountain : IconRun;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon color={color} size={size * 0.55} />
    </View>
  );
}

export function SessionCard({ s, showDate }: { s: PlannedSession; showDate?: boolean }) {
  const t = useTheme();
  return (
    <Card onPress={() => router.push(`/sesi/${encodeURIComponent(s.id)}`)} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
      <SessionIcon s={s} />
      <View style={{ flex: 1, gap: 3 }}>
        <Row style={{ gap: 6 }}>
          {showDate ? <T size="small" color="muted" weight="600">{`${DAY_SHORT[dayIndex(s.date)]} ${formatShort(s.date)}`}</T> : null}
          {s.key ? <Badge label="Kunci" tone="accent" /> : null}
          {s.status === 'done' ? <Badge label="Selesai" tone="good" /> : s.status === 'skipped' ? <Badge label="Dilewati" /> : null}
        </Row>
        <T size="h" weight="600" style={{ textDecorationLine: s.status === 'skipped' ? 'line-through' : 'none' }}>{s.title}</T>
        <T size="small" color="muted">{`${formatMinutes(s.durationMin)} · ${s.summary}`}</T>
      </View>
      <IconChevron color={t.muted} size={20} />
    </Card>
  );
}

/** Baris ringkas untuk dipakai di dalam kartu lain. */
export function SessionRow({ s }: { s: PlannedSession }) {
  const t = useTheme();
  return (
    <Pressable onPress={() => router.push(`/sesi/${encodeURIComponent(s.id)}`)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}>
      <SessionIcon s={s} size={34} />
      <View style={{ flex: 1 }}>
        <T weight="600">{s.title}</T>
        <T size="small" color="muted">{`${formatMinutes(s.durationMin)} · ${s.summary}`}</T>
      </View>
      {s.status === 'done' ? <Badge label="Selesai" tone="good" /> : <IconChevron color={t.muted} size={18} />}
    </Pressable>
  );
}
