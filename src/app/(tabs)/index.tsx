import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { addDays, dayIndex, daysBetween, formatDate, formatDuration, today, weekStartOf } from '@/core/dates';
import { upcomingRace } from '@/core/plan/generator';
import { defaultRequest, useStore } from '@/data/store';
import { isConnected } from '@/services/strava';
import { Badge, Button, Card, Empty, Row, Screen, Section, T } from '@/ui/kit';
import { SessionCard } from '@/ui/session-card';
import { useTheme } from '@/ui/theme';

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 19 ? 'Selamat sore' : 'Selamat malam';
}

export default function Home() {
  const store = useStore();
  const t = useTheme();
  const { profile, currentWeek, weeks, races, activities, checkins, settings } = store;
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const autoRan = useRef(false);
  const day = today();
  const weekStart = weekStartOf(day);

  // Saat dibuka: susun minggu ini bila belum ada (pakai pola minggu lalu), sinkron Strava & kalender.
  useEffect(() => {
    if (!profile || autoRan.current) return;
    autoRan.current = true;
    (async () => {
      if (!weeks[weekStart]) {
        await store.planWeek(defaultRequest(profile, weekStart, weeks[addDays(weekStart, -7)] ?? null)).catch(() => {});
      }
      if (Platform.OS !== 'web' && (await isConnected().catch(() => false))) {
        const stale = !settings.lastStravaSync || Date.now() / 1000 - settings.lastStravaSync > 3600;
        if (stale) await store.syncStrava().catch(() => {});
      }
      if (Platform.OS !== 'web') await store.syncCalendar().catch(() => {});
    })();
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!profile) return null;

  const todays = currentWeek?.sessions.filter((s) => s.date === day) ?? [];
  const upcoming = currentWeek?.sessions.filter((s) => s.date > day && s.status === 'planned').slice(0, 2) ?? [];
  const done = currentWeek?.sessions.filter((s) => s.status === 'done').length ?? 0;
  const total = currentWeek?.sessions.length ?? 0;
  const race = upcomingRace(races, day);
  const pendingCheckins = activities.filter((a) => !a.checkinDone && daysBetween(a.date, day) <= 3).slice(-2);
  const beforeDone = (sid: string) => checkins.some((c) => c.sessionId === sid && c.moment === 'sebelum');
  const nextWeekPlanned = !!weeks[addDays(weekStart, 7)];
  const showNextWeekPrompt = dayIndex(day) >= 5 && !nextWeekPlanned;

  const sync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await store.syncStrava();
      setSyncMsg(r.added ? `${r.added} aktivitas baru dari Strava.` : 'Tidak ada aktivitas baru.');
    } catch (e) {
      setSyncMsg((e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Screen title={`${greeting()}, ${profile.name}`} subtitle={formatDate(day)}>
      {race ? (
        <Card onPress={() => router.push(`/lomba/${race.id}`)} tone="accent">
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <T size="small" weight="600" color="accent">LOMBA BERIKUTNYA</T>
              <T size="h">{race.name}</T>
              <T size="small">{`Target ${formatDuration(race.targetSec)} · ${race.distanceKm} km`}</T>
            </View>
            <View style={{ alignItems: 'center' }}>
              <T size="big" color="accent">{daysBetween(day, race.date)}</T>
              <T size="tiny" color="muted">hari lagi</T>
            </View>
          </Row>
        </Card>
      ) : null}

      {pendingCheckins.map((a) => (
        <Card key={a.id} tone="warn" onPress={() => router.push(`/checkin?moment=setelah&activityId=${encodeURIComponent(a.id)}${a.sessionId ? `&sessionId=${encodeURIComponent(a.sessionId)}` : ''}`)}>
          <T weight="700">{`Bagaimana rasanya "${a.name}"?`}</T>
          <T size="small">{`${a.distanceKm.toFixed(1)} km · ${formatDuration(a.movingSec)} · check-in 30 detik`}</T>
        </Card>
      ))}

      {showNextWeekPrompt ? (
        <Card onPress={() => router.push('/minggu-depan')}>
          <T weight="700">Minggu depan mau latihan berapa kali?</T>
          <T size="small" color="muted">Atur jumlah sesi dan hari sibuk, rencana langsung disusun.</T>
        </Card>
      ) : null}

      <Section title="Hari ini">
        {todays.length === 0 ? (
          <Empty title="Hari istirahat" body="Pemulihan adalah bagian dari latihan. Jalan santai atau peregangan ringan boleh." />
        ) : (
          todays.map((s) => (
            <View key={s.id}>
              <SessionCard s={s} />
              {s.status === 'planned' && !beforeDone(s.id) ? (
                <Button small kind="ghost" title="Check-in sebelum sesi" onPress={() => router.push(`/checkin?moment=sebelum&sessionId=${encodeURIComponent(s.id)}`)} style={{ alignSelf: 'flex-start', marginTop: -6, marginBottom: 8 }} />
              ) : null}
            </View>
          ))
        )}
      </Section>

      {upcoming.length ? (
        <Section title="Berikutnya">
          {upcoming.map((s) => (
            <SessionCard key={s.id} s={s} showDate />
          ))}
        </Section>
      ) : null}

      <Section title="Minggu ini">
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <T>{`${done} dari ${total} sesi selesai`}</T>
            {currentWeek ? <Badge label={currentWeek.phase} tone="accent" /> : null}
          </Row>
          <View style={{ height: 8, backgroundColor: t.line, borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
            <View style={{ width: `${total ? (done / total) * 100 : 0}%`, height: 8, backgroundColor: t.good }} />
          </View>
          {currentWeek?.notes.slice(0, 2).map((n, i) => (
            <T key={i} size="small" color="muted" style={{ marginTop: 8 }}>{`• ${n}`}</T>
          ))}
        </Card>
      </Section>

      {Platform.OS !== 'web' ? (
        <Section title="Data jam Coros">
          <Card>
            <T size="small" color="muted">
              {settings.lastStravaSync ? `Terakhir sinkron ${new Date(settings.lastStravaSync * 1000).toLocaleString('id-ID')}` : 'Hubungkan Strava di tab Profil agar lari dari Coros masuk otomatis.'}
            </T>
            {syncMsg ? <T size="small" style={{ marginTop: 6 }}>{syncMsg}</T> : null}
            <Button small kind="secondary" title="Sinkron sekarang" loading={syncing} onPress={sync} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
          </Card>
        </Section>
      ) : null}
    </Screen>
  );
}
