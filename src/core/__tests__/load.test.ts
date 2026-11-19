import { addDays } from '../dates';
import { activityLoad, buildLoadEntries, dailyLoads, loadSummary, type LoadEntry } from '../load';
import type { Activity } from '../types';

const act = (over: Partial<Activity>): Activity => ({
  id: 'a', source: 'strava', name: 'Lari', date: '2026-11-19', startTime: '06:00', type: 'run',
  distanceKm: 10, movingSec: 3600, elapsedSec: 3600, elevGainM: 0, ...over,
});

describe('beban latihan', () => {
  it('TRIMP dari zona HR: 60 menit di zona 2 = 120', () => {
    expect(activityLoad(act({ zoneSec: [0, 3600, 0, 0, 0] }))).toBe(120);
  });
  it('tanpa HR memakai menit × RPE × 0,5', () => {
    expect(activityLoad(act({}), 6)).toBe(180);
  });
  it('entri dari aktivitas dan sesi kekuatan selesai', () => {
    const e = buildLoadEntries([act({})], [
      { id: 's', date: '2026-11-18', kind: 'strength', title: '', durationMin: 40, summary: '', key: false, status: 'done' },
    ], []);
    expect(e).toHaveLength(2);
    expect(dailyLoads(e, '2026-11-18', 2)).toEqual([96, 120]);
  });
  it('status optimal saat beban minggu ini setara rata-rata 4 minggu sebelumnya', () => {
    const today = '2026-11-19';
    const entries: LoadEntry[] = [];
    for (let i = 0; i < 35; i++) entries.push({ date: addDays(today, -i), load: 40, kind: 'run' });
    const s = loadSummary(entries, today);
    expect(s.status).toBe('Optimal');
    expect(s.suggested).toEqual([224, 364]);
  });
  it('belum cukup data tanpa riwayat', () => {
    expect(loadSummary([], '2026-11-19').status).toBe('Belum cukup data');
  });
});
