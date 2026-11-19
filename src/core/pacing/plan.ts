import { clockAdd, clockToSec, formatDuration, formatPace } from '../dates';
import type { AidStation, Race } from '../types';
import { writeGpx, type Waypoint } from './gpx';
import { heatAdjustPct, paceFactor, POWER_HIKE_GRADE, type PersonalCurve } from './model';
import { eleAt, pointAt, type RouteProfile } from './profile';

export type Terrain = 'datar' | 'tanjakan' | 'tanjakan curam' | 'turunan' | 'turunan curam';

export interface PacingSegment {
  index: number;
  startKm: number;
  endKm: number;
  distKm: number;
  gainM: number;
  lossM: number;
  grade: number;
  terrain: Terrain;
  hike: boolean;
  paceSec: number;
  segSec: number;
  /** Waktu tiba di akhir segmen (detik sejak start), sudah termasuk berhenti di pos sebelumnya. */
  arriveSec: number;
  arriveClock: string;
  aid?: AidStation;
  /** Selisih (detik) terhadap cut-off pos; negatif = melewati cut-off. */
  cutoffMarginSec?: number;
  carbsG: number;
  fluidMl: number;
}

export interface PacingPlan {
  raceId: string;
  targetSec: number;
  movingSec: number;
  stopSec: number;
  flatPaceSec: number;
  heatPct: number;
  carbsPerHour: number;
  fluidPerHour: number;
  segments: PacingSegment[];
  warnings: string[];
}

const classify = (g: number): Terrain =>
  g >= POWER_HIKE_GRADE ? 'tanjakan curam' : g >= 0.035 ? 'tanjakan' : g <= -0.12 ? 'turunan curam' : g <= -0.035 ? 'turunan' : 'datar';

interface RawSeg {
  startKm: number;
  endKm: number;
}

/** Bagi rute menjadi segmen. Road: per km. Trail: per perubahan medan, dipotong di pos. */
export function segmentRoute(prof: RouteProfile, kind: 'road' | 'trail', aidKm: number[]): RawSeg[] {
  const total = prof.totalKm;
  const cuts = new Set<number>();
  if (kind === 'road') {
    for (let k = 1; k < total - 0.05; k++) cuts.add(k);
  } else {
    // klasifikasi tiap langkah 50 m berdasarkan gradien rata-rata 200 m ke depan
    const n = prof.km.length;
    const cls: Terrain[] = [];
    for (let i = 0; i < n - 1; i++) {
      const j = Math.min(n - 1, i + 4);
      const dx = (prof.km[j] - prof.km[i]) * 1000;
      cls.push(classify(dx > 0 ? (prof.ele[j] - prof.ele[i]) / dx : 0));
    }
    let runs: { start: number; end: number; t: Terrain }[] = [];
    cls.forEach((t, i) => {
      const last = runs[runs.length - 1];
      if (last && last.t === t) last.end = prof.km[i + 1];
      else runs.push({ start: prof.km[i], end: prof.km[i + 1], t });
    });
    // gabungkan potongan pendek (< 400 m) ke tetangganya
    let changed = true;
    while (changed && runs.length > 1) {
      changed = false;
      let shortest = -1;
      let len = Infinity;
      runs.forEach((r, i) => {
        if (r.end - r.start < len) {
          len = r.end - r.start;
          shortest = i;
        }
      });
      if (len < 0.4) {
        const i = shortest;
        const target = i === 0 ? 1 : i === runs.length - 1 ? i - 1 : runs[i - 1].end - runs[i - 1].start < runs[i + 1].end - runs[i + 1].start ? i - 1 : i + 1;
        const a = Math.min(i, target);
        runs[a] = { start: runs[a].start, end: runs[a + 1].end, t: runs[a].t };
        runs.splice(a + 1, 1);
        changed = true;
      }
    }
    runs = runs.filter((r) => r.end - r.start > 1e-6);
    for (const r of runs.slice(1)) cuts.add(Math.round(r.start * 1000) / 1000);
    // potong segmen panjang (> 3 km) supaya waypoint tidak terlalu jarang
    const sorted = [0, ...[...cuts].sort((a, b) => a - b), total];
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const parts = Math.ceil((b - a) / 3);
      for (let p = 1; p < parts; p++) cuts.add(Math.round((a + ((b - a) * p) / parts) * 1000) / 1000);
    }
  }
  for (const k of aidKm) if (k > 0.05 && k < total - 0.05) cuts.add(Math.round(k * 1000) / 1000);
  const pts = [0, ...[...cuts].sort((a, b) => a - b), total];
  const segs: RawSeg[] = [];
  for (let i = 0; i < pts.length - 1; i++) if (pts[i + 1] - pts[i] > 0.01) segs.push({ startKm: pts[i], endKm: pts[i + 1] });
  return segs;
}

