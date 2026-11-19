import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { addDays, formatDuration, parseDuration, today, uid } from '@/core/dates';
import { parseGpx } from '@/core/pacing/gpx';
import { buildProfile, nearestKm } from '@/core/pacing/profile';
import type { AidStation, Race } from '@/core/types';
import { useStore } from '@/data/store';
import { pickGpx } from '@/services/files';
import { Button, Card, Chip, ChipRow, Field, Row, Screen, Section, T } from '@/ui/kit';

const n = (s: string) => {
  const x = Number(s.replace(',', '.'));
  return isFinite(x) ? x : 0;
};

export default function RaceEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const store = useStore();
  const r0 = id ? store.races.find((r) => r.id === id) : undefined;

  const [name, setName] = useState(r0?.name ?? '');
  const [date, setDate] = useState(r0?.date ?? addDays(today(), 56));
  const [start, setStart] = useState(r0?.startTime ?? '05:30');
  const [kind, setKind] = useState<Race['kind']>(r0?.kind ?? 'trail');
  const [dist, setDist] = useState(r0 ? String(r0.distanceKm) : '');
  const [gain, setGain] = useState(r0 ? String(r0.elevGainM) : '0');
  const [target, setTarget] = useState(r0 ? formatDuration(r0.targetSec) : '');
  const [temp, setTemp] = useState(String(r0?.tempC ?? 27));
  const [hum, setHum] = useState(String(r0?.humidity ?? 80));
  const [strategy, setStrategy] = useState<Race['strategy']>(r0?.strategy ?? 'rata');
  const [aid, setAid] = useState<AidStation[]>(r0?.aid ?? []);
  const [gpx, setGpx] = useState<string | undefined>(r0?.gpx);
  const [gpxInfo, setGpxInfo] = useState<string | null>(r0?.gpx ? 'GPX tersimpan' : null);

  const importGpx = async () => {
    try {
      const f = await pickGpx();
      if (!f) return;
      const g = parseGpx(f.text);
      const prof = buildProfile(g.points);
      setGpx(f.text);
      if (!name && g.name) setName(g.name);
      setDist(prof.totalKm.toFixed(2));
      setGain(String(prof.gainM));
      if (prof.gainM > 200 && kind === 'road') setKind('trail');
      if (g.waypoints.length && aid.length === 0) {
        setAid(
          g.waypoints
            .map((w) => ({ name: w.name.slice(0, 24), km: Math.round(nearestKm(prof, w) * 100) / 100, stopSec: 120 }))
            .filter((a) => a.km > 0.2 && a.km < prof.totalKm - 0.2)
            .sort((a, b) => a.km - b.km),
        );
      }
      setGpxInfo(`${f.name}: ${prof.totalKm.toFixed(1)} km, naik ${prof.gainM} m, ${g.waypoints.length} waypoint${prof.hasElevation ? '' : ' (tanpa elevasi)'}`);
    } catch (e) {
      Alert.alert('GPX tidak bisa dibaca', (e as Error).message);
    }
  };

  const save = async () => {
    const targetSec = parseDuration(target);
    if (!name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2}$/.test(start) || !targetSec || n(dist) <= 0) {
      Alert.alert('Data belum lengkap', 'Isi nama, tanggal (YYYY-MM-DD), jam start (HH:MM), jarak, dan target waktu (misal 2:45:00).');
      return;
    }
    const race: Race = {
      id: r0?.id ?? uid('race-'),
      name: name.trim(),
      date,
      startTime: start.padStart(5, '0'),
      kind,
      distanceKm: n(dist),
      elevGainM: Math.round(n(gain)),
      targetSec,
      tempC: n(temp),
      humidity: n(hum),
      strategy,
      aid: aid.filter((a) => a.km > 0).sort((a, b) => a.km - b.km),
      gpx,
      calendarEventId: r0?.calendarEventId,
      resultActivityId: r0?.resultActivityId,
    };
    await store.saveRace(race);
    router.replace(`/lomba/${race.id}`);
  };

  const setAidField = (i: number, patch: Partial<AidStation>) => setAid(aid.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  return (
    <Screen inset={false} title={r0 ? 'Ubah lomba' : 'Lomba baru'}>
      <Card tone="accent">
        <T weight="700">GPX resmi</T>
        <T size="small" style={{ marginTop: 4 }}>{gpxInfo ?? 'Unduh GPX dari situs panitia, lalu pilih di sini. Jarak, elevasi, dan pos (waypoint) terisi otomatis.'}</T>
        {Platform.OS !== 'web' ? <Button small title={gpx ? 'Ganti GPX' : 'Pilih file GPX'} onPress={importGpx} style={{ marginTop: 10, alignSelf: 'flex-start' }} /> : null}
      </Card>
      <Field label="Nama lomba" value={name} onChangeText={setName} placeholder="Misalnya Bromo Tengger Semeru 30K" />
      <Row>
        <View style={{ flex: 1 }}><Field label="Tanggal" value={date} onChangeText={setDate} placeholder="2026-03-15" /></View>
        <View style={{ flex: 1 }}><Field label="Jam start" value={start} onChangeText={setStart} placeholder="05:30" /></View>
      </Row>
      <T size="small" weight="600" style={{ marginBottom: 6 }}>Jenis</T>
      <ChipRow>
        <Chip label="Trail" selected={kind === 'trail'} onPress={() => setKind('trail')} />
        <Chip label="Road" selected={kind === 'road'} onPress={() => setKind('road')} />
      </ChipRow>
      <View style={{ height: 12 }} />
      <Row>
        <View style={{ flex: 1 }}><Field label="Jarak (km)" value={dist} onChangeText={setDist} keyboardType="decimal-pad" placeholder="21" /></View>
        <View style={{ flex: 1 }}><Field label="Elevasi naik (m)" value={gain} onChangeText={setGain} keyboardType="number-pad" placeholder="1200" /></View>
      </Row>
      <Field label="Target waktu" value={target} onChangeText={setTarget} placeholder="3:30:00" hint="Format jam:menit:detik. Aplikasi menilai apakah target realistis dari data larimu." />
      <Row>
        <View style={{ flex: 1 }}><Field label="Perkiraan suhu (°C)" value={temp} onChangeText={setTemp} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Kelembapan (%)" value={hum} onChangeText={setHum} keyboardType="number-pad" /></View>
      </Row>
      {kind === 'road' ? (
        <>
          <T size="small" weight="600" style={{ marginBottom: 6 }}>Strategi</T>
          <ChipRow>
            <Chip label="Pace rata" selected={strategy === 'rata'} onPress={() => setStrategy('rata')} />
            <Chip label="Negative split" selected={strategy === 'negatif'} onPress={() => setStrategy('negatif')} />
          </ChipRow>
        </>
      ) : null}

      <Section title="Pos / water station" action={<Button small kind="ghost" title="+ Pos" onPress={() => setAid([...aid, { name: `Pos ${aid.length + 1}`, km: 0, stopSec: 120 }])} />}>
        {aid.length === 0 ? <T size="small" color="muted">Belum ada pos. Tambahkan agar waktu berhenti dan cut-off ikut dihitung.</T> : null}
        {aid.map((a, i) => (
          <Card key={i}>
            <Row>
              <View style={{ flex: 2 }}><Field label="Nama" value={a.name} onChangeText={(v) => setAidField(i, { name: v })} /></View>
              <View style={{ flex: 1 }}><Field label="Km" value={a.km ? String(a.km) : ''} onChangeText={(v) => setAidField(i, { km: n(v) })} keyboardType="decimal-pad" placeholder="10.5" /></View>
            </Row>
            <Row>
              <View style={{ flex: 1 }}><Field label="Berhenti (menit)" value={String(Math.round(a.stopSec / 60))} onChangeText={(v) => setAidField(i, { stopSec: n(v) * 60 })} keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><Field label="Cut-off (HH:MM)" value={a.cutoff ?? ''} onChangeText={(v) => setAidField(i, { cutoff: v || undefined })} placeholder="opsional" /></View>
            </Row>
            <Button small kind="danger" title="Hapus pos" onPress={() => setAid(aid.filter((_, j) => j !== i))} style={{ alignSelf: 'flex-start' }} />
          </Card>
        ))}
      </Section>

      <Button title="Simpan dan susun pacing" onPress={save} style={{ marginTop: 16 }} />
      {r0 ? (
        <Button
          title="Hapus lomba"
          kind="danger"
          onPress={() => {
            store.deleteRace(r0.id);
            router.replace('/lomba');
          }}
          style={{ marginTop: 8 }}
        />
      ) : null}
    </Screen>
  );
}
