import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { addDays, dayIndex, daysBetween, formatDate, formatDuration, today, weekStartOf } from '@/core/dates';
import { dailyLoads, loadSummary } from '@/core/load';
import { upcomingRace } from '@/core/plan/generator';
import { useLoadEntries } from '@/data/derived';
import { defaultRequest, useStore } from '@/data/store';
import { isConnected } from '@/services/strava';
import { MiniBars, Ring } from '@/ui/charts';
import { IconCalendar, IconFlag, IconLoad, IconStar, IconTrend, IconWatch } from '@/ui/icons';
import { Card, CardHeader, IconButton, Num, Row, Screen, T } from '@/ui/kit';
import { SessionRow } from '@/ui/session-card';
import { useTheme } from '@/ui/theme';

const DAY_LETTER = ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg'];

export default function Home() {
  const store = useStore();
  const t = useTheme();
  const { profile, currentWeek, weeks, races, activities, checkins, settings } = store;
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const autoRan = useRef(false);
  const entries = useLoadEntries();
  const day = today();
  const weekStart = weekStartOf(day);

  useEffect(() => {
    if (!profile || autoRan.current) return;
    autoRan.current = true;
    (async () => {
      if (!weeks[weekStart]) {
        await store.planWeek(defaultRequest(profile, weekStart, weeks[addDays(weekStart, -7)] ?? null)).catch(() => {});
      }
      if (Platform.OS === 'web') return;
      const on = await isConnected().catch(() => false);
      setConnected(on);
      if (on) {
        const stale = !settings.lastStravaSync || Date.now() / 1000 - settings.lastStravaSync > 3600;
        if (stale) await store.syncStrava().catch(() => {});
      }
      await store.syncCalendar().catch(() => {});
    })();
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!profile) return null;

  const sessions = currentWeek?.sessions ?? [];
  const todays = sessions.filter((s) => s.date === day);
  const done = sessions.filter((s) => s.status === 'done');
  const plannedMin = sessions.reduce((a, s) => a + s.durationMin, 0);
  const doneMin = done.reduce((a, s) => a + s.durationMin, 0);
  const weekActs = activities.filter((a) => a.date >= weekStart && a.date <= addDays(weekStart, 6));
  const weekKm = weekActs.reduce((a, x) => a + x.distanceKm, 0);
  const race = upcomingRace(races, day);
  const pendingCheckins = activities.filter((a) => !a.checkinDone && daysBetween(a.date, day) <= 3).slice(-2);
  const showNextWeekPrompt = dayIndex(day) >= 5 && !weeks[addDays(weekStart, 7)];

  const weekLoads = dailyLoads(entries, weekStart, 7);
  const weekLoad = weekLoads.reduce((a, b) => a + b, 0);
  const last7 = dailyLoads(entries, addDays(day, -6), 7);
  const summary = loadSummary(entries, day);
  const statusColor = summary.status === 'Optimal' ? 'good' : summary.status === 'Terlalu tinggi' ? 'bad' : summary.status === 'Belum cukup data' ? 'muted' : 'warn';
  const last7Letters = Array.from({ length: 7 }, (_, i) => DAY_LETTER[dayIndex(addDays(day, i - 6))]);

  const sync = async () => {
    if (Platform.OS === 'web') return;
    if (!connected) {
      router.push('/pengaturan/strava');
      return;
    }
    setSyncing(true);
    try {
      const r = await store.syncStrava();
      Alert.alert('Sinkron selesai', r.added ? `${r.added} aktivitas baru dari jam.` : 'Tidak ada aktivitas baru.');
    } catch (e) {
      Alert.alert('Gagal sinkron', (e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Screen
      eyebrow={formatDate(day)}
      title="Hari ini"
      right={
        <>
          <IconButton label="Rencana minggu" onPress={() => router.push('/minggu')}>
            <IconCalendar color={t.ink} size={28} />
          </IconButton>
          <IconButton label="Sinkron jam" onPress={sync} dot={connected && !syncing}>
            <IconWatch color={syncing ? t.muted : t.ink} size={28} />
          </IconButton>
        </>
      }>
      {/* Ringkasan minggu: cincin progres menit latihan */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ alignItems: 'center', width: 80 }}>
          <IconStar color={t.good} size={24} />
          <Num size={36}>{`${done.length}/${sessions.length}`}</Num>
          <T size="small" color="muted">sesi</T>
        </View>
        <Ring progress={plannedMin ? doneMin / plannedMin : 0} size={190}>
          <Num size={52}>{doneMin}</Num>
          <T size="small" color="muted">{`dari ${plannedMin} menit`}</T>
        </Ring>
        <View style={{ alignItems: 'center', width: 80 }}>
          <IconWatch color={t.run} size={24} />
          <Num size={36}>{weekKm.toFixed(weekKm >= 10 ? 0 : 1)}</Num>
          <T size="small" color="muted">km lari</T>
        </View>
      </View>

      {pendingCheckins.map((a) => (
        <Card key={a.id} tone="warn" onPress={() => router.push(`/checkin?moment=setelah&activityId=${encodeURIComponent(a.id)}${a.sessionId ? `&sessionId=${encodeURIComponent(a.sessionId)}` : ''}`)}>
          <T weight="700">{`Bagaimana rasanya "${a.name}"?`}</T>
          <T size="small">{`${a.distanceKm.toFixed(2)} km · ${formatDuration(a.movingSec)} · check-in 30 detik`}</T>
        </Card>
      ))}

      <Card>
        <CardHeader
          icon={<IconCalendar color={t.good} size={22} />}
          title="Latihan hari ini"
          subtitle={todays.length ? undefined : 'Hari istirahat. Jalan santai atau peregangan ringan boleh.'}
        />
        {todays.map((s) => (
          <SessionRow key={s.id} s={s} />
        ))}
        {todays.some((s) => s.status === 'planned') ? (
          <T size="tiny" color="muted" style={{ marginTop: 4 }} >Ketuk sesi untuk detail. Lari dari jam otomatis tercatat saat sinkron.</T>
        ) : null}
      </Card>
      {todays.some((s) => s.status === 'planned' && !checkins.some((c) => c.sessionId === s.id && c.moment === 'sebelum')) ? (
        <Card onPress={() => router.push(`/checkin?moment=sebelum&sessionId=${encodeURIComponent(todays.find((s) => s.status === 'planned')!.id)}`)}>
          <CardHeader icon={<IconStar color={t.highlight} size={22} />} title="Check-in sebelum latihan" subtitle="Energi, tidur, dan pegal: 15 detik." />
        </Card>
      ) : null}

      {showNextWeekPrompt ? (
        <Card onPress={() => router.push('/minggu-depan')}>
          <CardHeader icon={<IconCalendar color={t.accent} size={22} />} title="Minggu depan mau latihan berapa kali?" subtitle="Atur jumlah sesi dan hari sibuk." />
        </Card>
      ) : null}

      {race ? (
        <Card onPress={() => router.push(`/lomba/${race.id}`)}>
          <CardHeader icon={<IconFlag color={t.accent} size={22} />} title={race.name} />
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <T size="small" color="muted">Target</T>
              <Num size={34}>{formatDuration(race.targetSec)}</Num>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Num size={44} color="accent">{daysBetween(day, race.date)}</Num>
              <T size="small" color="muted">hari lagi</T>
            </View>
          </Row>
        </Card>
      ) : (
        <Card onPress={() => router.push('/lomba/edit')}>
          <CardHeader icon={<IconFlag color={t.accent} size={22} />} title="Rencana lomba & pacing" subtitle="Tambahkan lomba dengan GPX resmi untuk target waktu, pace per segmen, dan GPX ke jam." />
        </Card>
      )}

      <Card onPress={() => router.push('/statistik')}>
        <CardHeader icon={<IconLoad color={t.info} size={22} />} title="Beban latihan mingguan" />
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Num size={48}>{weekLoad}</Num>
            <T size="small" color="muted">{summary.suggested ? `Disarankan ${summary.suggested[0]}-${summary.suggested[1]}` : 'Saran muncul setelah 4 minggu data'}</T>
          </View>
          <MiniBars values={weekLoads} labels={DAY_LETTER} highlight={dayIndex(day)} />
        </Row>
      </Card>

      <Card onPress={() => router.push('/statistik')}>
        <CardHeader icon={<IconTrend color={t.warn} size={22} />} title="Status latihan" />
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Num size={34} color={statusColor === 'muted' ? 'muted' : statusColor}>{summary.status}</Num>
            <T size="small" color="muted">{`Beban 7 hari ${summary.acute}${summary.ratio ? ` · rasio ${summary.ratio.toFixed(2)}` : ''}`}</T>
          </View>
          <MiniBars values={last7} labels={last7Letters} highlight={6} color={t.warn} />
        </Row>
      </Card>

      {currentWeek?.notes.length ? (
        <Card>
          <CardHeader icon={<IconStar color={t.highlight} size={22} />} title="Catatan pelatih" />
          {currentWeek.notes.slice(0, 3).map((n, i) => (
            <T key={i} size="small" color="muted" style={{ marginTop: 4 }}>{`• ${n}`}</T>
          ))}
        </Card>
      ) : null}

      {settings.lastStravaSync ? (
        <T size="tiny" color="muted" style={{ textAlign: 'center', marginTop: 8 }}>
          {`Sinkron jam terakhir ${new Date(settings.lastStravaSync * 1000).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`}
        </T>
      ) : null}
    </Screen>
  );
}