function segElevation(prof: RouteProfile, a: number, b: number) {
  let gain = 0;
  let loss = 0;
  const steps = Math.max(1, Math.round(((b - a) * 1000) / 50));
  let prev = eleAt(prof, a);
  for (let s = 1; s <= steps; s++) {
    const e = eleAt(prof, a + ((b - a) * s) / steps);
    if (e > prev) gain += e - prev;
    else loss += prev - e;
    prev = e;
  }
  return { gain, loss, grade: (eleAt(prof, b) - eleAt(prof, a)) / ((b - a) * 1000) };
}

/** Asupan per jam (heuristik umum; uji dulu saat long run). */
export function fuelRates(durationSec: number, tempC: number) {
  const h = durationSec / 3600;
  const carbs = h < 1.25 ? 0 : h < 2.5 ? 40 : 60;
  const fluid = tempC >= 30 ? 700 : tempC >= 26 ? 600 : 450;
  return { carbs, fluid: h < 1 ? 0 : fluid };
}

export interface PacingOptions {
  curve?: PersonalCurve | null;
  /** Override persen penyesuaian cuaca. */
  heatPct?: number;
}

export function buildPacingPlan(race: Race, prof: RouteProfile, opts: PacingOptions = {}): PacingPlan {
  const warnings: string[] = [];
  const aid = [...race.aid].sort((a, b) => a.km - b.km);
  const raw = segmentRoute(prof, race.kind, aid.map((a) => a.km));
  const heatPct = opts.heatPct ?? heatAdjustPct(race.tempC, race.humidity);
  const heat = 1 + heatPct / 100;
  const stopSec = aid.reduce((acc, a) => acc + a.stopSec, 0);
  const movingSec = race.targetSec - stopSec;
  if (movingSec <= 0) throw new Error('Waktu berhenti di pos lebih besar dari target waktu.');

  const longRace = race.targetSec > 3 * 3600;
  const fatigueMax = race.targetSec > 6 * 3600 ? 0.1 : longRace ? 0.06 : 0;

  const base = raw.map((s) => {
    const el = prof.hasElevation ? segElevation(prof, s.startKm, s.endKm) : { gain: 0, loss: 0, grade: 0 };
    const mid = (s.startKm + s.endKm) / 2 / prof.totalKm;
    let f = paceFactor(el.grade, race.kind, opts.curve);
    f *= 1 + fatigueMax * mid ** 1.5; // cadangan kelelahan bertahap
    if (race.kind === 'road') {
      if (race.strategy === 'negatif') f *= mid < 0.5 ? 1.012 : 0.988;
      if (s.startKm < 1) f *= 1.015; // km pertama sedikit lebih tenang
    }
    return { ...s, ...el, f: f * heat };
  });
  const weighted = base.reduce((acc, s) => acc + (s.endKm - s.startKm) * s.f, 0);
  const p0 = movingSec / weighted; // pace datar "murni" (detik/km)

  const rates = fuelRates(race.targetSec, race.tempC);
  let t = 0;
  const segments: PacingSegment[] = base.map((s, i) => {
    const dist = s.endKm - s.startKm;
    const paceSec = p0 * s.f;
    const segSec = paceSec * dist;
    t += segSec;
    const station = aid.find((a) => Math.abs(a.km - s.endKm) < 0.02);
    const arriveSec = t;
    let cutoffMarginSec: number | undefined;
    if (station?.cutoff) {
      const cutoff = (clockToSec(station.cutoff) - clockToSec(race.startTime) + 86400) % 86400;
      cutoffMarginSec = cutoff - arriveSec;
      if (cutoffMarginSec < 15 * 60) warnings.push(`Selisih dengan cut-off ${station.name} hanya ${Math.round(cutoffMarginSec / 60)} menit.`);
    }
    if (station) t += station.stopSec;
    const terrain = classify(s.grade);
    return {
      index: i + 1,
      startKm: s.startKm,
      endKm: s.endKm,
      distKm: dist,
      gainM: Math.round(s.gain),
      lossM: Math.round(s.loss),
      grade: s.grade,
      terrain,
      hike: race.kind === 'trail' && s.grade >= POWER_HIKE_GRADE,
      paceSec,
      segSec,
      arriveSec,
      arriveClock: clockAdd(race.startTime, arriveSec),
      aid: station,
      cutoffMarginSec,
      carbsG: Math.round((rates.carbs * segSec) / 3600),
      fluidMl: Math.round((rates.fluid * segSec) / 3600),
    };
  });
  if (!prof.hasElevation && race.kind === 'trail') warnings.push('GPX tanpa data elevasi: pacing trail kurang akurat. Tambahkan elevasi lewat aplikasi COROS atau GPS Visualizer.');
  if (heatPct > 0) warnings.push(`Target sudah memperhitungkan cuaca ${race.tempC}°C / ${race.humidity}% (pace dilonggarkan ${heatPct}%).`);
  return {
    raceId: race.id, targetSec: race.targetSec, movingSec, stopSec, flatPaceSec: p0, heatPct,
    carbsPerHour: rates.carbs, fluidPerHour: rates.fluid, segments, warnings,
  };
}

