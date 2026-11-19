import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { addDays, DAY_LONG, formatShort, today, weekStartOf } from '@/core/dates';
import { useStore } from '@/data/store';
import { Badge, Button, Card, Empty, Row, Screen, T } from '@/ui/kit';
import { SessionCard } from '@/ui/session-card';

const PHASE: Record<string, string> = {
  dasar: 'Fase dasar', pembangunan: 'Pembangunan', pemulihan: 'Minggu pemulihan', spesifik: 'Persiapan spesifik', taper: 'Tapering', lomba: 'Minggu lomba',
};

export default function Week() {
  const { weeks } = useStore();
  const [start, setStart] = useState(weekStartOf(today()));
  const week = weeks[start];
  const day = today();

  return (
    <Screen
      title="Rencana minggu"
      subtitle={`${formatShort(start)} – ${formatShort(addDays(start, 6))}`}
      right={
        <Row>
          <Button small kind="secondary" title="‹" onPress={() => setStart(addDays(start, -7))} />
          <Button small kind="secondary" title="›" onPress={() => setStart(addDays(start, 7))} />
        </Row>
      }>
      {!week ? (
        <Empty
          title="Belum ada rencana"
          body="Jawab pertanyaan jadwal minggu ini untuk menyusun rencana."
          action={<Button title="Atur jadwal" onPress={() => router.push(`/minggu-depan?week=${start}`)} />}
        />
      ) : (
        <>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Badge label={PHASE[week.phase] ?? week.phase} tone="accent" />
              <T size="small" color="muted">{`Minggu ke-${week.weekNumber} · lari ${week.runMinutes} menit`}</T>
            </Row>
            {week.notes.map((n, i) => (
              <T key={i} size="small" style={{ marginTop: 8 }}>{`• ${n}`}</T>
            ))}
            <Button small kind="ghost" title="Ubah jumlah sesi / hari" onPress={() => router.push(`/minggu-depan?week=${start}`)} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
          </Card>
          {Array.from({ length: 7 }, (_, i) => {
            const date = addDays(start, i);
            const list = week.sessions.filter((s) => s.date === date);
            return (
              <View key={date} style={{ marginTop: 10 }}>
                <T size="small" weight="700" color={date === day ? 'accent' : 'muted'} style={{ marginBottom: 6 }}>
                  {`${DAY_LONG[i]} ${formatShort(date)}${date === day ? ' · hari ini' : ''}`}
                </T>
                {list.length ? list.map((s) => <SessionCard key={s.id} s={s} />) : <T size="small" color="muted" style={{ marginBottom: 6 }}>Istirahat</T>}
              </View>
            );
          })}
        </>
      )}
    </Screen>
  );
}
