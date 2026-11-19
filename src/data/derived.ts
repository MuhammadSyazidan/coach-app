import { useMemo } from 'react';

import { buildLoadEntries } from '@/core/load';

import { useStore } from './store';

/** Entri beban latihan dari aktivitas Strava, sesi selesai, dan check-in. */
export function useLoadEntries() {
  const { activities, weeks, checkins } = useStore();
  return useMemo(() => buildLoadEntries(activities, Object.values(weeks).flatMap((w) => w.sessions), checkins), [activities, weeks, checkins]);
}
