import { addDays, daysBetween, dayIndex, DAY_LONG, formatDuration, formatMinutes } from '../dates';
import { availableWeights, buildStrengthItems, estimateStrengthMinutes, TEMPLATE_TITLE } from '../strength/progression';
import type {
  DayIndex, PlannedSession, Profile, Race, RunKind, RunStep, SetLog, StrengthTemplate, WeekPlan, WeekRequest,
} from '../types';
import { isLegArea, type Adaptation } from './adapt';

export interface GenerateInput {
  profile: Profile;
  request: WeekRequest;
  prev: WeekPlan | null;
  adaptation: Adaptation;
  races: Race[];
  strengthHistory: (exerciseId: string) => SetLog[][];
}

const RUN_TITLE: Record<RunKind, string> = {
  easy: 'Lari mudah',
  long: 'Lari panjang',
  trail: 'Trail run',
  interval: 'Interval',
  tempo: 'Tempo',
  hill: 'Repetisi tanjakan',
  runwalk: 'Lari-jalan',
  race: 'Hari lomba',
  shakeout: 'Lari pelepas',
};

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const round5 = (x: number) => Math.max(5, Math.round(x / 5) * 5);

/** Pilih `n` hari dari `days` yang jaraknya sebisa mungkin merata, wajib memuat `must`. */
export function spreadDays(days: DayIndex[], n: number, must: DayIndex[] = []): DayIndex[] {
  const pool = [...new Set(days)].sort((a, b) => a - b);
  const chosen: DayIndex[] = must.filter((d) => pool.includes(d));
  while (chosen.length < n) {
    let best: DayIndex | null = null;
    let bestGap = -1;
    for (const d of pool) {
      if (chosen.includes(d)) continue;
      // jarak melingkar (minggu ke minggu juga berpengaruh)
      const gap = chosen.length ? Math.min(...chosen.map((c) => Math.min(Math.abs(c - d), 7 - Math.abs(c - d)))) : 7;
      if (gap > bestGap) {
        bestGap = gap;
        best = d;
      }
    }
    if (best === null) break;
    chosen.push(best);
  }
  return chosen.sort((a, b) => a - b);
}

function runSteps(kind: RunKind, minutes: number, profile: Profile, weekNumber: number, cycleWeek: number): { steps: RunStep[]; summary: string } {
  const z = (label: string, m: number, zone: RunStep['zone'], repeat?: number): RunStep => ({ label, minutes: m, zone, repeat });
  switch (kind) {
    case 'runwalk': {
      // Progresi lari-jalan: lari 1 menit di minggu 1, naik bertahap sampai lari kontinu.
      const runMin = clamp(weekNumber, 1, 10);
      const walkMin = runMin >= 5 ? 1 : 2;
      const reps = Math.max(3, Math.floor((minutes - 10) / (runMin + walkMin)));
      return {
        steps: [z('Jalan cepat pemanasan', 5, 1), z(`Lari ${runMin} menit, jalan ${walkMin} menit`, runMin + walkMin, 2, reps), z('Jalan pendinginan', 5, 1)],
        summary: `${reps}× lari ${runMin}' / jalan ${walkMin}' · bisa mengobrol`,
      };
    }
    case 'easy':
      return { steps: [z('Lari mudah (masih bisa mengobrol)', minutes, 2)], summary: 'zona 2, masih bisa mengobrol' };
    case 'shakeout':
      return { steps: [z('Lari sangat santai', minutes, 1)], summary: `${minutes} menit santai, kaki terasa ringan` };
    case 'long': {
      const finish = profile.level !== 'pemula' && cycleWeek === 3 ? 10 : 0;
      const steps = [z('Lari panjang stabil', minutes - finish, 2)];
      if (finish) steps.push(z('Akhiri sedikit lebih cepat', finish, 3));
      return { steps, summary: `${formatMinutes(minutes)} di zona 2${finish ? ', 10 menit akhir zona 3' : ''}` };
    }
    case 'trail':
      return {
        steps: [
          z('Trail berbasis waktu, bukan pace', minutes, 2),
        ],
        summary: `${formatMinutes(minutes)} di zona 2 · tanjakan curam boleh jalan cepat`,
      };
    case 'interval': {
      const reps = profile.level === 'lanjut' ? 6 : 5;
      return {
        steps: [z('Pemanasan', 15, 2), z('Cepat (zona 4)', 3, 4, reps), z('Jogging pulih', 2, 1, reps), z('Pendinginan', 10, 1)],
        summary: `${reps}× 3' zona 4 / 2' jogging`,
      };
    }
    case 'tempo': {
      const block = profile.level === 'lanjut' ? 25 : 20;
      return {
        steps: [z('Pemanasan', 15, 2), z('Tempo stabil (zona 3)', block, 3), z('Pendinginan', 10, 1)],
        summary: `${block} menit tempo zona 3`,
      };
    }
    case 'hill': {
      const reps = profile.level === 'lanjut' ? 8 : 6;
      return {
        steps: [
          z('Pemanasan ke tanjakan', 15, 2),
          z('Menanjak kuat (zona 4); bergantian langkah pendek cepat dan langkah panjang', 2, 4, reps),
          z('Jalan/jogging turun', 2, 1, reps),
          z('Pendinginan', 10, 1),
        ],
        summary: `${reps}× 2' tanjakan zona 4 · drill langkah`,
      };
    }
    case 'race':
      return { steps: [], summary: 'Jalankan pacing strategy' };
  }
}

