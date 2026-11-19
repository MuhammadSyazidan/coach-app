import type { Activity } from './types';

/** Batas bawah zona 2..5 dalam bpm. Default dari % HR maksimal: 60/70/80/90%. */
export function defaultZoneBounds(maxHr: number): number[] {
  return [0.6, 0.7, 0.8, 0.9].map((f) => Math.round(maxHr * f));
}

/** Hitung detik di zona 1..5 dari stream heart rate dan waktu (detik sejak start). */
export function zoneSeconds(hr: number[], time: number[], bounds: number[]): number[] {
  const out = [0, 0, 0, 0, 0];
  for (let i = 1; i < hr.length && i < time.length; i++) {
    const dt = time[i] - time[i - 1];
    if (dt <= 0 || dt > 30) continue; // jeda/auto-pause
    const h = hr[i];
    let z = 0;
    while (z < 4 && h >= bounds[z]) z++;
    out[z] += dt;
  }
  return out;
}

export interface IntensityMix {
  rendah: number; // zona 1-2
  sedang: number; // zona 3
  tinggi: number; // zona 4-5
  totalSec: number;
}

export function intensityMix(activities: Activity[]): IntensityMix {
  const z = [0, 0, 0, 0, 0];
  for (const a of activities) a.zoneSec?.forEach((s, i) => (z[i] += s));
  const total = z.reduce((a, b) => a + b, 0);
  if (!total) return { rendah: 0, sedang: 0, tinggi: 0, totalSec: 0 };
  return { rendah: (z[0] + z[1]) / total, sedang: z[2] / total, tinggi: (z[3] + z[4]) / total, totalSec: total };
}

/**
 * Pesan untuk distribusi intensitas. Acuan: atlet daya tahan seperti Kilian Jornet
 * menghabiskan sekitar 90% waktu di intensitas rendah dan 8-10% di intensitas tinggi.
 */
export function mixAdvice(m: IntensityMix): string | null {
  if (m.totalSec < 3600) return null;
  if (m.tinggi > 0.2) return `Porsi intensitas tinggi ${Math.round(m.tinggi * 100)}%: terlalu banyak. Usahakan sebagian besar lari di zona 1-2.`;
  if (m.rendah < 0.6) return `Hanya ${Math.round(m.rendah * 100)}% di zona 1-2: perlambat lari mudahmu.`;
  return `${Math.round(m.rendah * 100)}% waktu di zona 1-2: distribusi intensitas sudah baik.`;
}
