import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { addDays, DAY_SHORT, formatShort, today, weekStartOf } from '@/core/dates';
import { upcomingRace } from '@/core/plan/generator';
import type { DayIndex, WeekPlan } from '@/core/types';
import { defaultRequest, useStore } from '@/data/store';
import { busyDays } from '@/services/calendar';
import { Button, Card, Chip, ChipRow, Row, Screen, Section, Stepper, T } from '@/ui/kit';
import { SessionCard } from '@/ui/session-card';

export default function WeekQuestion() {
  const store = useStore();
  const { profile, weeks, races, settings } = store;
  const params = useLocalSearchParams<{ week?: string; first?: string }>();
  const thisWeek = weekStartOf(today());
  const target = params.week ?? (params.first || !weeks[thisWeek] ? thisWeek : addDays(thisWeek, 7));
  const prev = weeks[addDays(target, -7)] ?? null;
  const existing = weeks[target];
  const init = existing?.request ?? (profile ? defaultRequest(profile, target, prev) : null);

  const [runN, setRunN] = useState(init?.runSessions ?? 3);
  const [strN, setStrN] = useState(init?.strengthSessions ?? 2);
  const [days, setDays] = useState<DayIndex[]>(init?.availableDays ?? [0, 1, 2, 3, 4, 5, 6]);
  const [busy, setBusy] = useState<DayIndex[]>(init?.busyDays ?? []);
  const [trail, setTrail] = useState(init?.includeTrail ?? false);
  const [result, setResult] = useState<WeekPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const race = useMemo(() => upcomingRace(races, target), [races, target]);

  if (!profile) return null;
  const isThisWeek = target === thisWeek;
  const pastDays = isThisWeek ? (Array.from({ length: 7 }, (_, i) => i).filter((i) => addDays(target, i) < today()) as DayIndex[]) : [];

  const toggle = (list: DayIndex[], set: (v: DayIndex[]) => void, d: DayIndex) => set(list.includes(d) ? list.filter((x) => x !== d) : [...list, d]);

  const checkCalendar = async () => {
    if (!settings.calendarEnabled) {
      Alert.alert('Google Calendar belum terhubung', 'Hubungkan di tab Profil untuk membaca hari sibuk.');
      return;
    }
    setChecking(true);
    try {
      const b = await busyDays(target, settings.calendarId, profile.trainingTime);
      setBusy(b);
      Alert.alert('Kalender dicek', b.length ? `Hari padat di jam latihan: ${b.map((d) => DAY_SHORT[d]).join(', ')}` : 'Tidak ada hari padat di jam latihanmu.');
    } catch (e) {
      Alert.alert('Gagal membaca kalender', (e as Error).message);
    } finally {
      setChecking(false);
    }
  };

  const submit = async () => {
    setLoading(true);
    try {
      const plan = await store.planWeek({
        weekStart: target,
        runSessions: runN,
        strengthSessions: strN,
        availableDays: days.filter((d) => !pastDays.includes(d)),
        busyDays: busy,
        includeTrail: trail,
        confirmed: true,
      });
      setResult(plan);
    } catch (e) {
      Alert.alert('Gagal menyusun rencana', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <Screen inset={false} title="Rencana siap" subtitle={`Minggu ${formatShort(result.weekStart)} – ${formatShort(addDays(result.weekStart, 6))}`}>
        {result.notes.length ? (
          <Card tone="accent">
            <T weight="700" style={{ marginBottom: 4 }}>Kenapa rencananya begini</T>
            {result.notes.map((n, i) => (
              <T key={i} size="small" style={{ marginTop: 4 }}>{`• ${n}`}</T>
            ))}
          </Card>
        ) : null}
        <T size="small" color="muted" style={{ marginBottom: 8 }}>{`${result.sessions.length} sesi · lari ${result.runMinutes} menit · fase ${result.phase}`}</T>
        {result.sessions.map((s) => (
          <SessionCard key={s.id} s={s} showDate />
        ))}
        {settings.calendarEnabled ? <T size="small" color="muted">Jadwal sudah ditulis ke Google Calendar.</T> : null}
        <Button title="Selesai" onPress={() => router.replace('/')} style={{ marginTop: 16 }} />
      </Screen>
    );
  }

  return (
    <Screen inset={false} title={isThisWeek ? 'Minggu ini mau latihan berapa kali?' : 'Minggu depan mau latihan berapa kali?'} subtitle={`${formatShort(target)} – ${formatShort(addDays(target, 6))}`}>
      {race ? (
        <Card tone="accent">
          <T weight="700">{race.name}</T>
          <T size="small">{`Lomba ${formatShort(race.date)}. Rencana otomatis menyesuaikan (persiapan spesifik dan tapering).`}</T>
        </Card>
      ) : null}
      <Section title="Sesi lari">
        <Stepper value={runN} onChange={setRunN} min={0} max={7} />
      </Section>
      <Section title="Sesi kekuatan (dumbbell)">
        <Stepper value={strN} onChange={setStrN} min={0} max={4} />
      </Section>
      <Section title="Hari yang bisa">
        <ChipRow>
          {DAY_SHORT.map((d, i) => (
            <Chip key={d} label={d} selected={days.includes(i as DayIndex) && !pastDays.includes(i as DayIndex)} onPress={() => !pastDays.includes(i as DayIndex) && toggle(days, setDays, i as DayIndex)} />
          ))}
        </ChipRow>
        {pastDays.length ? <T size="tiny" color="muted" style={{ marginTop: 6 }}>Hari yang sudah lewat tidak dijadwalkan.</T> : null}
      </Section>
      <Section
        title="Hari sibuk"
        action={Platform.OS !== 'web' ? <Button small kind="ghost" title={checking ? 'Mengecek…' : 'Cek Google Calendar'} onPress={checkCalendar} /> : undefined}>
        <ChipRow>
          {DAY_SHORT.map((d, i) => (
            <Chip key={d} label={d} selected={busy.includes(i as DayIndex)} onPress={() => toggle(busy, setBusy, i as DayIndex)} />
          ))}
        </ChipRow>
      </Section>
      <Section title="Trail run minggu ini?">
        <ChipRow>
          <Chip label="Ya, ganti lari panjang" selected={trail} onPress={() => setTrail(true)} />
          <Chip label="Tidak" selected={!trail} onPress={() => setTrail(false)} />
        </ChipRow>
      </Section>
      <View style={{ height: 24 }} />
      <Row>
        <Button title="Susun rencana" onPress={submit} loading={loading} style={{ flex: 1 }} disabled={days.length === 0} />
      </Row>
      <T size="tiny" color="muted" style={{ marginTop: 12 }}>
        Jika tidak dijawab sampai Senin, aplikasi memakai pola minggu lalu.
      </T>
    </Screen>
  );
}