function qualityRotation(profile: Profile, weekNumber: number, includeTrail: boolean): RunKind[] {
  const trailish = profile.goal === 'trail' || includeTrail;
  const a: RunKind = weekNumber % 2 === 0 ? 'interval' : 'tempo';
  const b: RunKind = trailish ? 'hill' : weekNumber % 2 === 0 ? 'tempo' : 'interval';
  if (trailish && weekNumber % 2 === 1) return ['hill', a === 'tempo' ? 'interval' : 'tempo'];
  return [a, b];
}

export function upcomingRace(races: Race[], from: string): Race | null {
  const future = races.filter((r) => r.date >= from).sort((a, b) => a.date.localeCompare(b.date));
  return future[0] ?? null;
}

export function generateWeek(input: GenerateInput): WeekPlan {
  const { profile, request, prev, adaptation, races } = input;
  const weekStart = request.weekStart;
  const weekEnd = addDays(weekStart, 6);
  const notes: string[] = [...adaptation.reasons];
  const weekNumber = prev ? prev.weekNumber + 1 : 1;
  let cycleWeek = prev ? (prev.cycleWeek % 4) + 1 : 1;
  if (adaptation.forceRecovery) cycleWeek = 4;

  // ---- fase berdasarkan lomba ----
  const race = upcomingRace(races, weekStart);
  const daysToRace = race ? daysBetween(weekStart, race.date) : Infinity;
  let phase: WeekPlan['phase'];
  if (race && race.date <= weekEnd) phase = 'lomba';
  else if (daysToRace <= 13) phase = 'taper';
  else if (daysToRace <= 34) phase = cycleWeek === 4 ? 'pemulihan' : 'spesifik';
  else if (cycleWeek === 4) phase = 'pemulihan';
  else phase = profile.level === 'pemula' && weekNumber <= 4 ? 'dasar' : 'pembangunan';
  if ((phase === 'taper' || phase === 'lomba' || phase === 'spesifik') && cycleWeek === 4 && !adaptation.forceRecovery) {
    // jangan memotong minggu lomba dengan minggu pemulihan; siklus diatur ulang setelah lomba
    cycleWeek = 3;
  }

  // ---- level beban ----
  const startMin = Math.max(profile.weeklyRunMinutes, request.runSessions * 20);
  let base = prev ? prev.baseMinutes * (prev.phase === 'pemulihan' && !adaptation.forceRecovery ? 1 : adaptation.growth) : startMin;
  if (prev && adaptation.forceRecovery) base = prev.baseMinutes;
  const maxBase = request.runSessions * profile.maxSessionMinutes * 0.75;
  base = clamp(base, request.runSessions * 15, Math.max(maxBase, request.runSessions * 20));
  const phaseFactor = phase === 'pemulihan' ? 0.75 : phase === 'taper' ? 0.8 : phase === 'lomba' ? 0.55 : 1;
  const runMinutes = Math.round(base * phaseFactor);

  if (phase === 'pemulihan') notes.push('Minggu pemulihan: volume turun sekitar 25% agar tubuh beradaptasi.');
  if (phase === 'taper' && race) notes.push(`Tapering menuju ${race.name}: volume turun, intensitas dijaga.`);
  if (phase === 'spesifik' && race) notes.push(`Persiapan spesifik ${race.name}: sesi meniru medan dan durasi lomba.`);

  // ---- hari ----
  const free = request.availableDays.filter((d) => !request.busyDays.includes(d)).sort((a, b) => a - b) as DayIndex[];
  let runCount = request.runSessions;
  if (free.length === 0) {
    return {
      weekStart, cycleWeek, phase, weekNumber, baseMinutes: Math.round(base), runMinutes: 0, sessions: [],
      notes: [...notes, 'Tidak ada hari tersedia minggu ini. Istirahat juga bagian dari latihan.'], request,
    };
  }
  if (runCount > free.length) {
    notes.push(`Hanya ${free.length} hari tersedia: sesi lari dikurangi menjadi ${free.length}.`);
    runCount = free.length;
  }

  const sessions: PlannedSession[] = [];
  const legsBlocked = adaptation.painAreas.some(isLegArea);

  if (phase === 'lomba' && race) {
    buildRaceWeek(sessions, race, weekStart, free, profile, input);
    notes.push(`Minggu lomba: latihan normal ringan sampai H-4, istirahat penuh H-3, pelepas singkat H-2 dan H-1.`);
  } else {
    const weekendPref = ([6, 5] as DayIndex[]).find((d) => free.includes(d));
    const longDay: DayIndex | null = runCount > 0 ? (weekendPref ?? free[free.length - 1]) : null;
    const runDays = runCount > 0 ? spreadDays(free, runCount, longDay !== null ? [longDay] : []) : [];

    const beginner = profile.level === 'pemula' && profile.longestRecentRunMin < 20 && weekNumber <= 10;
    let qualityN = profile.level === 'pemula' ? 0 : profile.level === 'menengah' ? (runCount >= 3 ? 1 : 0) : runCount >= 4 ? 2 : runCount >= 3 ? 1 : 0;
    if (phase === 'pemulihan' || phase === 'taper') qualityN = Math.min(qualityN, 1);
    if (beginner) qualityN = 0;

    const others = runDays.filter((d) => d !== longDay);
    const distToLong = (d: DayIndex) => (longDay === null ? 7 : Math.min(Math.abs(d - longDay), 7 - Math.abs(d - longDay)));
    const qualityDays = [...others].sort((a, b) => distToLong(b) - distToLong(a)).slice(0, qualityN).sort((a, b) => a - b);
    const qKinds = qualityRotation(profile, weekNumber, request.includeTrail);

    const isTrailWeek = request.includeTrail;
    const longMin = runCount === 1 ? runMinutes : round5(clamp(runMinutes * (runCount <= 2 ? 0.5 : 0.32), 30, profile.maxSessionMinutes));
    const longKind: RunKind = beginner ? 'runwalk' : isTrailWeek ? 'trail' : 'long';
    const longActual = isTrailWeek && !beginner ? round5(Math.min(longMin * 1.15, Math.max(profile.maxSessionMinutes, longMin))) : longMin;
    const qMin = phase === 'taper' ? 40 : 50;
    const easyCount = runDays.length - (longDay !== null ? 1 : 0) - qualityDays.length;
    const remaining = Math.max(0, runMinutes - longMin - qMin * qualityDays.length);
    const easyMin = easyCount > 0 ? round5(clamp(remaining / easyCount, 20, Math.min(60, profile.maxSessionMinutes))) : 0;

    for (const d of runDays) {
      const date = addDays(weekStart, d);
      let kind: RunKind;
      let minutes: number;
      let why: string | undefined;
      if (d === longDay) {
        kind = longKind;
        minutes = beginner ? Math.max(25, Math.min(40, longMin)) : longActual;
        why = isTrailWeek
          ? 'Trail run menggantikan lari panjang minggu ini (bukan sesi tambahan).'
          : 'Satu sesi panjang per minggu membangun daya tahan.';
      } else if (qualityDays.includes(d)) {
        kind = qKinds[qualityDays.indexOf(d)] ?? 'tempo';
        minutes = qMin;
        why = 'Sesi kualitas ditempatkan jauh dari sesi panjang agar tubuh sempat pulih.';
      } else {
        kind = beginner ? 'runwalk' : 'easy';
        minutes = beginner ? 30 : easyMin;
      }
      if (adaptation.unplannedTrail.length && kind !== 'easy' && kind !== 'runwalk' && d !== longDay && d <= 2) {
        kind = 'easy';
        minutes = easyMin || 30;
        why = 'Diganti lari mudah karena ada trail run di luar rencana akhir pekan lalu.';
      }
      const { steps, summary } = runSteps(kind, minutes, profile, weekNumber, cycleWeek);
      sessions.push({
        id: `${date}-run`, date, kind: 'run', runKind: kind, title: RUN_TITLE[kind], durationMin: minutes, summary, steps,
        key: d === longDay || qualityDays.includes(d), why, status: 'planned',
      });
    }

    // ---- kekuatan ----
    const hardRunDays = sessions.filter((s) => s.runKind === 'long' || s.runKind === 'trail').map((s) => dayIndex(s.date));
    const trailDays = sessions.filter((s) => s.runKind === 'trail').map((s) => dayIndex(s.date));
    const qDays = sessions.filter((s) => s.runKind && ['interval', 'tempo', 'hill'].includes(s.runKind)).map((s) => dayIndex(s.date));
    const legRestricted = (d: DayIndex) =>
      hardRunDays.includes(((d + 1) % 7) as DayIndex) || // sehari sebelum long/trail
      trailDays.includes(((d + 6) % 7) as DayIndex) || // sehari setelah trail
      hardRunDays.includes(d);

    const strengthN = request.strengthSessions;
    if (strengthN > 0) {
      const runDaySet = new Set(sessions.map((s) => dayIndex(s.date)));
      // prioritas: hari tanpa lari & tanpa batasan kaki > hari lari mudah > hari lain
      const score = (d: DayIndex) => (runDaySet.has(d) ? 2 : 0) + (legRestricted(d) ? 1 : 0) + (qDays.includes(d) ? 3 : 0) + (hardRunDays.includes(d) ? 4 : 0);
      const candidates = [...free].sort((a, b) => score(a) - score(b) || a - b);
      const picked: DayIndex[] = [];
      // lintasan 1: hindari dua sesi kekuatan di hari berurutan; lintasan 2: isi sisanya
      for (const minGap of [2, 1]) {
        for (const d of candidates) {
          if (picked.length >= strengthN) break;
          if (picked.includes(d) || picked.some((p) => Math.abs(p - d) < minGap)) continue;
          picked.push(d);
        }
      }
      if (picked.length < strengthN) notes.push(`Hanya ${picked.length} sesi kekuatan yang muat minggu ini.`);
      const trailish = profile.goal === 'trail' || request.includeTrail || profile.trailEveryWeeks > 0;
      const order: StrengthTemplate[] = trailish ? ['trail', 'fullA', 'fullB'] : weekNumber % 2 ? ['fullA', 'fullB', 'fullA'] : ['fullB', 'fullA', 'fullB'];
      picked.sort((a, b) => a - b).forEach((d, i) => {
        let t = order[i % order.length];
        let why: string | undefined;
        if (legsBlocked) {
          t = 'upper';
          why = 'Nyeri kaki dilaporkan: sesi diganti tubuh atas.';
        } else if (legRestricted(d)) {
          t = 'upper';
          why = 'Diganti tubuh atas: tidak ada latihan kaki berat sehari sebelum/sesudah lari panjang atau trail.';
        } else if (runDaySet.has(d)) {
          why = 'Dilakukan setelah lari mudah di hari yang sama.';
        }
        const date = addDays(weekStart, d);
        const items = buildStrengthItems(t, {
          level: profile.level, bench: profile.hasBench, weights: availableWeights(profile.dumbbell), history: input.strengthHistory,
        });
        const dur = Math.min(estimateStrengthMinutes(items), Math.max(30, profile.maxSessionMinutes));
        sessions.push({
          id: `${date}-str`, date, kind: 'strength', strengthTemplate: t, title: TEMPLATE_TITLE[t], durationMin: dur,
          summary: `${items.length} gerakan · ${t === "upper" ? "tubuh atas" : t === "trail" ? "core + kaki satu sisi" : "seluruh tubuh"}`, items, key: t === 'trail', why, status: 'planned',
        });
      });
    }
  }

  sessions.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === 'run' ? -1 : 1));
  const totalRun = sessions.filter((s) => s.kind === 'run').reduce((acc, s) => acc + s.durationMin, 0);
  return { weekStart, cycleWeek, phase, weekNumber, baseMinutes: Math.round(base), runMinutes: totalRun, sessions, notes, request };
}