/** Nama waypoint ringkas untuk layar jam: "KM12 1:18 6:40" (jarak, target tiba, pace segmen berikutnya). */
export function waypointName(km: number, arriveSec: number, nextPaceSec: number | null, aidName?: string): string {
  const kmText = km >= 10 ? Math.round(km) : Math.round(km * 10) / 10;
  const arrive = formatDuration(arriveSec).replace(/:\d\d$/, (m) => (arriveSec >= 3600 ? '' : m));
  const head = aidName ? aidName.slice(0, 6).toUpperCase().replace(/\s+/g, '') : `KM${kmText}`;
  const pace = nextPaceSec ? ` ${formatPace(nextPaceSec)}` : '';
  return `${head} ${arrive}${pace}`.slice(0, 18);
}

/**
 * GPX untuk diimpor ke aplikasi COROS: rute asli + waypoint di setiap akhir segmen dan pos.
 * COROS menyarankan rute < 200 waypoint, jadi waypoint dijarangkan bila perlu.
 */
export function exportPacingGpx(race: Race, prof: RouteProfile, plan: PacingPlan): string {
  const segs = plan.segments;
  const maxWp = 190;
  const stride = Math.ceil(segs.length / maxWp);
  const wps: Waypoint[] = [];
  segs.forEach((s, i) => {
    const isLast = i === segs.length - 1;
    if (!s.aid && !isLast && (i + 1) % stride !== 0) return;
    const next = segs[i + 1];
    const p = pointAt(prof, s.endKm);
    wps.push({
      ...p,
      name: isLast ? `FINISH ${formatDuration(plan.targetSec)}` : waypointName(s.endKm, s.arriveSec, next ? next.paceSec : null, s.aid?.name),
      desc:
        `Km ${s.endKm.toFixed(2)} · target tiba ${s.arriveClock} (${formatDuration(s.arriveSec)})` +
        (next ? ` · berikutnya ${next.terrain}${next.hike ? ' (jalan cepat)' : ''} ${formatPace(next.paceSec)}/km` : '') +
        (s.aid ? ` · pos ${s.aid.name}, berhenti ${Math.round(s.aid.stopSec / 60)} menit` : '') +
        (s.carbsG ? ` · asupan segmen ${s.carbsG} g karbo, ${s.fluidMl} ml` : ''),
    });
  });
  const points = prof.track.map((t) => t.p);
  return writeGpx({ name: `${race.name} - pacing ${formatDuration(plan.targetSec)}`, points, waypoints: wps });
}

/** Ringkasan kartu pace: target tiba per pos, atau per 5 km bila tidak ada pos. */
export function paceBand(race: Race, plan: PacingPlan): { label: string; clock: string; elapsed: string }[] {
  const rows: { label: string; clock: string; elapsed: string }[] = [];
  const aidSegs = plan.segments.filter((s) => s.aid);
  if (aidSegs.length) {
    for (const s of aidSegs) rows.push({ label: `${s.aid!.name} (km ${s.endKm.toFixed(1)})`, clock: s.arriveClock, elapsed: formatDuration(s.arriveSec) });
  } else {
    let next = 5;
    for (const s of plan.segments) {
      if (s.endKm + 1e-6 >= next && s.endKm < race.distanceKm - 0.5) {
        rows.push({ label: `Km ${Math.round(s.endKm)}`, clock: s.arriveClock, elapsed: formatDuration(s.arriveSec) });
        next += 5;
      }
    }
  }
  const last = plan.segments[plan.segments.length - 1];
  rows.push({ label: 'Finish', clock: last.arriveClock, elapsed: formatDuration(last.arriveSec) });
  return rows;
}
