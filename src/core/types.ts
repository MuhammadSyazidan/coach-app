// Tipe data inti aplikasi. Semua modul di src/core murni TypeScript (tanpa React Native)
// sehingga bisa diuji dengan Jest.

/** Tanggal lokal dalam format YYYY-MM-DD. */
export type ISODate = string;

/** 0 = Senin ... 6 = Minggu */
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Level = 'pemula' | 'menengah' | 'lanjut';

export type GoalType = '5k' | '10k' | 'half' | 'marathon' | 'trail' | 'kekuatan' | 'umum';

export interface DumbbellSetup {
  adjustable: boolean;
  /** Untuk dumbbell tetap: daftar berat yang dimiliki (kg per dumbbell). */
  weightsKg: number[];
  /** Untuk adjustable: berat minimum, maksimum, dan langkah kenaikan (kg per dumbbell). */
  minKg: number;
  maxKg: number;
  stepKg: number;
}

export interface Profile {
  name: string;
  birthYear?: number;
  weightKg?: number;
  level: Level;
  goal: GoalType;
  goalNote: string;
  /** Lari terpanjang tanpa berhenti dalam 4 minggu terakhir (menit). */
  longestRecentRunMin: number;
  /** Total menit lari per minggu saat ini. */
  weeklyRunMinutes: number;
  maxHr?: number;
  restHr?: number;
  dumbbell: DumbbellSetup;
  hasBench: boolean;
  injuries: string;
  /** Jawaban skrining kesiapan (PAR-Q+ singkat). true = ada jawaban "ya". */
  parqFlag: boolean;
  defaultRunSessions: number;
  defaultStrengthSessions: number;
  preferredDays: DayIndex[];
  maxSessionMinutes: number;
  /** Trail run setiap N minggu (0 = tidak rutin). */
  trailEveryWeeks: number;
  trainingTime: 'pagi' | 'sore';
  createdAt: ISODate;
}

export type RunKind = 'easy' | 'long' | 'trail' | 'interval' | 'tempo' | 'hill' | 'runwalk' | 'race' | 'shakeout';
export type StrengthTemplate = 'fullA' | 'fullB' | 'trail' | 'upper';

export interface RunStep {
  label: string;
  minutes: number;
  zone: 1 | 2 | 3 | 4 | 5;
  repeat?: number;
}

export interface StrengthItem {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  /** Beban saran per dumbbell (kg). 0 = berat badan. */
  loadKg: number;
  restSec: number;
  note?: string;
}

export interface PlannedSession {
  id: string;
  date: ISODate;
  kind: 'run' | 'strength';
  runKind?: RunKind;
  strengthTemplate?: StrengthTemplate;
  title: string;
  durationMin: number;
  /** Ringkasan satu baris yang ditampilkan di kartu. */
  summary: string;
  steps?: RunStep[];
  items?: StrengthItem[];
  key: boolean;
  /** Alasan penempatan atau perubahan, ditampilkan ke pengguna. */
  why?: string;
  status: 'planned' | 'done' | 'skipped';
  completedAt?: string;
  activityId?: string;
  calendarEventId?: string;
}

export interface WeekRequest {
  weekStart: ISODate;
  runSessions: number;
  strengthSessions: number;
  availableDays: DayIndex[];
  busyDays: DayIndex[];
  includeTrail: boolean;
  confirmed: boolean;
}

export interface WeekPlan {
  weekStart: ISODate;
  /** Nomor minggu dalam siklus 4 minggu (1-4). Minggu ke-4 = pemulihan. */
  cycleWeek: number;
  phase: 'dasar' | 'pembangunan' | 'pemulihan' | 'spesifik' | 'taper' | 'lomba';
  /** Minggu ke-n sejak mulai memakai aplikasi. */
  weekNumber: number;
  /** Level beban lari "dasar" sebelum dikurangi untuk pemulihan/taper (menit). */
  baseMinutes: number;
  runMinutes: number;
  sessions: PlannedSession[];
  notes: string[];
  request: WeekRequest;
}

export type CheckinMoment = 'sebelum' | 'setelah' | 'esok' | 'set';

export interface Checkin {
  id: string;
  sessionId?: string;
  activityId?: string;
  date: ISODate;
  moment: CheckinMoment;
  rpe?: number; // 1-10
  feeling?: number; // 1 (sangat buruk) - 5 (sangat baik)
  energy?: number; // 1-5
  sleep?: number; // 1-5
  soreness?: number; // 1 (tidak pegal) - 5 (sangat pegal)
  pain: boolean;
  painAreas: string[];
  hardPart?: 'awal' | 'tengah' | 'akhir' | 'tanjakan' | 'turunan' | 'merata';
  flags: ('sakit' | 'bepergian' | 'obat')[];
  note: string;
}

export interface SetLog {
  id: string;
  sessionId: string;
  date: ISODate;
  exerciseId: string;
  setIndex: number;
  reps: number;
  loadKg: number;
  rpe?: number;
  pain?: boolean;
}

export interface Activity {
  id: string; // "strava:<id>"
  source: 'strava' | 'manual';
  name: string;
  date: ISODate;
  startTime: string;
  type: 'run' | 'trail' | 'other';
  distanceKm: number;
  movingSec: number;
  elapsedSec: number;
  elevGainM: number;
  avgHr?: number;
  maxHr?: number;
  /** Detik di zona 1..5. */
  zoneSec?: number[];
  /** Sampel (gradien, pace detik/km) untuk kurva pribadi. */
  gradePace?: [number, number][];
  sessionId?: string;
  checkinDone?: boolean;
}

export interface AidStation {
  name: string;
  km: number;
  stopSec: number;
  cutoff?: string; // "HH:MM" jam dinding
}

export interface Race {
  id: string;
  name: string;
  date: ISODate;
  startTime: string; // "HH:MM"
  kind: 'road' | 'trail';
  distanceKm: number;
  elevGainM: number;
  targetSec: number;
  tempC: number;
  humidity: number;
  strategy: 'rata' | 'negatif';
  aid: AidStation[];
  /** Isi GPX asli (disimpan sebagai teks). */
  gpx?: string;
  calendarEventId?: string;
  resultActivityId?: string;
}