function buildRaceWeek(out: PlannedSession[], race: Race, weekStart: string, free: DayIndex[], profile: Profile, input: GenerateInput) {
  const raceDay = dayIndex(race.date);
  const push = (d: number, kind: RunKind, minutes: number, why: string) => {
    if (d < 0) return;
    const date = addDays(weekStart, d);
    const { steps, summary } = runSteps(kind, minutes, profile, 1, 3);
    out.push({ id: `${date}-run`, date, kind: 'run', runKind: kind, title: RUN_TITLE[kind], durationMin: minutes, summary, steps, key: kind === 'race', why, status: 'planned' });
  };
  // Pola minggu lomba (adaptasi dari kebiasaan Kilian Jornet, diperkecil untuk non-elite):
  // latihan normal ringan sampai H-4, istirahat penuh H-3, sesi singkat zona 2 di H-2, sangat santai di H-1.
  for (let d = 0; d <= raceDay - 4; d++) {
    if (!free.includes(d as DayIndex)) continue;
    push(d, 'easy', d === raceDay - 4 ? 30 : 40, d === raceDay - 4 ? 'Masih normal, tambahkan 4× 20 detik lebih cepat di akhir.' : 'Lari mudah menjaga kebugaran.');
  }
  push(raceDay - 2, 'easy', 30, 'H-2: sesi singkat zona 2.');
  push(raceDay - 1, 'shakeout', 20, 'H-1: sangat santai, cek perlengkapan dan rencana asupan.');
  const date = race.date;
  out.push({
    id: `${date}-race`, date, kind: 'run', runKind: 'race', title: race.name, durationMin: Math.round(race.targetSec / 60),
    summary: `Target ${formatDuration(race.targetSec)} · start ${race.startTime}`, steps: [], key: true,
    why: `${DAY_LONG[raceDay]}: jalankan pacing strategy dari tab Lomba.`, status: 'planned',
  });
  if (input.request.strengthSessions > 0 && raceDay >= 4 && free.includes(0)) {
    const items = buildStrengthItems('upper', {
      level: profile.level, bench: profile.hasBench, weights: availableWeights(profile.dumbbell), history: input.strengthHistory,
    }).map((it) => ({ ...it, sets: Math.max(1, it.sets - 1) }));
    const d = addDays(weekStart, 0);
    out.push({
      id: `${d}-str`, date: d, kind: 'strength', strengthTemplate: 'upper', title: 'Kekuatan ringan tubuh atas', durationMin: 25,
      summary: `${items.length} gerakan ringan`, items, key: false, why: 'Minggu lomba: hanya sesi ringan tubuh atas.', status: 'planned',
    });
  }
}
