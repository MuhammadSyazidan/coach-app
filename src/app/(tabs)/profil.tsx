import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { exportAll } from '@/data/db';
import { useStore } from '@/data/store';
import { shareText } from '@/services/files';
import { isConnected } from '@/services/strava';
import {
  IconBell, IconBook, IconCalendar, IconChart, IconDownload, IconEdit, IconFlag, IconLink, IconMoon, IconTrash, IconWatch,
} from '@/ui/icons';
import { Button, Card, MenuGroup, MenuRow, Num, Row, Screen, T } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

const LEVEL = { pemula: 'Pemula', menengah: 'Menengah', lanjut: 'Lanjut' } as const;
const MODE = { sistem: 'Sistem', gelap: 'Gelap', terang: 'Terang' } as const;

export default function ProfileTab() {
  const store = useStore();
  const t = useTheme();
  const { profile, settings } = store;
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') isConnected().then(setConnected).catch(() => {});
  }, [settings.lastStravaSync]);

  if (!profile) return null;
  const initial = profile.name.trim().charAt(0).toUpperCase() || 'P';

  const sync = async () => {
    if (!connected) return router.push('/pengaturan/strava');
    setSyncing(true);
    try {
      const r = await store.syncStrava();
      Alert.alert('Sinkron selesai', `${r.added} aktivitas baru.`);
    } catch (e) {
      Alert.alert('Gagal', (e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Screen>
      <Row style={{ marginTop: 8, marginBottom: 20, gap: 16 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Num size={34} style={{ color: '#fff' }}>{initial}</Num>
        </View>
        <View style={{ flex: 1 }}>
          <T size="title">{profile.name}</T>
          <T size="small" color="muted">{`${LEVEL[profile.level]} · ${profile.goalNote || 'target ' + profile.goal}`}</T>
        </View>
      </Row>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }} onPress={() => router.push('/pengaturan/jam')}>
        <View style={{ flex: 1, gap: 6 }}>
          <T size="h" weight="500">{settings.watchName ?? 'COROS PACE 3'}</T>
          <Row style={{ gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: connected ? t.good : t.muted }} />
            <T size="small" color="muted">{connected ? 'Tersambung lewat Strava' : 'Belum tersambung'}</T>
          </Row>
          <T size="small" color="muted">
            {settings.lastStravaSync ? `Sinkron ${new Date(settings.lastStravaSync * 1000).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Belum pernah sinkron'}
          </T>
          {Platform.OS !== 'web' ? <Button small kind="secondary" title={connected ? 'Sinkron sekarang' : 'Hubungkan'} loading={syncing} onPress={sync} style={{ alignSelf: 'flex-start', marginTop: 4 }} /> : null}
        </View>
        <IconWatch color={t.muted} size={72} />
      </Card>

      <MenuGroup>
        <MenuRow icon={<IconEdit color={t.good} />} label="Profil & pola latihan" onPress={() => router.push('/onboarding?edit=1')} />
        <MenuRow icon={<IconChart color={t.highlight} />} label="Statistik & rekor" onPress={() => router.push('/statistik')} />
        <MenuRow icon={<IconBook color={t.strength} />} label="Library gerakan" onPress={() => router.push('/gerakan')} />
        <MenuRow icon={<IconFlag color={t.accent} />} label="Lomba & pace strategy" onPress={() => router.push('/lomba')} />
      </MenuGroup>

      <MenuGroup>
        <MenuRow icon={<IconLink color={t.accent} />} label="Strava" value={connected ? 'Terhubung' : undefined} onPress={() => router.push('/pengaturan/strava')} />
        <MenuRow icon={<IconCalendar color={t.info} />} label="Google Calendar" value={settings.calendarEnabled ? 'Aktif' : undefined} onPress={() => router.push('/pengaturan/kalender')} />
        <MenuRow icon={<IconBell color={t.warn} />} label="Notifikasi" value={settings.notificationsEnabled ? 'Aktif' : undefined} onPress={() => router.push('/pengaturan/notifikasi')} />
        <MenuRow icon={<IconMoon color={t.muted} />} label="Tampilan" value={MODE[settings.themeMode ?? 'sistem']} onPress={() => router.push('/pengaturan/tampilan')} />
      </MenuGroup>

      <MenuGroup>
        <MenuRow
          icon={<IconDownload color={t.info} />}
          label="Ekspor data (cadangan)"
          onPress={() => shareText('pelatih-data.json', exportAll(), 'application/json', 'Simpan cadangan data').catch((e) => Alert.alert('Gagal', (e as Error).message))}
        />
        <MenuRow
          icon={<IconTrash color={t.bad} />}
          label="Hapus semua data"
          onPress={() =>
            Alert.alert('Hapus semua data?', 'Profil, rencana, check-in, dan lomba dihapus dari ponsel ini.', [
              { text: 'Batal', style: 'cancel' },
              { text: 'Hapus', style: 'destructive', onPress: () => { store.resetAll(); router.replace('/onboarding'); } },
            ])
          }
        />
      </MenuGroup>

      <T size="tiny" color="muted" style={{ marginTop: 12 }}>
        Pelatih 0.2 · Aturan coaching disusun dari pedoman ACSM, NSCA, materi pelatih lari (RRCA, UESCA) dan prinsip latihan Kilian Jornet. Bukan nasihat medis.
      </T>
    </Screen>
  );
}
