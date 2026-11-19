import type { DayIndex, ISODate } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** 0 = Senin ... 6 = Minggu */
export function dayIndex(s: ISODate): DayIndex {
  return ((fromISO(s).getDay() + 6) % 7) as DayIndex;
}

export function weekStartOf(s: ISODate): ISODate {
  return addDays(s, -dayIndex(s));
}

export function today(): ISODate {
  return toISO(new Date());
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000);
}

export const DAY_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const;
export const DAY_LONG = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function formatDate(s: ISODate): string {
  const d = fromISO(s);
  return `${DAY_LONG[dayIndex(s)]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatShort(s: ISODate): string {
  const d = fromISO(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** 3725 -> "1:02:05"; 605 -> "10:05" */
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

/** 70 -> "1 jam 10 menit"; 40 -> "40 menit" */
export function formatMinutes(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} menit`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} jam ${r} menit` : `${h} jam`;
}

/** Pace detik/km -> "5:42" */
export function formatPace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '-';
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

/** "1:45:00" / "45:00" / "105" (menit) -> detik */
export function parseDuration(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const parts = t.split(':').map((p) => Number(p));
  if (parts.some((p) => !isFinite(p) || p < 0)) return null;
  if (parts.length === 1) return parts[0] * 60;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

/** "06:30" + detik -> "08:12" (jam dinding) */
export function clockAdd(startHHMM: string, sec: number): string {
  const [h, m] = startHHMM.split(':').map(Number);
  const total = (h * 3600 + m * 60 + Math.round(sec)) % 86400;
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}`;
}

export function clockToSec(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 3600 + m * 60;
}

export function uid(prefix = ''): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
