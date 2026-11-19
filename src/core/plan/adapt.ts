import type { Activity, Checkin, WeekPlan } from '../types';

export interface Adaptation {
  /** Pengali level beban lari untuk minggu berikutnya. */
  growth: number;
  forceRecovery: boolean;
  /** Area nyeri yang dilaporkan: gerakan kaki berat diganti jika menyangkut kaki. */
  painAreas: string[];
  /** Trail yang tidak direncanakan minggu ini (tanggal). */
  unplannedTrail: string[];
  reasons: string[];
}

const LEG_AREAS = ['lutut', 'pergelangan kaki', 'betis', 'tulang kering', 'telapak kaki', 'paha', 'pinggul', 'achilles'];

export function isLegArea(area: string): boolean {
  return LEG_AREAS.some((a) => area.toLowerCase().includes(a));
}

/**
 * Aturan adaptasi mingguan (bagian 5 brief).
 * Batas kenaikan 10% per minggu adalah panduan umum (ACSM/praktik kepelatihan lari),
 * bukan batas mutlak; di sini dipakai sebagai batas atas yang konservatif.
 */
export function computeAdaptation(prev: WeekPlan | null, checkins: Checkin[], activities: Activity[]): Adaptation {
  const res: Adaptation = { growth: 1, forceRecovery: false, painAreas: [], unplannedTrail: [], reasons: [] };
  if (!prev) return res;

  const sessions = prev.sessions.filter((s) => s.runKind !== 'race');
  const done = sessions.filter((s) => s.status === 'done').length;
  const missed = sessions.filter((s) => s.status !== 'done').length;
  const completion = sessions.length ? done / sessions.length : 1;

  const weekEnd = prev.sessions.length ? prev.sessions.map((s) => s.date).sort().at(-1)! : prev.weekStart;
  const inWeek = (d: string) => d >= prev.weekStart && d <= weekEnd;
  const after = checkins.filter((c) => inWeek(c.date) && c.moment === 'setelah').sort((a, b) => a.date.localeCompare(b.date));
  const rpes = after.map((c) => c.rpe).filter((x): x is number => typeof x === 'number');
  const avgRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;

  let badStreak = 0;
  let maxBadStreak = 0;
  for (const c of after) {
    if ((c.feeling ?? 3) <= 2) {
      badStreak++;
      maxBadStreak = Math.max(maxBadStreak, badStreak);
    } else badStreak = 0;
  }
  const soreHigh = checkins.filter((c) => inWeek(c.date) && c.moment === 'esok' && (c.soreness ?? 1) >= 4).length;
  const sleeps = checkins.filter((c) => inWeek(c.date) && typeof c.sleep === 'number').map((c) => c.sleep!);
  const sleepLow = sleeps.length >= 2 && sleeps.reduce((a, b) => a + b, 0) / sleeps.length <= 2;
  const sick = checkins.some((c) => inWeek(c.date) && c.flags.includes('sakit'));

  res.painAreas = [...new Set(checkins.filter((c) => inWeek(c.date) && c.pain).flatMap((c) => c.painAreas))];

  const plannedTrail = new Set(prev.sessions.filter((s) => s.runKind === 'trail').map((s) => s.date));
  res.unplannedTrail = activities.filter((a) => a.type === 'trail' && inWeek(a.date) && !plannedTrail.has(a.date)).map((a) => a.date);

  if (sick) {
    res.growth = 0.8;
    res.reasons.push('Kamu menandai sakit minggu ini: volume minggu depan diturunkan 20%.');
  } else if (maxBadStreak >= 2 || (avgRpe !== null && avgRpe >= 8 && (soreHigh >= 2 || sleepLow))) {
    res.forceRecovery = true;
    res.reasons.push(
      maxBadStreak >= 2
        ? 'Dua sesi berturut-turut terasa buruk: minggu depan dijadikan minggu pemulihan.'
        : 'Usaha terasa sangat berat dan pemulihan kurang (pegal atau tidur buruk): minggu pemulihan lebih awal.',
    );
  } else if (missed >= 2) {
    res.growth = 0.9;
    res.reasons.push(`${missed} sesi terlewat: beban minggu depan sedikit diturunkan, tanpa menambah sesi pengganti.`);
  } else if (completion >= 0.99 && (avgRpe === null || avgRpe <= 6.5)) {
    res.growth = 1.08;
    res.reasons.push('Semua sesi selesai dan terasa terkendali: volume lari naik sekitar 8%.');
  } else if (completion >= 0.75) {
    res.growth = 1.05;
    res.reasons.push('Sebagian besar sesi selesai: volume lari naik sekitar 5%.');
  } else {
    res.reasons.push('Beban minggu depan dipertahankan.');
  }

  if (res.painAreas.length) {
    res.growth = Math.min(res.growth, 0.9);
    res.reasons.push(
      `Nyeri dilaporkan (${res.painAreas.join(', ')}): beban diturunkan` +
        (res.painAreas.some(isLegArea) ? ' dan latihan kaki berat diganti tubuh atas.' : '.') +
        ' Jika nyeri tajam atau tidak membaik, konsultasikan ke tenaga kesehatan.',
    );
  }
  if (res.unplannedTrail.length) {
    res.reasons.push('Ada trail run di luar rencana minggu ini: sudah dihitung ke beban latihan.');
  }
  res.growth = Math.min(res.growth, 1.1);
  return res;
}
