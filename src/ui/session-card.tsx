import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { DAY_SHORT, dayIndex, formatMinutes, formatShort } from '@/core/dates';
import type { PlannedSession } from '@/core/types';

import { Badge, Card, Row, T } from './kit';
import { useTheme } from './theme';

export function SessionCard({ s, showDate }: { s: PlannedSession; showDate?: boolean }) {
  const t = useTheme();
  const isRun = s.kind === 'run';
  const color = isRun ? t.run : t.strength;
  return (
    <Card onPress={() => router.push(`/sesi/${encodeURIComponent(s.id)}`)} style={{ flexDirection: 'row', gap: 12, alignItems: 'stretch' }}>
      <View style={{ width: 4, borderRadius: 2, backgroundColor: s.status === 'done' ? t.good : s.status === 'skipped' ? t.line : color }} />
      <View style={{ flex: 1, gap: 4 }}>
        <Row>
          {showDate ? <T size="small" color="muted" weight="600">{`${DAY_SHORT[dayIndex(s.date)]} ${formatShort(s.date)}`}</T> : null}
          <Badge label={isRun ? 'Lari' : 'Kekuatan'} tone={isRun ? 'run' : 'strength'} />
          {s.key ? <Badge label="Sesi kunci" tone="accent" /> : null}
          {s.status === 'done' ? <Badge label="Selesai" tone="good" /> : s.status === 'skipped' ? <Badge label="Dilewati" /> : null}
        </Row>
        <T size="h" style={{ textDecorationLine: s.status === 'skipped' ? 'line-through' : 'none' }}>{s.title}</T>
        <T size="small" color="muted">{`${formatMinutes(s.durationMin)} · ${s.summary}`}</T>
      </View>
    </Card>
  );
}
