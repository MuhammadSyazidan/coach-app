import { haversineKm, type GeoPoint } from './gpx';

/** Profil rute yang sudah di-resample setiap STEP_M meter. */
export interface RouteProfile {
  /** Jarak kumulatif (km) per sampel. */
  km: number[];
  /** Elevasi yang sudah dihaluskan (m). */
  ele: number[];
  /** Titik asli dengan jarak kumulatif, untuk menaruh waypoint. */
  track: { p: GeoPoint; km: number }[];
  totalKm: number;
  gainM: number;
  lossM: number;
  hasElevation: boolean;
}

export const STEP_M = 50;

export function buildProfile(points: GeoPoint[]): RouteProfile {
  const track: { p: GeoPoint; km: number }[] = [];
  let acc = 0;
  points.forEach((p, i) => {
    if (i > 0) acc += haversineKm(points[i - 1], p);
    track.push({ p, km: acc });
  });
  const hasElevation = points.filter((p) => p.ele !== undefined).length > points.length * 0.8;
  const totalKm = acc;
  const n = Math.max(2, Math.floor((totalKm * 1000) / STEP_M) + 1);
  const km: number[] = [];
  const rawEle: number[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const x = Math.min(totalKm, (i * STEP_M) / 1000);
    while (j < track.length - 2 && track[j + 1].km < x) j++;
    const a = track[j];
    const b = track[Math.min(j + 1, track.length - 1)];
    const t = b.km > a.km ? (x - a.km) / (b.km - a.km) : 0;
    km.push(x);
    const ea = a.p.ele ?? 0;
    const eb = b.p.ele ?? ea;
    rawEle.push(hasElevation ? ea + (eb - ea) * t : 0);
  }
  if (km[km.length - 1] < totalKm - 1e-6) {
    km.push(totalKm);
    rawEle.push(rawEle[rawEle.length - 1]);
  }
  // rata-rata bergerak 5 sampel (~250 m) untuk meredam noise GPS
  const ele = rawEle.map((_, i) => {
    let s = 0;
    let c = 0;
    for (let k = Math.max(0, i - 2); k <= Math.min(rawEle.length - 1, i + 2); k++) {
      s += rawEle[k];
      c++;
    }
    return s / c;
  });
  let gainM = 0;
  let lossM = 0;
  for (let i = 1; i < ele.length; i++) {
    const d = ele[i] - ele[i - 1];
    if (d > 0) gainM += d;
    else lossM -= d;
  }
  return { km, ele, track, totalKm, gainM: Math.round(gainM), lossM: Math.round(lossM), hasElevation };
}

/** Elevasi pada jarak tertentu (interpolasi). */
export function eleAt(prof: RouteProfile, x: number): number {
  const i = Math.min(prof.km.length - 2, Math.max(0, Math.floor((x * 1000) / STEP_M)));
  const a = prof.km[i];
  const b = prof.km[i + 1];
  const t = b > a ? Math.min(1, Math.max(0, (x - a) / (b - a))) : 0;
  return prof.ele[i] + (prof.ele[i + 1] - prof.ele[i]) * t;
}

/** Titik geografis pada jarak tertentu di rute. */
export function pointAt(prof: RouteProfile, x: number): GeoPoint {
  const tr = prof.track;
  let lo = 0;
  let hi = tr.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (tr[mid].km < x) lo = mid;
    else hi = mid;
  }
  const a = tr[lo];
  const b = tr[hi];
  const t = b.km > a.km ? Math.min(1, Math.max(0, (x - a.km) / (b.km - a.km))) : 0;
  return { lat: a.p.lat + (b.p.lat - a.p.lat) * t, lon: a.p.lon + (b.p.lon - a.p.lon) * t, ele: prof.hasElevation ? eleAt(prof, x) : undefined };
}

/** Jarak (km) titik rute yang paling dekat dengan sebuah koordinat (untuk memetakan waypoint pos). */
export function nearestKm(prof: RouteProfile, p: GeoPoint): number {
  let best = 0;
  let bestD = Infinity;
  for (const t of prof.track) {
    const d = haversineKm(t.p, p);
    if (d < bestD) {
      bestD = d;
      best = t.km;
    }
  }
  return best;
}

/** Rute datar sintetis jika lomba tidak punya GPX. */
export function flatProfile(distanceKm: number, gainM: number): RouteProfile {
  const n = Math.max(2, Math.floor((distanceKm * 1000) / STEP_M) + 1);
  const km: number[] = [];
  const ele: number[] = [];
  // tanpa GPX: elevasi naik disebar merata sebagai gelombang agar gain total sesuai
  const waves = Math.max(1, Math.round(distanceKm / 5));
  const amp = gainM / (2 * waves);
  for (let i = 0; i < n; i++) {
    const x = Math.min(distanceKm, (i * STEP_M) / 1000);
    km.push(x);
    ele.push(amp * (1 - Math.cos((2 * Math.PI * waves * x) / distanceKm)));
  }
  if (km[km.length - 1] < distanceKm) {
    km.push(distanceKm);
    ele.push(ele[ele.length - 1]);
  }
  const track = km.map((k) => ({ p: { lat: 0, lon: k / 111 }, km: k }));
  return { km, ele, track, totalKm: distanceKm, gainM: Math.round(gainM), lossM: Math.round(gainM), hasElevation: gainM > 0 };
}
