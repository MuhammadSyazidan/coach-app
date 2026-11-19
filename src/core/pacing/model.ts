// Model pace terhadap gradien.
//
// Dasar: biaya energi lari Minetti dkk. (2002), C(i) dalam J/kg/m untuk gradien i (-0,45..0,45).
// Minetti cenderung terlalu menghukum tanjakan dan terlalu memudahkan turunan untuk pace nyata,
// jadi faktor dilunakkan (heuristik) lalu dikalibrasi dengan kurva pribadi dari data Strava pengguna.

export function minettiCost(i: number): number {
  const x = Math.max(-0.45, Math.min(0.45, i));
  return 155.4 * x ** 5 - 30.4 * x ** 4 - 43.3 * x ** 3 + 46.3 * x ** 2 + 19.5 * x + 3.6;
}

/** Gradien mulai dianggap jalan cepat (power hiking) di trail. */
export const POWER_HIKE_GRADE = 0.15;

/** Pengali pace relatif terhadap pace datar (1 = sama dengan datar). */
export function modelFactor(grade: number, kind: 'road' | 'trail'): number {
  const ratio = minettiCost(grade) / minettiCost(0);
  if (grade >= 0) return 1 + 0.6 * (ratio - 1);
  // turunan: pace hanya sedikit lebih cepat; turunan curam justru melambat karena pengereman
  const gentle = Math.max(kind === 'road' ? 0.9 : 0.93, 1 + 0.35 * (ratio - 1));
  if (kind === 'trail' && grade < -0.12) return gentle + (Math.abs(grade) - 0.12) * 1.2; // faktor teknis
  return gentle;
}

export interface PersonalCurve {
  /** Titik tengah bin gradien. */
  grades: number[];
  /** Pengali pace relatif ke datar untuk bin tersebut. */
  factors: number[];
  samples: number;
}

const BIN = 0.05;

/**
 * Bangun kurva pribadi "pace terhadap gradien" dari sampel (gradien, pace detik/km)
 * hasil aktivitas trail pengguna. Bin dengan kurang dari minPerBin sampel diabaikan.
 */
export function fitPersonalCurve(samples: [number, number][], minPerBin = 15): PersonalCurve | null {
  const bins = new Map<number, number[]>();
  for (const [g, p] of samples) {
    if (!isFinite(g) || !isFinite(p) || p < 150 || p > 1800) continue; // 2:30 - 30:00 per km
    const b = Math.round(Math.max(-0.35, Math.min(0.4, g)) / BIN);
    if (!bins.has(b)) bins.set(b, []);
    bins.get(b)!.push(p);
  }
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  const flat = bins.get(0);
  if (!flat || flat.length < minPerBin) return null;
  const flatPace = median(flat);
  const keys = [...bins.keys()].filter((k) => bins.get(k)!.length >= minPerBin).sort((a, b) => a - b);
  if (keys.length < 3) return null;
  return {
    grades: keys.map((k) => k * BIN),
    factors: keys.map((k) => median(bins.get(k)!) / flatPace),
    samples: samples.length,
  };
}

/** Pengali pace akhir: kurva pribadi bila tersedia di rentang gradien itu, selain itu model. */
export function paceFactor(grade: number, kind: 'road' | 'trail', curve?: PersonalCurve | null): number {
  const m = modelFactor(grade, kind);
  if (!curve || curve.grades.length < 2) return m;
  const g = curve.grades;
  if (grade < g[0] || grade > g[g.length - 1]) return m;
  let i = 0;
  while (i < g.length - 2 && g[i + 1] < grade) i++;
  const t = (grade - g[i]) / (g[i + 1] - g[i] || 1);
  const personal = curve.factors[i] + (curve.factors[i + 1] - curve.factors[i]) * Math.max(0, Math.min(1, t));
  // campur 70% pribadi, 30% model agar tidak terlalu sensitif terhadap data sedikit
  return 0.7 * personal + 0.3 * m;
}

/**
 * Saran penyesuaian cuaca (persen perlambatan). Heuristik sederhana untuk iklim tropis:
 * sekitar 0,3% per derajat di atas 15°C ditambah efek kelembapan di atas 60%. Bisa diubah pengguna.
 */
export function heatAdjustPct(tempC: number, humidity: number): number {
  const pct = (tempC - 15) * 0.3 + Math.max(0, humidity - 60) * 0.05;
  return Math.round(Math.max(0, Math.min(10, pct)) * 10) / 10;
}
