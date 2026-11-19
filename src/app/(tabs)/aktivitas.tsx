import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { formatDuration, formatPace, fromISO } from '@/core/dates';
import { useStore } from '@/data/store';
import { IconDumbbell, IconMountain, IconRun } from '@/ui/icons';
import { Card, Empty, Num, Row, Screen, T } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

interface Item {
  id: string;
  date: string;
  kind: 'run' | 'trail' | 'strength';
  name: string;
  km: number;
  sec: number;
  elev: number;
  href: string;
}

export default function Activities() {
  const t = useTheme();
  const { activities, weeks, setLogs } = useStore();

  const groups = useMemo(() => {
    const items: Item[] = activities
      .filter((a) => a.type !== 'other')
      .map((a) => ({ id: a.id, date: a.date, kind: a.type === 'trail' ? 'trail' : 'run', name: a.name, km: a.distanceKm, sec: a.movingSec, elev: a.elevGainM, href: `/aktivitas/${encodeURIComponent(a.id)}` }));
    for (const w of Object.values(weeks)) {
      for (const s of w.sessions) {
        if (s.status !== 'done') continue;
        if (s.kind === 'strength') {
          items.push({ id: s.id, date: s.date, kind: 'strength', name: s.title, km: 0, sec: s.durationMin * 60, elev: 0, href: `/sesi/${encodeURIComponent(s.id)}` });
        } else if (!s.activityId) {
          items.push({ id: s.id, date: s.date, kind: s.runKind === 'trail' ? 'trail' : 'run', name: `${s.title} (manual)`, km: 0, sec: s.durationMin * 60, elev: 0, href: `/sesi/${encodeURIComponent(s.id)}` });
        }
      }
    }
    items.sort((a, b) => b.date.localeCompare(a.date));
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const k = it.date.slice(0, 7);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return [...map.entries()];
  }, [activities, weeks]);

  const setsBySession = (id: string) => setLogs.filter((l) => l.sessionId === id).length;

  return (
    <Screen
      title="Aktivitas"
      right={
        <Pressable onPress={() => router.push('/statistik')} hitSlop={8}>
          <T weight="600">Statistik</T>
        </Pressable>
      }>
      {groups.length === 0 ? (
        <Empty title="Belum ada aktivitas" body="Lari dari jam Coros masuk otomatis setelah Strava terhubung (Profil › Strava). Sesi dumbbell yang selesai juga muncul di sini." />
      ) : null}
      {groups.map(([month, items]) => {
        const d = fromISO(`${month}-01`);
        const km = items.reduce((a, x) => a + x.km, 0);
        const hours = items.reduce((a, x) => a + x.sec, 0) / 3600;
        return (
          <Card key={month} style={{ paddingBottom: 6 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <Num size={30}>{`${MONTH[d.getMonth()]} ${d.getFullYear()}`}</Num>
              <View style={{ alignItems: 'flex-end' }}>
                <Row style={{ gap: 4, alignItems: 'baseline' }}>
                  <Num size={30}>{km.toFixed(2)}</Num>
                  <T color="muted">km</T>
                </Row>
                <T size="small" color="muted">{`${items.length} aktivitas · ${hours.toFixed(1)} jam`}</T>
              </View>
            </Row>
            {items.map((it) => {
              const Icon = it.kind === 'strength' ? IconDumbbell : it.kind === 'trail' ? IconMountain : IconRun;
              const color = it.kind === 'strength' ? t.strength : t.run;
              const dd = fromISO(it.date);
              return (
                <Pressable key={it.id} onPress={() => router.push(it.href as never)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                  <View style={{ backgroundColor: t.cardAlt, borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Icon color={color} size={26} />
                    <View style={{ flex: 1 }}>
                      {it.km > 0 ? (
                        <Row style={{ gap: 4, alignItems: 'baseline' }}>
                          <Num size={28}>{it.km.toFixed(2)}</Num>
                          <T color="muted">km</T>
                        </Row>
                      ) : (
                        <Num size={28}>{formatDuration(it.sec)}</Num>
                      )}
                      <T size="small" color="muted">
                        {it.km > 0
                          ? `${formatDuration(it.sec)}   ${formatPace(it.sec / it.km)} /km${it.elev ? `   +${it.elev} m` : ''}`
                          : it.kind === 'strength'
                            ? `${setsBySession(it.id)} set tercatat`
                            : 'dicatat manual'}
                      </T>
                      <T size="small" color="muted" numberOfLines={1}>{`${dd.getDate()} ${MONTH[dd.getMonth()]}  ${it.name}`}</T>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </Card>
        );
      })}
    </Screen>
  );
}
