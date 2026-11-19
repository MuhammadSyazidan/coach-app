import type { DumbbellSetup, Level, SetLog, StrengthItem, StrengthTemplate } from '../types';
import { EXERCISE_BY_ID, type Exercise } from './exercises';

/** Semua berat dumbbell yang bisa dipakai pengguna, urut naik. */
export function availableWeights(d: DumbbellSetup): number[] {
  if (d.adjustable) {
    const out: number[] = [];
    const step = d.stepKg > 0 ? d.stepKg : 1;
    for (let w = d.minKg; w <= d.maxKg + 1e-9; w += step) out.push(Math.round(w * 100) / 100);
    return out.length ? out : [d.minKg || 2];
  }
  const ws = [...new Set(d.weightsKg.filter((w) => w > 0))].sort((a, b) => a - b);
  return ws.length ? ws : [5];
}

export function snapDown(weights: number[], kg: number): number {
  let best = weights[0];
  for (const w of weights) if (w <= kg + 1e-9) best = w;
  return best;
}

export function nextUp(weights: number[], kg: number): number | null {
  for (const w of weights) if (w > kg + 1e-9) return w;
  return null;
}

// Tebakan beban awal (kg per dumbbell) per pola gerak untuk orang dewasa menengah.
// Sesi pertama ditandai sebagai "uji beban" dan langsung dikoreksi dari RPE.
const START_GUESS: Record<Exercise['pattern'], number> = {
  squat: 10, hinge: 10, lunge: 6, push: 7, pull: 8, carry: 12, core: 4, betis: 8, isolasi: 4,
};

export function startingLoad(exerciseId: string, level: Level, weights: number[]): number {
  const ex = EXERCISE_BY_ID[exerciseId];
  if (!ex || ex.bodyweight) return 0;
  const factor = level === 'pemula' ? 0.7 : level === 'lanjut' ? 1.3 : 1;
  return snapDown(weights, START_GUESS[ex.pattern] * factor);
}

export interface ProgressionResult {
  loadKg: number;
  note?: string;
}

/**
 * Progresi ganda (double progression).
 * - Semua set mencapai batas atas rep dengan RPE rata-rata <= 8: beban naik satu langkah.
 * - Dua sesi berturut-turut ada set di bawah batas bawah: beban turun sekitar 7,5%.
 * - Selain itu: beban tetap, kejar repetisi.
 * `sessions` berisi log set per sesi, sesi terbaru di akhir.
 */
export function progress(item: Pick<StrengthItem, 'exerciseId' | 'repMin' | 'repMax'>, sessions: SetLog[][], weights: number[]): ProgressionResult | null {
  const ex = EXERCISE_BY_ID[item.exerciseId];
  if (!ex || ex.bodyweight) return { loadKg: 0 };
  const done = sessions.filter((s) => s.length > 0);
  if (done.length === 0) return null;
  const last = done[done.length - 1];
  const load = Math.max(...last.map((s) => s.loadKg));
  const hitTop = last.every((s) => s.reps >= item.repMax);
  const rpes = last.map((s) => s.rpe).filter((r): r is number => typeof r === 'number');
  const avgRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : 7;
  const failed = (s: SetLog[]) => s.some((x) => x.reps < item.repMin);

  if (last.some((s) => s.pain)) {
    return { loadKg: snapDown(weights, load * 0.9), note: 'Nyeri dilaporkan: beban diturunkan. Hentikan jika nyeri tajam.' };
  }
  if (hitTop && avgRpe <= 8) {
    const up = nextUp(weights, load);
    if (up === null) {
      return { loadKg: load, note: 'Beban sudah maksimal: tambah repetisi, turunkan pelan 3 detik, atau persingkat istirahat.' };
    }
    return { loadKg: up, note: `Naik ke ${up} kg: semua set mencapai ${item.repMax} repetisi.` };
  }
  if (done.length >= 2 && failed(last) && failed(done[done.length - 2])) {
    return { loadKg: snapDown(weights, load * 0.925), note: 'Dua sesi di bawah target: beban diturunkan sedikit.' };
  }
  return { loadKg: load };
}

