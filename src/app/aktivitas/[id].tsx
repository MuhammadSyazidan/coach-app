import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { formatDate, formatDuration, formatPace } from '@/core/dates';
import { activityLoad } from '@/core/load';
import { useStore } from '@/data/store';
import { ZoneBar } from '@/ui/charts';
import { Button, Card, CardHeader, Num, Screen, T } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={{ width: '50%', paddingVertical: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Num size={30}>{value}</Num>
        {unit ? <T color="muted">{unit}</T> : null}
      </View>
      <T size="small" color="muted">{label}</T>
    </View>
  );
}

export default function ActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const store = useStore();
  const a = store.activities.find((x) => x.id === decodeURIComponent(id));
  if (!a) return <Screen inset={false} title="Aktivitas tidak ditemukan"><Button title="Kembali" onPress={() => router.back()} /></Screen>;
  const ci = store.checkins.find((c) => c.activityId === a.id && c.moment === 'setelah');
  const session = a.sessionId ? store.sessionById(a.sessionId)?.session : undefined;
  const totalZ = a.zoneSec?.reduce((x, y) => x + y, 0) ?? 0;

  return (
    <Screen inset={false} eyebrow={formatDate(a.date)} title={a.name} subtitle={`${a.type === 'trail' ? 'Trail run' : 'Lari'} · mulai ${a.startTime}`}>
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Stat label="Jarak" value={a.distanceKm.toFixed(2)} unit="km" />
          <Stat label="Waktu bergerak" value={formatDuration(a.movingSec)} />
          <Stat label="Pace rata-rata" value={formatPace(a.movingSec / a.distanceKm)} unit="/km" />
          <Stat label="Elevasi naik" value={String(a.elevGainM)} unit="m" />
          {a.avgHr ? <Stat label="HR rata-rata" value={String(Math.round(a.avgHr))} unit="bpm" /> : null}
          <Stat label="Beban latihan" value={String(activityLoad(a, ci?.rpe))} />
        </View>
      </Card>
      {a.zoneSec && totalZ > 0 ? (
        <Card>
          <CardHeader title="Zona heart rate" />
          <ZoneBar parts={a.zoneSec.map((v, i) => ({ label: `Z${i + 1}`, value: v / totalZ, color: t.zones[i] }))} />
        </Card>
      ) : null}
      {session ? (
        <Card onPress={() => router.push(`/sesi/${encodeURIComponent(session.id)}`)}>
          <CardHeader title="Sesi rencana" subtitle={`${session.title} · ${session.summary}`} />
        </Card>
      ) : null}
      {ci ? (
        <Card>
          <CardHeader title="Check-in" />
          <T>{`RPE ${ci.rpe ?? '-'} · rasa ${ci.feeling ?? '-'}/5${ci.hardPart ? ` · terberat: ${ci.hardPart}` : ''}`}</T>
          {ci.pain ? <T color="bad">{`Nyeri: ${ci.painAreas.join(', ')}`}</T> : null}
          {ci.note ? <T color="muted" style={{ marginTop: 4 }}>{ci.note}</T> : null}
        </Card>
      ) : (
        <Button title="Check-in setelah lari" onPress={() => router.push(`/checkin?moment=setelah&activityId=${encodeURIComponent(a.id)}${a.sessionId ? `&sessionId=${encodeURIComponent(a.sessionId)}` : ''}`)} />
      )}
    </Screen>
  );
}
