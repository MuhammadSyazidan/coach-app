import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { daysBetween, formatDate, formatDuration, today } from '@/core/dates';
import { useStore } from '@/data/store';
import { Badge, Button, Card, Empty, Row, Screen, Section, T } from '@/ui/kit';

export default function Races() {
  const { races } = useStore();
  const day = today();
  const upcoming = races.filter((r) => r.date >= day);
  const past = races.filter((r) => r.date < day).reverse();
  return (
    <Screen title="Lomba" subtitle="Target waktu, pace, dan pacing strategy" right={<Button small title="+ Tambah" onPress={() => router.push('/lomba/edit')} />}>
      {races.length === 0 ? (
        <Empty
          title="Belum ada lomba"
          body="Tambahkan lomba dengan GPX resmi dari panitia. Aplikasi menyusun pacing per segmen dan GPX berwaypoint untuk jam Coros."
          action={<Button title="Tambah lomba" onPress={() => router.push('/lomba/edit')} />}
        />
      ) : null}
      {upcoming.map((r) => (
        <Card key={r.id} onPress={() => router.push(`/lomba/${r.id}`)}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Row>
                <Badge label={r.kind === 'trail' ? 'Trail' : 'Road'} tone={r.kind === 'trail' ? 'good' : 'run'} />
                {r.gpx ? <Badge label="GPX" /> : null}
              </Row>
              <T size="h">{r.name}</T>
              <T size="small" color="muted">{`${formatDate(r.date)} · ${r.distanceKm} km · +${r.elevGainM} m · target ${formatDuration(r.targetSec)}`}</T>
            </View>
            <View style={{ alignItems: 'center' }}>
              <T size="title" color="accent">{daysBetween(day, r.date)}</T>
              <T size="tiny" color="muted">hari</T>
            </View>
          </Row>
        </Card>
      ))}
      {past.length ? (
        <Section title="Selesai">
          {past.map((r) => (
            <Card key={r.id} onPress={() => router.push(`/lomba/${r.id}`)}>
              <T weight="700">{r.name}</T>
              <T size="small" color="muted">{`${formatDate(r.date)} · target ${formatDuration(r.targetSec)}`}</T>
            </Card>
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}