type TemplateRow = [exerciseId: string, repMin: number, repMax: number, restSec: number, note?: string];

function templateRows(t: StrengthTemplate, bench: boolean): TemplateRow[] {
  switch (t) {
    case 'fullA':
      return [
        ['goblet-squat', 8, 12, 90],
        [bench ? 'bench-press' : 'floor-press', 8, 12, 90],
        ['db-row', 8, 12, 75],
        ['rdl', 8, 12, 90],
        ['calf-raise', 12, 15, 60],
        ['plank', 30, 45, 45, 'detik'],
      ];
    case 'fullB':
      return [
        [bench ? 'bulgarian' : 'split-squat', 8, 12, 90],
        ['ohp', 8, 12, 90],
        ['bent-row', 8, 12, 75],
        [bench ? 'hip-thrust' : 'glute-bridge', 10, 15, 75],
        ['sl-calf-raise', 10, 15, 60],
        ['dead-bug', 8, 12, 45],
      ];
    case 'trail':
      // Pola Kilian Jornet: sekitar 20 menit core/stabilisasi lalu 30 menit kekuatan kaki reaktif.
      return [
        ['dead-bug', 8, 12, 30, 'core'],
        ['side-plank', 20, 40, 30, 'detik per sisi'],
        ['bird-dog', 8, 12, 30, 'core'],
        [bench ? 'copenhagen' : 'hollow-hold', 15, 30, 30, 'detik'],
        [bench ? 'step-up' : 'reverse-lunge', 8, 12, 75, 'turun pelan'],
        ['sl-rdl', 8, 12, 75],
        ['sl-calf-raise', 10, 15, 60],
        ['tibialis-raise', 12, 20, 45],
      ];
    case 'upper':
      return [
        [bench ? 'bench-press' : 'floor-press', 8, 12, 90],
        ['db-row', 8, 12, 75],
        ['ohp', 8, 12, 75],
        ['reverse-fly', 12, 15, 45],
        ['hammer-curl', 10, 12, 45],
        ['triceps-ext', 10, 12, 45],
        ['plank', 30, 45, 45, 'detik'],
      ];
  }
}

export const TEMPLATE_TITLE: Record<StrengthTemplate, string> = {
  fullA: 'Kekuatan full-body A',
  fullB: 'Kekuatan full-body B',
  trail: 'Kekuatan trail (core + kaki)',
  upper: 'Kekuatan tubuh atas',
};

export function buildStrengthItems(
  t: StrengthTemplate,
  opts: { level: Level; bench: boolean; weights: number[]; history: (exerciseId: string) => SetLog[][] },
): StrengthItem[] {
  const sets = opts.level === 'pemula' ? 2 : 3;
  return templateRows(t, opts.bench).map(([exerciseId, repMin, repMax, restSec, note]) => {
    const prog = progress({ exerciseId, repMin, repMax }, opts.history(exerciseId), opts.weights);
    const loadKg = prog ? prog.loadKg : startingLoad(exerciseId, opts.level, opts.weights);
    const isCore = EXERCISE_BY_ID[exerciseId]?.pattern === 'core';
    return {
      exerciseId,
      sets: isCore ? 2 : sets,
      repMin,
      repMax,
      loadKg,
      restSec,
      note: prog?.note ?? (prog ? note : note ? `${note} · sesi pertama: pilih beban RPE 6-7` : 'Sesi pertama: pilih beban yang terasa RPE 6-7'),
    };
  });
}

export function estimateStrengthMinutes(items: StrengthItem[]): number {
  const sec = items.reduce((acc, it) => acc + it.sets * (40 + it.restSec), 0);
  return Math.round(sec / 60) + 8; // + pemanasan
}

/** Estimasi 1RM (Epley) untuk grafik progres. */
export function estimate1RM(loadKg: number, reps: number): number {
  if (reps <= 0 || loadKg <= 0) return 0;
  return Math.round(loadKg * (1 + reps / 30) * 10) / 10;
}
