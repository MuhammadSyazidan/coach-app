import { daysBetween } from '../dates';
import type { Activity, Race } from '../types';

/** Jarak usaha: 1 km datar setara 100 m elevasi naik (konvensi umum lomba trail). */
export function effortKm(distanceKm: number, gainM: number): number {
  return distanceKm + gainM / 100;
}

/** Rumus Riegel: T2 = T1 × (D2/D1)^1,06 */
export function riegel(t1Sec: number, d1: number, d2: number, exponent = 1.06): number {
  return t1Sec * Math.pow(d2 / d1, exponent);
}

export interface Prediction {
  predictedSec: number;
  basis: Activity;
}

/**
 * Perkiraan waktu dari aktivitas terbaik 8 minggu terakhir (jarak ≥ 5 km).
 * Untuk trail memakai jarak usaha agar elevasi ikut dihitung.
 */
export function predictRace(race: Race, activities: Activity[], asOf: string): Prediction | null {
  const target = effortKm(race.distanceKm, race.elevGainM);
  let best: Prediction | null = null;
  for (const a of activities) {
    if (a.type === 'other' || a.distanceKm < 5 || a.movingSec <= 0) continue;
    const age = daysBetween(a.date, asOf);
    if (age < 0 || age > 56) continue;
    // aktivitas trail dipakai untuk lomba trail; lomba road hanya dari aktivitas road
    if (race.kind === 'road' && a.type === 'trail') continue;
    const e = effortKm(a.distanceKm, race.kind === 'trail' ? a.elevGainM : 0);
    const t = riegel(a.movingSec, e, race.kind === 'trail' ? target : race.distanceKm);
    if (!best || t < best.predictedSec) best = { predictedSec: t, basis: a };
  }
  return best;
}

export type TargetVerdict = 'ringan' | 'pas' | 'berat' | 'terlalu berat';

export function judgeTarget(targetSec: number, predictedSec: number): { verdict: TargetVerdict; text: string } {
  const r = targetSec / predictedSec;
  if (r > 1.05) return { verdict: 'ringan', text: 'Target lebih lambat dari perkiraan kemampuanmu: aman, bisa dinaikkan.' };
  if (r >= 0.97) return { verdict: 'pas', text: 'Target sesuai perkiraan kemampuanmu saat ini.' };
  if (r >= 0.9) return { verdict: 'berat', text: 'Target menantang: butuh latihan konsisten sampai hari lomba.' };
  return { verdict: 'terlalu berat', text: 'Target jauh lebih cepat dari perkiraan: risiko start terlalu cepat dan kehabisan tenaga.' };
}
