import { parseGpx } from '../pacing/gpx';
import { fitPersonalCurve, modelFactor, paceFactor } from '../pacing/model';
import { buildPacingPlan, exportPacingGpx, paceBand, waypointName } from '../pacing/plan';
import { effortKm, judgeTarget, predictRace, riegel } from '../pacing/predict';
import { buildProfile, flatProfile, nearestKm } from '../pacing/profile';
import { syntheticGpx } from '../testing/fixtures';
import type { Race } from '../types';

const trailRace = (over: Partial<Race> = {}): Race => ({
  id: 't1', name: 'Uji Trail', date: '2026-12-20', startTime: '06:00', kind: 'trail', distanceKm: 10, elevGainM: 300,
  targetSec: 90 * 60, tempC: 26, humidity: 80, strategy: 'rata', aid: [{ name: 'Pos 1', km: 5.5, stopSec: 120 }], ...over,
});

describe('GPX', () => {
  it('membaca titik, elevasi, waypoint, dan nama', () => {
    const g = parseGpx(syntheticGpx());
    expect(g.points.length).toBe(401);
    expect(g.waypoints[0].name).toBe('Pos 1');
    expect(g.name).toBe('Uji Trail');
  });
  it('menolak file bukan GPX', () => {
    expect(() => parseGpx('<kml></kml>')).toThrow();
  });
  it('profil: jarak ~10 km dan elevasi naik ~300 m', () => {
    const p = buildProfile(parseGpx(syntheticGpx()).points);
    expect(p.totalKm).toBeGreaterThan(9.9);
    expect(p.totalKm).toBeLessThan(10.1);
    expect(p.gainM).toBeGreaterThan(280);
    expect(p.gainM).toBeLessThan(320);
  });
  it('waypoint pos dipetakan ke km yang benar', () => {
    const g = parseGpx(syntheticGpx());
    const p = buildProfile(g.points);
    expect(nearestKm(p, g.waypoints[0])).toBeCloseTo(5.5, 1);
  });
});

describe('model gradien', () => {
  it('tanjakan lebih lambat dari datar, turunan landai sedikit lebih cepat', () => {
    expect(modelFactor(0, 'road')).toBeCloseTo(1, 5);
    expect(modelFactor(0.1, 'trail')).toBeGreaterThan(1.25);
    expect(modelFactor(-0.05, 'road')).toBeLessThan(1);
    expect(modelFactor(-0.05, 'road')).toBeGreaterThanOrEqual(0.9);
  });
  it('kurva pribadi dipakai bila datanya cukup', () => {
    const samples: [number, number][] = [];
    for (let i = 0; i < 40; i++) {
      samples.push([0, 360], [0.1, 600], [0.2, 900], [-0.1, 330]);
    }
    const curve = fitPersonalCurve(samples);
    expect(curve).not.toBeNull();
    // pribadi 600/360 = 1.67 dicampur 70/30 dengan model
    expect(paceFactor(0.1, 'trail', curve)).toBeGreaterThan(modelFactor(0.1, 'trail'));
  });
});

describe('pacing plan', () => {
  const prof = buildProfile(parseGpx(syntheticGpx()).points);

  it('total waktu tiba di finish = target, termasuk berhenti di pos', () => {
    const plan = buildPacingPlan(trailRace(), prof);
    const last = plan.segments[plan.segments.length - 1];
    expect(last.arriveSec).toBeCloseTo(90 * 60, 0);
    expect(plan.stopSec).toBe(120);
  });

  it('segmen tanjakan lebih lambat dari segmen datar, dan ada batas segmen di pos', () => {
    const plan = buildPacingPlan(trailRace(), prof);
    const climb = plan.segments.find((s) => s.terrain.startsWith('tanjakan'))!;
    const flat = plan.segments.find((s) => s.terrain === 'datar')!;
    expect(climb.paceSec).toBeGreaterThan(flat.paceSec);
    expect(plan.segments.some((s) => s.aid?.name === 'Pos 1')).toBe(true);
  });

  it('road: per km, km pertama tidak lebih cepat dari rata-rata (start tenang)', () => {
    const race: Race = { ...trailRace(), kind: 'road', aid: [], targetSec: 50 * 60, strategy: 'negatif', tempC: 15, humidity: 50 };
    const plan = buildPacingPlan(race, flatProfile(10, 0));
    expect(plan.segments).toHaveLength(10);
    const avg = plan.movingSec / 10;
    expect(plan.segments[0].paceSec).toBeGreaterThan(avg);
    expect(plan.segments[9].paceSec).toBeLessThan(avg);
  });

  it('peringatan cut-off muncul bila selisih kecil', () => {
    const plan = buildPacingPlan(trailRace({ aid: [{ name: 'Pos 1', km: 5.5, stopSec: 60, cutoff: '06:50' }] }), prof);
    expect(plan.warnings.join(' ')).toMatch(/cut-off/);
  });

  it('ekspor GPX: rute tetap utuh dan waypoint berisi target', () => {
    const race = trailRace();
    const plan = buildPacingPlan(race, prof);
    const gpx = exportPacingGpx(race, prof, plan);
    const again = parseGpx(gpx);
    expect(again.points).toHaveLength(401);
    expect(again.waypoints.length).toBe(plan.segments.length);
    expect(again.waypoints.at(-1)!.name).toMatch(/^FINISH/);
    expect(again.waypoints.every((w) => w.name.length <= 18)).toBe(true);
  });

  it('kartu pace berisi pos dan finish', () => {
    const race = trailRace();
    const band = paceBand(race, buildPacingPlan(race, prof));
    expect(band.map((b) => b.label)).toEqual(['Pos 1 (km 5.5)', 'Finish']);
  });

  it('nama waypoint ringkas', () => {
    expect(waypointName(12.3, 4680, 400)).toBe('KM12 1:18 6:40');
    expect(waypointName(2.5, 900, 330)).toBe('KM2.5 15:00 5:30');
  });
});

describe('prediksi', () => {
  it('Riegel dan jarak usaha', () => {
    expect(riegel(1500, 5, 10)).toBeCloseTo(1500 * Math.pow(2, 1.06), 3);
    expect(effortKm(20, 1000)).toBe(30);
  });
  it('menilai target terhadap prediksi', () => {
    const race = trailRace({ kind: 'road', elevGainM: 0, targetSec: 3000 });
    const pred = predictRace(race, [
      { id: 'a', source: 'strava', name: 'Lari', date: '2026-12-01', startTime: '', type: 'run', distanceKm: 5, movingSec: 1500, elapsedSec: 1500, elevGainM: 0 },
    ], '2026-12-10');
    expect(pred).not.toBeNull();
    expect(judgeTarget(3400, pred!.predictedSec).verdict).toBe('ringan');
    expect(judgeTarget(3000, pred!.predictedSec).verdict).toBe('berat');
    expect(judgeTarget(2700, pred!.predictedSec).verdict).toBe('terlalu berat');
  });
});
