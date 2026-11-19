import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { EXERCISE_BY_ID } from '@/core/strength/exercises';
import { estimate1RM } from '@/core/strength/progression';
import { useStore } from '@/data/store';
import { Badge, Card, ChipRow, Screen, Section, T } from '@/ui/kit';

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ex = EXERCISE_BY_ID[id];
  const { setLogs } = useStore();
  if (!ex) return <Screen inset={false} title="Gerakan tidak ditemukan"><T>-</T></Screen>;
  const history = setLogs.filter((l) => l.exerciseId === id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
  return (
    <Screen inset={false} title={ex.name}>
      <Stack.Screen options={{ title: ex.name }} />
      <ChipRow>
        {ex.muscles.map((m) => (
          <Badge key={m} label={m} tone="strength" />
        ))}
        {ex.unilateral ? <Badge label="satu sisi" /> : null}
        {ex.needsBench ? <Badge label="butuh bangku" /> : null}
      </ChipRow>
      <Section title="Cara melakukan">
        {ex.steps.map((s, i) => (
          <Card key={i}>
            <T>{`${i + 1}. ${s}`}</T>
          </Card>
        ))}
        <T size="small" color="muted">Gerakan terkendali, napas tidak ditahan. Hentikan bila nyeri tajam di sendi.</T>
      </Section>
      {history.length ? (
        <Section title="Riwayat">
          {history.map((l) => (
            <T key={l.id} size="small" style={{ marginBottom: 4 }}>{`${l.date} · set ${l.setIndex + 1}: ${l.reps} × ${l.loadKg} kg${l.loadKg ? ` (≈1RM ${estimate1RM(l.loadKg, l.reps)} kg)` : ''}`}</T>
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}
