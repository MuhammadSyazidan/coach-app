import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { View } from 'react-native';

import { addDays, formatDuration, formatPace, formatShort, today, weekStartOf } from '@/core/dates';
import { dailyLoads } from '@/core/load';
import { useLoadEntries } from '@/data/derived';
import { fitPersonalCurve } from '@/core/pacing/model';
import { EXERCISE_BY_ID } from '@/core/strength/exercises';
import { estimate1RM } from '@/core/strength/progression';
import { intensityMix, mixAdvice } from '@/core/zones';
import { useStore } from '@/data/store';
import { BarChart, ZoneBar } from '@/ui/charts';
import { Card, Empty, Num, Row, Screen, Section, T } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

export default function Statistics() {
  const { activities, setLogs, weeks, checkins } = useStore();
  const t = useTheme();
  const thisWeek = weekStartOf(today());
  const starts = Array.from({ length: 8 }, (_, i) => addDays(thisWeek, -7 * (7 - i)));

  const runMin = starts.map((w) => activities.filter((a) => a.date >= w && a.date < addDays(w, 7)).reduce((acc, a) => acc + a.movingSec / 60, 0));
  const elev = starts.map((w) => activities.filter((a) => a.date >= w && a.date < addDays(w, 7)).reduce((acc, a) => acc + a.elevGainM, 0));
  const recent = activities.filter((a) => a.date >= addDays(thisWeek, -21));
  const mix = intensityMix(recent);
  const advice = mixAdvice(mix);
  const curve = useMemo(() => fitPersonalCurve(activities.flatMap((a) => a.gradePace ?? [])), [activities]);

  const plannedVsDone = starts.slice(-4).map((w) => {
    const wk = weeks[w];
    if (!wk) return null;
    return { w, done: wk.sessions.filter((s) => s.status === 'done').length, total: wk.sessions.length };
  }).filter(Boolean) as { w: string; done: number; total: number }[];

  const strength = useMemo(() => {
    const byEx = new Map<string, { date: string; e1rm: number }[]>();
    for (const l of setLogs) {
      if (!l.loadKg) continue;
      const e = estimate1RM(l.loadKg, l.reps);
      const list = byEx.get(l.exerciseId) ?? [];
      const same = list.find((x) => x.date === l.date);
      if (same) same.e1rm = Math.max(same.e1rm, e);
      else list.push({ date: l.date, e1rm: e });
      byEx.set(l.exerciseId, list);
    }
    return [...byEx.entries()]
      .map(([id, list]) => ({ id, list: list.sort((a, b) => a.date.localeCompare(b.date)) }))
      .sort((a, b) => b.list.length - a.list.length)
      .slice(0, 6);
  }, [setLogs]);

  const records = useMemo(() => {
    const runs = activities.filter((a) => a.type !== 'other' && a.distanceKm > 0);
    const out: { label: string; value: string }[] = [];
    if (!runs.length) return out;
    const longest = runs.reduce((a, b) => (b.distanceKm > a.distanceKm ? b : a));
    out.push({ label: 'Lari terjauh (km)', value: longest.distanceKm.toFixed(2) });
    const fivePlus = runs.filter((a) => a.distanceKm >= 5);
    if (fivePlus.length) {
      const fastest = fivePlus.reduce((a, b) => (b.movingSec / b.distanceKm < a.movingSec / a.distanceKm ? b : a));
      out.push({ label: 'Pace terbaik ≥ 5 km (/km)', value: formatPace(fastest.movingSec / fastest.distanceKm) });
    }
    const climb = runs.reduce((a, b) => (b.elevGainM > a.elevGainM ? b : a));
    if (climb.elevGainM > 0) out.push({ label: 'Elevasi terbanyak (m)', value: String(climb.elevGainM) });
    const longestTime = runs.reduce((a, b) => (b.movingSec > a.movingSec ? b : a));
    out.push({ label: 'Durasi terlama', value: formatDuration(longestTime.movingSec) });
    return out;
  }, [activities]);
  const entries = useLoadEntries();
  const loadWeeks = starts.map((w) => dailyLoads(entries, w, 7).reduce((a, b) => a + b, 0));

  const feel = checkins.filter((c) => c.moment === 'setelah' && c.feeling).slice(-10);

  return (
    <Screen inset={false}>
      <T color="muted">8 minggu terakhir</T>
      {records.length ? (
        <Section title="Rekor pribadi">
          <Card style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {records.map((r) => (
              <View key={r.label} style={{ width: '50%', paddingVertical: 8 }}>
                <Num size={28}>{r.value}</Num>
                <T size="small" color="muted">{r.label}</T>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}
      {loadWeeks.some((v) => v > 0) ? (
        <Section title="Beban latihan mingguan">
          <Card>
            <BarChart values={loadWeeks} labels={starts.map((s) => formatShort(s).split(' ')[0])} unit="TRIMP / sRPE per minggu" />
          </Card>
        </Section>
      ) : null}
      {activities.length === 0 && setLogs.length === 0 ? (
        <Empty title="Belum ada data" body="Hubungkan Strava di Profil agar lari dari jam Coros masuk, atau catat sesi kekuatan pertamamu." />
      ) : null}

      {activities.length ? (
        <>
          <Section title="Volume lari">
            <Card>
              <BarChart values={runMin} labels={starts.map((s) => formatShort(s).split(' ')[0])} unit="menit lari per minggu (tanggal = awal minggu)" />
            </Card>
          </Section>
          {elev.some((e) => e > 0) ? (
            <Section title="Elevasi naik">
              <Card>
                <BarChart values={elev} labels={starts.map((s) => formatShort(s).split(' ')[0])} unit="meter per minggu" />
              </Card>
            </Section>
          ) : null}
          <Section title="Distribusi intensitas (3 minggu)">
            <Card>
              {mix.totalSec ? (
                <>
                  <ZoneBar
                    parts={[
                      { label: 'Rendah (Z1-2)', value: mix.rendah, color: t.zones[1] },
                      { label: 'Sedang (Z3)', value: mix.sedang, color: t.zones[2] },
                      { label: 'Tinggi (Z4-5)', value: mix.tinggi, color: t.zones[4] },
                    ]}
                  />
                  {advice ? <T size="small" style={{ marginTop: 10 }}>{advice}</T> : null}
                  <T size="tiny" color="muted" style={{ marginTop: 6 }}>Acuan atlet daya tahan seperti Kilian Jornet: sekitar 90% waktu di intensitas rendah.</T>
                </>
              ) : (
                <T size="small" color="muted">Belum ada data heart rate dari Strava.</T>
              )}
            </Card>
          </Section>
          <Section title="Kurva tanjakan pribadi">
            <Card>
              {curve ? (
                <View style={{ gap: 4 }}>
                  {curve.grades.map((g, i) => (
                    <Row key={g} style={{ justifyContent: 'space-between' }}>
                      <T size="small">{`${g > 0 ? '+' : ''}${Math.round(g * 100)}%`}</T>
                      <T size="small" weight="600">{`${curve.factors[i].toFixed(2)}× pace datar`}</T>
                    </Row>
                  ))}
                  <T size="tiny" color="muted">Dipakai untuk pacing trail.</T>
                </View>
              ) : (
                <T size="small" color="muted">Butuh lebih banyak trail run dengan elevasi dari Strava untuk membangun kurva pace terhadap gradien.</T>
              )}
            </Card>
          </Section>
        </>
      ) : null}

      {plannedVsDone.length ? (
        <Section title="Kepatuhan rencana">
          <Card>
            {plannedVsDone.map((p) => (
              <Row key={p.w} style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                <T size="small">{`Minggu ${formatShort(p.w)}`}</T>
                <T size="small" weight="600">{`${p.done}/${p.total} sesi`}</T>
              </Row>
            ))}
          </Card>
        </Section>
      ) : null}

      {strength.length ? (
        <Section title="Kekuatan (estimasi 1RM)">
          {strength.map(({ id, list }) => {
            const first = list[0].e1rm;
            const last = list[list.length - 1].e1rm;
            return (
              <Card key={id} onPress={() => router.push(`/gerakan/${id}`)}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T weight="600">{EXERCISE_BY_ID[id]?.name ?? id}</T>
                  <T weight="700" color={last > first ? 'good' : 'ink'}>{`${last} kg`}</T>
                </Row>
                <T size="small" color="muted">{list.length > 1 ? `${first} → ${last} kg dalam ${list.length} sesi` : '1 sesi tercatat'}</T>
              </Card>
            );
          })}
        </Section>
      ) : null}

      {feel.length ? (
        <Section title="Rasa setelah latihan">
          <Card>
            <Row style={{ gap: 6 }}>
              {feel.map((c) => (
                <View key={c.id} style={{ flex: 1, height: 10 + (c.feeling ?? 0) * 10, borderRadius: 4, backgroundColor: (c.feeling ?? 3) <= 2 ? t.bad : (c.feeling ?? 3) >= 4 ? t.good : t.warn, alignSelf: 'flex-end' }} />
              ))}
            </Row>
            <T size="tiny" color="muted" style={{ marginTop: 6 }}>10 check-in terakhir (tinggi = terasa baik)</T>
          </Card>
        </Section>
      ) : null}
    </Screen>
  );
}
