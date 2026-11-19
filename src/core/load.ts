import { addDays } from './dates';
import type { Activity, Checkin, PlannedSession } from './types';

// Beban latihan:
// - Ada heart rate: TRIMP Edwards = jumlah menit di zona 1..5 × bobot 1..5.
// - Tanpa heart rate: session-RPE (Foster) = menit × RPE, diskalakan 0,5 agar sebanding dengan TRIMP.
// Status memakai rasio beban akut (7 hari) terhadap kronis (rata-rata mingguan 4 minggu sebelumnya).

export interface LoadEntry {
  date: string;
  load: number;
  kind: 'run' | 'strength';
}

export function activityLoad(a: Activity, rpe?: number): number {
  if (a.zoneSec && a.zoneSec.some((s) => s > 0)) {
    return Math.round(a.zoneSec.reduce((acc, s, i) => acc + (s / 60) * (i + 1), 0));
  }
  return Math.round((a.movingSec / 60) * (rpe ?? 4) * 0.5);
}

export function strengthLoad(minutes: number, rpe?: number): number {
  return Math.round(minutes * (rpe ?? 6) * 0.4);
}

export function buildLoadEntries(activities: Activity[], sessions: PlannedSession[], checkins: Checkin[]): LoadEntry[] {
  const rpeFor = (sessionId?: string, activityId?: string) =>
    checkins.find((c) => c.moment === 'setelah' && ((activityId && c.activityId === activityId) || (sessionId && c.sessionId === sessionId)))?.rpe;
  const out: LoadEntry[] = activities.filter((a) => a.type !== 'other').map((a) => ({ date: a.date, load: activityLoad(a, rpeFor(a.sessionId, a.id)), kind: 'run' as const }));
  for (const s of sessions) {
    if (s.status !== 'done') continue;
    if (s.kind === 'strength') out.push({ date: s.date, load: strengthLoad(s.durationMin, rpeFor(s.id)), kind: 'strength' });
    else if (!s.activityId) out.push({ date: s.date, load: Math.round(s.durationMin * (rpeFor(s.id) ?? 4) * 0.5), kind: 'run' });
  }
  return out;
}

export function dailyLoads(entries: LoadEntry[], from: string, days: number): number[] {
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(from, i);
    return entries.filter((e) => e.date === d).reduce((acc, e) => acc + e.load, 0);
  });
}

export type LoadStatus = 'Belum cukup data' | 'Menurun' | 'Optimal' | 'Meningkat' | 'Terlalu tinggi';

export interface LoadSummary {
  acute: number;
  chronic: number;
  ratio: number | null;
  status: LoadStatus;
  /** Rentang beban 7 hari yang disarankan (0,8-1,3 × kronis). */
  suggested: [number, number] | null;
}

export function loadSummary(entries: LoadEntry[], today: string): LoadSummary {
  const acute = dailyLoads(entries, addDays(today, -6), 7).reduce((a, b) => a + b, 0);
  const prior = dailyLoads(entries, addDays(today, -34), 28).reduce((a, b) => a + b, 0);
  const chronic = prior / 4;
  if (chronic < 30) return { acute, chronic, ratio: null, status: 'Belum cukup data', suggested: null };
  const ratio = acute / chronic;
  const status: LoadStatus = ratio < 0.8 ? 'Menurun' : ratio <= 1.3 ? 'Optimal' : ratio <= 1.5 ? 'Meningkat' : 'Terlalu tinggi';
  return { acute, chronic, ratio, status, suggested: [Math.round(chronic * 0.8), Math.round(chronic * 1.3)] };
}
