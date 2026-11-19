import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { today, weekStartOf } from '@/core/dates';
import { useStore } from '@/data/store';
import * as calendar from '@/services/calendar';
import * as notify from '@/services/notify';
import * as strava from '@/services/strava';
import { Badge, Button, Card, CardHeader, Chip, ChipRow, Field, Row, Screen, T } from '@/ui/kit';
import type { ThemeMode } from '@/ui/theme';

const TITLES: Record<string, string> = { strava: 'Strava', kalender: 'Google Calendar', notifikasi: 'Notifikasi', tampilan: 'Tampilan', jam: 'Jam' };

export default function SettingsScreen() {
  const { bagian } = useLocalSearchParams<{ bagian: string }>();
  return (
    <>
      <Stack.Screen options={{ title: TITLES[bagian] ?? 'Pengaturan' }} />
      <Screen inset={false}>
        {bagian === 'strava' ? <StravaSettings /> : null}
        {bagian === 'kalender' ? <CalendarSettings /> : null}
        {bagian === 'notifikasi' ? <NotifSettings /> : null}
        {bagian === 'tampilan' ? <ThemeSettings /> : null}
        {bagian === 'jam' ? <WatchSettings /> : null}
      </Screen>
    </>
  );
}

function useBusy() {
  const [busy, setBusy] = useState<string | null>(null);
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
  return { busy, run };
}

function NativeOnly({ children }: { children: React.ReactNode }) {
  if (Platform.OS === 'web') {
    return (
      <Card tone="warn">
        <T size="small">Fitur ini hanya tersedia di aplikasi Android.</T>
      </Card>
    );
  }
  return <>{children}</>;
}

function StravaSettings() {
  const store = useStore();
  const [on, setOn] = useState(false);
  const [clientId, setClientId] = useState('');
  const [secret, setSecret] = useState('');
  const { busy, run } = useBusy();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    strava.isConnected().then(setOn).catch(() => {});
    strava.getCredentials().then((c) => c && setClientId(c.id)).catch(() => {});
  }, []);

  const connect = () =>
    run('connect', async () => {
      if (clientId && secret) await strava.saveCredentials(clientId, secret);
      const name = await strava.connect();
      setOn(true);
      setSecret('');
      store.saveSettings({ stravaAthlete: name });
      const r = await store.syncStrava();
      Alert.alert('Strava terhubung', `Halo ${name}. ${r.added} aktivitas lari 8 minggu terakhir diimpor.`);
    });

  return (
    <NativeOnly>
      <Card>
        <CardHeader title="Status" right={on ? <Badge label="Terhubung" tone="good" /> : <Badge label="Belum" />} />
        <T size="small" color="muted">Data jam Coros masuk lewat Strava. Pastikan aplikasi COROS sudah tersambung ke Strava (Profile › Settings › 3rd Party Apps).</T>
      </Card>
      {on ? (
        <View style={{ gap: 8 }}>
          {store.settings.stravaAthlete ? <T>{`Terhubung sebagai ${store.settings.stravaAthlete}`}</T> : null}
          <Button title="Sinkron sekarang" loading={busy === 'sync'} onPress={() => run('sync', async () => { const r = await store.syncStrava(); Alert.alert('Selesai', `${r.added} aktivitas baru.`); })} />
          <Button kind="danger" title="Putuskan Strava" onPress={() => run('dis', async () => { await strava.disconnect(); setOn(false); })} />
        </View>
      ) : (
        <Card>
          <CardHeader title="Hubungkan" />
          <T size="small" style={{ marginBottom: 12 }}>{'1. Buka strava.com/settings/api dan buat aplikasi.\n2. Authorization Callback Domain: localhost\n3. Salin Client ID dan Client Secret ke sini.'}</T>
          <Field label="Client ID" value={clientId} onChangeText={setClientId} keyboardType="number-pad" autoCapitalize="none" />
          <Field label="Client Secret" value={secret} onChangeText={setSecret} autoCapitalize="none" secureTextEntry hint="Disimpan terenkripsi di ponsel ini saja." />
          <Button title="Hubungkan Strava" loading={busy === 'connect'} onPress={connect} disabled={!clientId} />
        </Card>
      )}
    </NativeOnly>
  );
}

