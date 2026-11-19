import { computeAdaptation } from '../plan/adapt';
import { generateWeek, spreadDays } from '../plan/generator';
import { addDays, dayIndex } from '../dates';
import { profile, request } from '../testing/fixtures';
import type { Checkin, Race, WeekPlan } from '../types';

const noHistory = () => [];
const gen = (over: Parameters<typeof request>[0] = {}, prev: WeekPlan | null = null, races: Race[] = [], p = profile()) =>
  generateWeek({ profile: p, request: request(over), prev, adaptation: computeAdaptation(prev, [], []), races, strengthHistory: noHistory });

describe('spreadDays', () => {
  it('menyebar hari dan memuat hari wajib', () => {
    const d = spreadDays([0, 1, 2, 3, 4, 5, 6], 3, [6]);
    expect(d).toContain(6);
    expect(d).toHaveLength(3);
  });
});

describe('generateWeek', () => {
  it('membuat jumlah sesi sesuai permintaan, dengan satu sesi panjang di akhir pekan', () => {
    const w = gen();
    expect(w.sessions.filter((s) => s.kind === 'run')).toHaveLength(4);
    expect(w.sessions.filter((s) => s.kind === 'strength')).toHaveLength(2);
    const long = w.sessions.filter((s) => s.runKind === 'long');
    expect(long).toHaveLength(1);
    expect([5, 6]).toContain(dayIndex(long[0].date));
  });

  it('tidak menaruh kekuatan kaki sehari sebelum lari panjang/trail', () => {
    for (const includeTrail of [false, true]) {
      const w = gen({ includeTrail });
      const hard = w.sessions.filter((s) => s.runKind === 'long' || s.runKind === 'trail').map((s) => s.date);
      for (const s of w.sessions.filter((x) => x.kind === 'strength' && x.strengthTemplate !== 'upper')) {
        expect(hard).not.toContain(addDays(s.date, 1));
        expect(hard).not.toContain(s.date);
      }
    }
  });

  it('trail menggantikan lari panjang, bukan tambahan', () => {
    const w = gen({ includeTrail: true });
    expect(w.sessions.filter((s) => s.runKind === 'trail')).toHaveLength(1);
    expect(w.sessions.filter((s) => s.runKind === 'long')).toHaveLength(0);
  });

  it('menghormati hari sibuk dan mengurangi sesi bila hari kurang', () => {
    const w = gen({ availableDays: [1, 3, 5], busyDays: [3], runSessions: 4, strengthSessions: 0 });
    expect(w.sessions.every((s) => [1, 5].includes(dayIndex(s.date)))).toBe(true);
    expect(w.sessions).toHaveLength(2);
    expect(w.notes.join(' ')).toMatch(/dikurangi/);
  });

  it('kenaikan level beban tidak lebih dari 10% per minggu, minggu ke-4 adalah pemulihan', () => {
    let prev: WeekPlan | null = null;
    const bases: number[] = [];
    const phases: string[] = [];
    for (let i = 0; i < 5; i++) {
      const w: WeekPlan = generateWeek({
        profile: profile(), request: request({ weekStart: addDays('2026-11-23', 7 * i) }), prev,
        adaptation: computeAdaptation(prev && { ...prev, sessions: prev.sessions.map((s) => ({ ...s, status: 'done' as const })) }, [], []),
        races: [], strengthHistory: noHistory,
      });
      bases.push(w.baseMinutes);
      phases.push(w.phase);
      prev = { ...w, sessions: w.sessions.map((s) => ({ ...s, status: 'done' as const })) };
    }
    for (let i = 1; i < bases.length; i++) expect(bases[i] / bases[i - 1]).toBeLessThanOrEqual(1.1 + 1e-9);
    expect(phases[3]).toBe('pemulihan');
  });

  it('pemula yang belum bisa lari 20 menit mendapat sesi lari-jalan tanpa interval', () => {
    const w = gen({ runSessions: 3 }, null, [], profile({ level: 'pemula', longestRecentRunMin: 5, weeklyRunMinutes: 0 }));
    const runs = w.sessions.filter((s) => s.kind === 'run');
    expect(runs.every((s) => s.runKind === 'runwalk')).toBe(true);
  });

  it('minggu lomba memakai pola taper: istirahat di H-3 dan sesi lomba di hari H', () => {
    const race: Race = {
      id: 'r1', name: 'Uji 10K', date: '2026-11-29', startTime: '05:30', kind: 'road', distanceKm: 10, elevGainM: 50,
      targetSec: 3000, tempC: 27, humidity: 80, strategy: 'rata', aid: [],
    };
    const w = gen({}, null, [race]);
    expect(w.phase).toBe('lomba');
    expect(w.sessions.find((s) => s.runKind === 'race')?.date).toBe('2026-11-29');
    expect(w.sessions.filter((s) => s.date === '2026-11-26')).toHaveLength(0); // H-3
  });
});

describe('computeAdaptation', () => {
  const base = gen();
  const ci = (date: string, feeling: number, rpe = 7): Checkin => ({
    id: date, date, moment: 'setelah', rpe, feeling, pain: false, painAreas: [], flags: [], note: '',
  });

  it('dua sesi berturut-turut terasa buruk memicu minggu pemulihan', () => {
    const a = computeAdaptation(base, [ci('2026-11-24', 2), ci('2026-11-25', 1)], []);
    expect(a.forceRecovery).toBe(true);
  });

  it('dua sesi terlewat menurunkan beban', () => {
    const prev = { ...base, sessions: base.sessions.map((s, i) => ({ ...s, status: i < 2 ? ('skipped' as const) : ('done' as const) })) };
    expect(computeAdaptation(prev, [], []).growth).toBeLessThan(1);
  });

  it('nyeri lutut mengganti latihan kaki dengan tubuh atas', () => {
    const prev = { ...base, sessions: base.sessions.map((s) => ({ ...s, status: 'done' as const })) };
    const a = computeAdaptation(prev, [{ ...ci('2026-11-24', 3), pain: true, painAreas: ['lutut'] }], []);
    const w = generateWeek({ profile: profile(), request: request({ weekStart: '2026-11-30' }), prev, adaptation: a, races: [], strengthHistory: noHistory });
    expect(w.sessions.filter((s) => s.kind === 'strength').every((s) => s.strengthTemplate === 'upper')).toBe(true);
  });
});
