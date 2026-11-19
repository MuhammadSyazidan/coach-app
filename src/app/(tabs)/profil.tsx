import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { weekStartOf, today } from '@/core/dates';
import { availableWeights } from '@/core/strength/progression';
import { exportAll } from '@/data/db';
import { useStore } from '@/data/store';
import * as calendar from '@/services/calendar';
import { shareText } from '@/services/files';
import * as notify from '@/services/notify';
import * as strava from '@/services/strava';
import { Badge, Button, Card, Chip, ChipRow, Divider, Field, Row, Screen, Section, T } from '@/ui/kit';

const LEVEL = { pemula: 'Pemula', menengah: 'Menengah', lanjut: 'Lanjut' } as const;

export default function ProfileTab() {
  const store = useStore();
  const { profile, settings } = store;
  const [stravaOn, setStravaOn] = useState(false);
  const [clientId, setClientId] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [cals, setCals] = useState<calendar.CalendarChoice[]>([]);
  const native = Platform.OS !== 'web';

  useEffect(() => {
    if (!native) return;
    strava.isConnected().then(setStravaOn).catch(() => {});
    strava.getCredentials().then((c) => c && setClientId(c.id)).catch(() => {});
  }, [native]);

  if (!profile) return null;
  const w = availableWeights(profile.dumbbell);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Gagal', (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const connectStrava = () =>
    run('strava', async () => {
      if (clientId && secret) await strava.saveCredentials(clientId, secret);
      const name = await strava.connect();
      setStravaOn(true);
      setSecret('');
      store.saveSettings({ stravaAthlete: name });
      const r = await store.syncStrava();
      Alert.alert('Strava terhubung', `Halo ${name}. ${r.added} aktivitas lari 8 minggu terakhir diimpor.`);
    });

  const enableCalendar = () =>
    run('cal', async () => {
      if (!(await calendar.ensurePermission())) throw new Error('Izin kalender ditolak.');
      const list = await calendar.writableCalendars();
      setCals(list);
      const pick = await calendar.suggestCalendar();
      if (pick) store.saveSettings({ calendarEnabled: true, calendarId: pick.id, calendarTitle: `${pick.title} (${pick.account})` });
    });

  const enableNotif = () =>
    run('notif', async () => {
      if (!(await notify.setupNotifications())) throw new Error('Izin notifikasi ditolak.');
      store.saveSettings({ notificationsEnabled: true });
      await notify.rescheduleAll(store.weeks[weekStartOf(today())] ?? null, profile.trainingTime);
    });

  return (
    <Screen title={profile.name} subtitle={`${LEVEL[profile.level]} · ${profile.goalNote || profile.goal}`}>
      <Card>
        <T size="small" color="muted">{`${profile.defaultRunSessions}× lari + ${profile.defaultStrengthSessions}× kekuatan per minggu · ${profile.trainingTime}`}</T>
        <T size="small" color="muted">{`Dumbbell ${profile.dumbbell.adjustable ? 'adjustable' : 'tetap'}: ${w[0]}–${w[w.length - 1]} kg · bangku ${profile.hasBench ? 'ada' : 'tidak ada'}`}</T>
        <T size="small" color="muted">{`HR maks ${profile.maxHr ?? '-'} · trail ${profile.trailEveryWeeks ? `tiap ${profile.trailEveryWeeks} minggu` : 'tidak rutin'}`}</T>
        <Button small kind="secondary" title="Ubah profil" onPress={() => router.push('/onboarding?edit=1')} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
      </Card>

      {native ? (
        <>
          <Section title="Strava (data jam Coros)" action={stravaOn ? <Badge label="Terhubung" tone="good" /> : <Badge label="Belum" />}>
            <Card>
              {stravaOn ? (
                <View style={{ gap: 8 }}>
                  <T size="small">{`Terhubung${settings.stravaAthlete ? ` sebagai ${settings.stravaAthlete}` : ''}. Lari dari Coros masuk otomatis saat aplikasi dibuka.`}</T>
                  <Button small kind="secondary" title="Sinkron sekarang" loading={busy === 'sync'} onPress={() => run('sync', async () => { const r = await store.syncStrava(); Alert.alert('Selesai', `${r.added} aktivitas baru.`); })} />
                  <Button small kind="danger" title="Putuskan Strava" onPress={() => run('dis', async () => { await strava.disconnect(); setStravaOn(false); })} />
                </View>
              ) : (
                <View>
                  <T size="small" style={{ marginBottom: 10 }}>
                    {'1. Buka strava.com/settings/api dan buat aplikasi.\n2. Authorization Callback Domain: localhost\n3. Salin Client ID dan Client Secret ke sini.'}
                  </T>
                  <Field label="Client ID" value={clientId} onChangeText={setClientId} keyboardType="number-pad" autoCapitalize="none" />
                  <Field label="Client Secret" value={secret} onChangeText={setSecret} autoCapitalize="none" secureTextEntry hint="Disimpan terenkripsi di ponsel ini saja." />
                  <Button title="Hubungkan Strava" loading={busy === 'strava'} onPress={connectStrava} disabled={!clientId} />
                </View>
              )}
            </Card>
          </Section>

          <Section title="Google Calendar" action={settings.calendarEnabled ? <Badge label="Aktif" tone="good" /> : <Badge label="Mati" />}>
            <Card>
              <T size="small" style={{ marginBottom: 10 }}>
                Jadwal latihan dan lomba ditulis ke kalender akun Google di ponsel ini. Saran: buat kalender bernama “Latihan” di Google Calendar agar terpisah; aplikasi memilihnya otomatis.
              </T>
              {settings.calendarEnabled ? <T size="small" weight="600">{`Kalender: ${settings.calendarTitle ?? '-'}`}</T> : null}
              {cals.length ? (
                <ChipRow>
                  {cals.map((c) => (
                    <Chip key={c.id} label={`${c.title}`} selected={settings.calendarId === c.id} onPress={() => store.saveSettings({ calendarId: c.id, calendarTitle: `${c.title} (${c.account})` })} />
                  ))}
                </ChipRow>
              ) : null}
              <Row style={{ marginTop: 10 }}>
                <Button small title={settings.calendarEnabled ? 'Pilih kalender lain' : 'Hubungkan kalender'} loading={busy === 'cal'} onPress={enableCalendar} />
                {settings.calendarEnabled ? <Button small kind="secondary" title="Matikan" onPress={() => store.saveSettings({ calendarEnabled: false })} /> : null}
              </Row>
            </Card>
          </Section>

          <Section title="Notifikasi" action={settings.notificationsEnabled ? <Badge label="Aktif" tone="good" /> : <Badge label="Mati" />}>
            <Card>
              <T size="small" style={{ marginBottom: 10 }}>Pengingat sesi, pertanyaan jadwal setiap Minggu 19:00, dan check-in pegal pagi setelah sesi kunci.</T>
              <Button small title={settings.notificationsEnabled ? 'Jadwalkan ulang' : 'Aktifkan notifikasi'} loading={busy === 'notif'} onPress={enableNotif} />
            </Card>
          </Section>
        </>
      ) : (
        <Card tone="warn">
          <T size="small">Strava, kalender, notifikasi, dan file GPX hanya tersedia di aplikasi Android.</T>
        </Card>
      )}

      <Section title="Data">
        <Card>
          <Button small kind="secondary" title="Ekspor semua data (JSON)" onPress={() => run('exp', () => shareText('pelatih-data.json', exportAll(), 'application/json', 'Simpan cadangan data'))} style={{ alignSelf: 'flex-start' }} />
          <Divider />
          <Button
            small
            kind="danger"
            title="Hapus semua data"
            onPress={() =>
              Alert.alert('Hapus semua data?', 'Profil, rencana, check-in, dan lomba akan dihapus dari ponsel ini.', [
                { text: 'Batal', style: 'cancel' },
                { text: 'Hapus', style: 'destructive', onPress: () => { store.resetAll(); router.replace('/onboarding'); } },
              ])
            }
            style={{ alignSelf: 'flex-start' }}
          />
        </Card>
      </Section>

      <T size="tiny" color="muted" style={{ marginTop: 16 }}>
        Pelatih versi 0.1 · Aturan coaching disusun dari pedoman ACSM, NSCA, materi pelatih lari (RRCA, UESCA) dan prinsip latihan Kilian Jornet. Bukan nasihat medis. Untuk nyeri atau gejala medis, konsultasikan ke tenaga kesehatan.
      </T>
    </Screen>
  );
}