function CalendarSettings() {
  const store = useStore();
  const { settings } = store;
  const [cals, setCals] = useState<calendar.CalendarChoice[]>([]);
  const { busy, run } = useBusy();
  const enable = () =>
    run('cal', async () => {
      if (!(await calendar.ensurePermission())) throw new Error('Izin kalender ditolak.');
      setCals(await calendar.writableCalendars());
      const pick = await calendar.suggestCalendar();
      if (pick) store.saveSettings({ calendarEnabled: true, calendarId: pick.id, calendarTitle: `${pick.title} (${pick.account})` });
    });
  return (
    <NativeOnly>
      <Card>
        <CardHeader title="Status" right={settings.calendarEnabled ? <Badge label="Aktif" tone="good" /> : <Badge label="Mati" />} />
        <T size="small" color="muted">Jadwal latihan dan lomba ditulis ke kalender akun Google di ponsel ini, dan waktu sibukmu dibaca saat menyusun minggu depan. Saran: buat kalender bernama “Latihan” di Google Calendar; aplikasi memilihnya otomatis.</T>
        {settings.calendarEnabled ? <T weight="600" style={{ marginTop: 10 }}>{`Kalender: ${settings.calendarTitle ?? '-'}`}</T> : null}
      </Card>
      {cals.length ? (
        <Card>
          <CardHeader title="Pilih kalender" />
          <ChipRow>
            {cals.map((c) => (
              <Chip key={c.id} label={c.title} selected={settings.calendarId === c.id} onPress={() => store.saveSettings({ calendarId: c.id, calendarTitle: `${c.title} (${c.account})` })} />
            ))}
          </ChipRow>
        </Card>
      ) : null}
      <Row>
        <Button title={settings.calendarEnabled ? 'Pilih kalender lain' : 'Hubungkan kalender'} loading={busy === 'cal'} onPress={enable} style={{ flex: 1 }} />
        {settings.calendarEnabled ? <Button kind="secondary" title="Matikan" onPress={() => store.saveSettings({ calendarEnabled: false })} /> : null}
      </Row>
    </NativeOnly>
  );
}

function NotifSettings() {
  const store = useStore();
  const { busy, run } = useBusy();
  return (
    <NativeOnly>
      <Card>
        <CardHeader title="Pengingat" right={store.settings.notificationsEnabled ? <Badge label="Aktif" tone="good" /> : <Badge label="Mati" />} />
        <T size="small" color="muted">Pengingat sesi di hari latihan, pertanyaan jadwal setiap Minggu 19:00, dan check-in pegal pagi setelah sesi kunci.</T>
      </Card>
      <Button
        title={store.settings.notificationsEnabled ? 'Jadwalkan ulang' : 'Aktifkan notifikasi'}
        loading={busy === 'n'}
        onPress={() =>
          run('n', async () => {
            if (!(await notify.setupNotifications())) throw new Error('Izin notifikasi ditolak.');
            store.saveSettings({ notificationsEnabled: true });
            await notify.rescheduleAll(store.weeks[weekStartOf(today())] ?? null, store.profile?.trainingTime ?? 'pagi');
          })
        }
      />
    </NativeOnly>
  );
}

function ThemeSettings() {
  const store = useStore();
  const mode = store.settings.themeMode ?? 'sistem';
  const opts: { v: ThemeMode; label: string; desc: string }[] = [
    { v: 'sistem', label: 'Ikuti sistem', desc: 'Gelap atau terang mengikuti pengaturan ponsel.' },
    { v: 'gelap', label: 'Gelap', desc: 'Latar hitam, nyaman di pagi buta dan hemat baterai di layar AMOLED.' },
    { v: 'terang', label: 'Terang', desc: 'Latar terang, lebih mudah dibaca di bawah matahari.' },
  ];
  return (
    <>
      {opts.map((o) => (
        <Card key={o.v} onPress={() => store.saveSettings({ themeMode: o.v })} tone={mode === o.v ? 'accent' : undefined}>
          <CardHeader title={o.label} right={mode === o.v ? <Badge label="Dipakai" tone="accent" /> : undefined} />
          <T size="small" color="muted">{o.desc}</T>
        </Card>
      ))}
    </>
  );
}

function WatchSettings() {
  const store = useStore();
  const [name, setName] = useState(store.settings.watchName ?? 'COROS PACE 3');
  return (
    <>
      <Field label="Nama jam" value={name} onChangeText={setName} />
      <Button title="Simpan" onPress={() => store.saveSettings({ watchName: name.trim() || 'Jam saya' })} />
    </>
  );
}
