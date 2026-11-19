import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { daysBetween, formatDate, formatDuration, formatPace, today } from '@/core/dates';
import { parseGpx } from '@/core/pacing/gpx';
import { fitPersonalCurve } from '@/core/pacing/model';
import { buildPacingPlan, exportPacingGpx, paceBand } from '@/core/pacing/plan';
import { judgeTarget, predictRace } from '@/core/pacing/predict';
import { buildProfile, flatProfile } from '@/core/pacing/profile';
import { useStore } from '@/data/store';
import { shareText } from '@/services/files';
import { ElevationChart } from '@/ui/charts';
import { Badge, Button, Card, Row, Screen, Section, Stepper, T } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

export default function RaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useStore();
  const t = useTheme();
  const race = store.races.find((r) => r.id === id);
  const [heatOverride, setHeatOverride] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const curve = useMemo(() => fitPersonalCurve(store.activities.flatMap((a) => a.gradePace ?? [])), [store.activities]);
  const prof = useMemo(() => {
    if (!race) return null;
    if (race.gpx) {
      try {
        return buildProfile(parseGpx(race.gpx).points);
      } catch {
        // jatuh ke profil sintetis
      }
    }
    return flatProfile(race.distanceKm, race.elevGainM);
  }, [race]);
  const plan = useMemo(() => {
    if (!race || !prof) return null;
    try {
      return buildPacingPlan(race, prof, { curve: race.kind === 'trail' ? curve : null, heatPct: heatOverride ?? undefined });
    } catch (e) {
      return e as Error;
    }
  }, [race, prof, curve, heatOverride]);

  if (!race || !prof) return <Screen inset={false} title="Lomba tidak ditemukan"><Button title="Kembali" onPress={() => router.back()} /></Screen>;

  const day = today();
  const prediction = predictRace(race, store.activities, day);
  const verdict = prediction ? judgeTarget(race.targetSec, prediction.predictedSec) : null;
  const result = store.activities.find((a) => a.date === race.date && a.distanceKm > race.distanceKm * 0.8);

  const exportGpx = async () => {
    if (!plan || plan instanceof Error) return;
    if (!race.gpx) {
      Alert.alert('Butuh GPX resmi', 'Tambahkan GPX lomba dulu agar waypoint menempel di rute yang benar.');
      return;
    }
    try {
      await shareText(`${race.name}-pacing.gpx`, exportPacingGpx(race, prof, plan), 'application/gpx+xml', 'Kirim ke aplikasi COROS');
    } catch (e) {
      Alert.alert('Gagal berbagi', (e as Error).message);
    }
  };

  const shareBand = async () => {
    if (!plan || plan instanceof Error) return;
    const rows = paceBand(race, plan);
    const text = [`${race.name} · target ${formatDuration(race.targetSec)} · start ${race.startTime}`, '', ...rows.map((r) => `${r.label.padEnd(22)} ${r.clock}  (${r.elapsed})`), '', `Asupan: ${plan.carbsPerHour} g karbo/jam, ${plan.fluidPerHour} ml cairan/jam`].join('\n');
    try {
      await shareText(`${race.name}-kartu-pace.txt`, text, 'text/plain', 'Bagikan kartu pace');
    } catch (e) {
      Alert.alert('Gagal berbagi', (e as Error).message);
    }
  };

  const verdictTone = verdict?.verdict === 'pas' ? 'good' : verdict?.verdict === 'ringan' ? 'accent' : verdict?.verdict === 'berat' ? 'warn' : 'bad';

  return (
    <Screen inset={false} title={race.name} subtitle={`${formatDate(race.date)} · start ${race.startTime}`}>
      <Stack.Screen options={{ title: 'Lomba', headerRight: () => <Button small kind="ghost" title="Ubah" onPress={() => router.push(`/lomba/edit?id=${race.id}`)} /> }} />
      <Row style={{ marginBottom: 12 }}>
        <Badge label={race.kind === 'trail' ? 'Trail' : 'Road'} tone={race.kind === 'trail' ? 'good' : 'run'} />
        <Badge label={`${race.distanceKm} km`} />
        <Badge label={`+${race.elevGainM} m`} />
        {race.date >= day ? <Badge label={`${daysBetween(day, race.date)} hari lagi`} tone="accent" /> : null}
      </Row>

      <Card>
        <T size="small" color="muted">Target waktu</T>
        <T size="big">{formatDuration(race.targetSec)}</T>
        {plan && !(plan instanceof Error) ? (
          <T size="small" color="muted">{`Pace rata-rata ${formatPace(race.targetSec / race.distanceKm)}/km · pace datar setara ${formatPace(plan.flatPaceSec)}/km`}</T>
        ) : null}
      </Card>

      {verdict && prediction ? (
        <Card tone={verdictTone}>
          <T weight="700">{`Target ${verdict.verdict}`}</T>
          <T size="small" style={{ marginTop: 4 }}>{verdict.text}</T>
          <T size="small" style={{ marginTop: 4 }}>{`Perkiraan saat ini ${formatDuration(prediction.predictedSec)}, dari "${prediction.basis.name}" (${prediction.basis.distanceKm.toFixed(1)} km).`}</T>
        </Card>
      ) : (
        <Card>
          <T size="small" color="muted">Belum bisa menilai target: butuh aktivitas lari ≥ 5 km dalam 8 minggu terakhir dari Strava.</T>
        </Card>
      )}

      {plan instanceof Error ? (
        <Card tone="bad"><T>{plan.message}</T></Card>
      ) : plan ? (
        <>
          <Section title="Profil rute">
            <Card>
              <ElevationChart km={prof.km} ele={prof.ele} cuts={plan.segments.slice(0, -1).map((s) => s.endKm)} />
              {!race.gpx ? <T size="tiny" color="muted">Tanpa GPX: elevasi disebar merata sebagai perkiraan.</T> : null}
              {race.kind === 'trail' ? (
                <T size="tiny" color="muted" style={{ marginTop: 4 }}>
                  {curve ? `Memakai kurva pace pribadimu dari ${curve.samples} sampel trail.` : 'Kurva pribadi belum cukup data: memakai model gradien standar. Sinkron lebih banyak trail run dari Strava.'}
                </T>
              ) : null}
            </Card>
          </Section>

          {plan.warnings.length ? (
            <Card tone="warn">
              {plan.warnings.map((w, i) => (
                <T key={i} size="small">{`• ${w}`}</T>
              ))}
            </Card>
          ) : null}

          <Section title="Penyesuaian cuaca">
            <Row style={{ justifyContent: 'space-between' }}>
              <T size="small" color="muted" style={{ flex: 1 }}>{`Saran untuk ${race.tempC}°C / ${race.humidity}%. Ubah bila perlu.`}</T>
              <Stepper value={heatOverride ?? plan.heatPct} onChange={setHeatOverride} min={0} max={15} step={0.5} suffix="%" />
            </Row>
          </Section>

          <Section title="Pacing per segmen">
            <View style={{ flexDirection: 'row', paddingHorizontal: 4, marginBottom: 6 }}>
              <T size="tiny" color="muted" style={{ flex: 2.2 }}>Km</T>
              <T size="tiny" color="muted" style={{ flex: 2 }}>Medan</T>
              <T size="tiny" color="muted" style={{ flex: 1.3, textAlign: 'right' }}>Pace</T>
              <T size="tiny" color="muted" style={{ flex: 1.3, textAlign: 'right' }}>Tiba</T>
            </View>
            {(showAll ? plan.segments : plan.segments.slice(0, 12)).map((s) => (
              <View key={s.index} style={{ borderTopWidth: 1, borderColor: t.line, paddingVertical: 8, paddingHorizontal: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <T size="small" style={{ flex: 2.2 }}>{`${s.startKm.toFixed(1)}–${s.endKm.toFixed(1)}`}</T>
                  <T size="small" style={{ flex: 2 }} color={s.hike ? 'warn' : 'ink'}>{`${s.terrain}${s.hike ? ' · jalan' : ''}`}</T>
                  <T size="small" weight="700" style={{ flex: 1.3, textAlign: 'right' }}>{formatPace(s.paceSec)}</T>
                  <T size="small" style={{ flex: 1.3, textAlign: 'right' }}>{s.arriveClock}</T>
                </View>
                <T size="tiny" color="muted">
                  {`${s.gainM ? `+${s.gainM} m ` : ''}${s.lossM ? `−${s.lossM} m ` : ''}${s.carbsG ? `· ${s.carbsG} g karbo, ${s.fluidMl} ml` : ''}${s.aid ? ` · ${s.aid.name}, berhenti ${Math.round(s.aid.stopSec / 60)}'` : ''}${s.cutoffMarginSec !== undefined ? ` · cut-off +${Math.round(s.cutoffMarginSec / 60)}'` : ''}`}
                </T>
              </View>
            ))}
            {plan.segments.length > 12 ? (
              <Button small kind="ghost" title={showAll ? 'Ringkas' : `Tampilkan semua ${plan.segments.length} segmen`} onPress={() => setShowAll(!showAll)} style={{ alignSelf: 'flex-start' }} />
            ) : null}
          </Section>

          <Section title="Asupan">
            <Card>
              <T>{plan.carbsPerHour ? `${plan.carbsPerHour} g karbohidrat per jam (sekitar ${Math.round(plan.carbsPerHour / 25)} gel) dan ${plan.fluidPerHour} ml cairan per jam.` : 'Lomba di bawah ±75 menit: cukup minum sesuai haus.'}</T>
              <T size="small" color="muted" style={{ marginTop: 6 }}>Uji rencana asupan ini saat long run, jangan pertama kali di hari lomba.</T>
            </Card>
          </Section>

          <Section title="Hari H dengan jam Coros">
            {Platform.OS !== 'web' ? (
              <View style={{ gap: 8 }}>
                <Button title="Ekspor GPX ke COROS" onPress={exportGpx} />
                <Button kind="secondary" title="Bagikan kartu pace" onPress={shareBand} />
              </View>
            ) : null}
            <Card style={{ marginTop: 12 }}>
              <T weight="700" style={{ marginBottom: 6 }}>Cara memakai di jam</T>
              <T size="small">1. Ketuk “Ekspor GPX ke COROS”, pilih aplikasi COROS, lalu Save.</T>
              <T size="small">2. Di aplikasi COROS: Explore › rute › Sync with your device.</T>
              <T size="small">3. Di jam: mode Trail Run/Run › Navigate › pilih rute. Halaman waypoint menampilkan jarak dan elevasi ke waypoint berikutnya. Nama waypoint berisi target: “KM12 1:18 6:40” = tiba di km 12 pada 1:18, lalu pace 6:40/km.</T>
              <T size="small" style={{ marginTop: 6 }}>Pace 3 kamu mendukung Pace Strategy: di aplikasi COROS buka Profile › Pace Strategy, pilih rute yang sama, isi target {formatDuration(race.targetSec)}, lalu sesuaikan waktu segmen dan pos dengan tabel di atas. Jam akan menampilkan selisih terhadap rencana secara langsung.</T>
            </Card>
          </Section>

          {result ? (
            <Section title="Hasil lomba">
              <Card tone={result.movingSec <= race.targetSec ? 'good' : 'warn'}>
                <T weight="700">{`${formatDuration(result.elapsedSec)} (bergerak ${formatDuration(result.movingSec)})`}</T>
                <T size="small">{`Target ${formatDuration(race.targetSec)} · selisih ${result.elapsedSec <= race.targetSec ? '−' : '+'}${formatDuration(Math.abs(result.elapsedSec - race.targetSec))}`}</T>
                {!result.checkinDone ? (
                  <Button small title="Check-in setelah lomba" onPress={() => router.push(`/checkin?moment=setelah&activityId=${encodeURIComponent(result.id)}`)} style={{ marginTop: 8, alignSelf: 'flex-start' }} />
                ) : null}
              </Card>
            </Section>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
