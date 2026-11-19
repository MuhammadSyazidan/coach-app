import * as Calendar from 'expo-calendar';

import { addDays, dayIndex, fromISO, toISO } from '@/core/dates';
import type { DayIndex, PlannedSession, Race, WeekPlan } from '@/core/types';

// Integrasi Google Calendar lewat Calendar Provider Android: kalender akun Google di ponsel
// sudah tersinkron ke Google, jadi tidak perlu proyek Google Cloud atau OAuth terpisah.
// Saran: buat kalender bernama "Latihan" di Google Calendar; aplikasi memilihnya otomatis.

export interface CalendarChoice {
  id: string;
  title: string;
  account: string;
}

export async function ensurePermission(): Promise<boolean> {
  const res = await Calendar.requestCalendarPermissions();
  return res.granted;
}

export async function writableCalendars(): Promise<CalendarChoice[]> {
  const cals = await Calendar.getCalendars();
  return cals
    .filter((c) => c.allowsModifications && c.accessLevel !== 'read')
    .map((c) => ({ id: c.id, title: c.title, account: c.source?.name ?? c.ownerAccount ?? '' }))
    .sort((a, b) => Number(b.title.toLowerCase() === 'latihan') - Number(a.title.toLowerCase() === 'latihan'));
}

export async function suggestCalendar(): Promise<CalendarChoice | null> {
  const cals = await Calendar.getCalendars();
  const writable = cals.filter((c) => c.allowsModifications);
  const pick =
    writable.find((c) => c.title.toLowerCase() === 'latihan') ??
    writable.find((c) => c.isPrimary && (c.source?.type ?? '').includes('google')) ??
    writable.find((c) => (c.source?.type ?? '').includes('google')) ??
    writable[0];
  return pick ? { id: pick.id, title: pick.title, account: pick.source?.name ?? '' } : null;
}

const START_HOUR = { pagi: 5, sore: 16 } as const;
const START_MIN = { pagi: 30, sore: 30 } as const;
const TAG = '[Pelatih]';

function eventTimes(s: PlannedSession, time: 'pagi' | 'sore') {
  const start = fromISO(s.date);
  start.setHours(START_HOUR[time], START_MIN[time], 0, 0);
  const end = new Date(start.getTime() + Math.max(20, s.durationMin) * 60000);
  return { start, end };
}

function describe(s: PlannedSession): string {
  const lines = [s.summary];
  if (s.steps?.length) lines.push(...s.steps.map((st) => `• ${st.repeat ? `${st.repeat}× ` : ''}${st.label} (${st.minutes}')`));
  if (s.why) lines.push('', s.why);
  lines.push('', `${TAG} jangan ubah baris ini`);
  return lines.join('\n');
}

/** Tulis/ubah acara untuk setiap sesi minggu ini; hapus acara sesi yang sudah tidak ada. Mengembalikan sesi dengan calendarEventId. */
export async function syncWeek(plan: WeekPlan, calendarId: string, time: 'pagi' | 'sore', previous?: WeekPlan): Promise<PlannedSession[]> {
  const cal = await Calendar.ExpoCalendar.get(calendarId);
  const keep = new Set(plan.sessions.map((s) => s.id));
  for (const old of previous?.sessions ?? []) {
    if (old.calendarEventId && !keep.has(old.id)) {
      try {
        await (await Calendar.ExpoCalendarEvent.get(old.calendarEventId)).delete();
      } catch {
        // sudah dihapus pengguna
      }
    }
  }
  const out: PlannedSession[] = [];
  for (const s of plan.sessions) {
    const { start, end } = eventTimes(s, time);
    const details = { title: `${s.kind === 'run' ? 'Lari' : 'Kekuatan'}: ${s.title}`, startDate: start, endDate: end, notes: describe(s), alarms: [{ relativeOffset: -30 }] };
    let eventId = s.calendarEventId ?? previous?.sessions.find((p) => p.id === s.id)?.calendarEventId;
    if (eventId) {
      try {
        const ev = await Calendar.ExpoCalendarEvent.get(eventId);
        await ev.update(details);
      } catch {
        eventId = undefined;
      }
    }
    if (!eventId) eventId = (await cal.createEvent(details)).id;
    out.push({ ...s, calendarEventId: eventId });
  }
  return out;
}

/** Sesi yang acaranya dipindah pengguna di Google Calendar: kembalikan tanggal barunya. */
export async function detectMoves(plan: WeekPlan): Promise<{ sessionId: string; newDate: string }[]> {
  const moves: { sessionId: string; newDate: string }[] = [];
  for (const s of plan.sessions) {
    if (!s.calendarEventId || s.status !== 'planned') continue;
    try {
      const ev = await Calendar.ExpoCalendarEvent.get(s.calendarEventId);
      const d = toISO(new Date(ev.startDate));
      if (d !== s.date) moves.push({ sessionId: s.id, newDate: d });
    } catch {
      // acara dihapus: biarkan sesi tetap ada di aplikasi
    }
  }
  return moves;
}

/**
 * Hari yang padat di kalender lain pada jam latihan (pagi 05:00-08:00 atau sore 16:00-20:00).
 * Isi acara tidak disimpan, hanya dipakai untuk saran hari sibuk.
 */
export async function busyDays(weekStart: string, ourCalendarId: string | undefined, time: 'pagi' | 'sore'): Promise<DayIndex[]> {
  const cals = (await Calendar.getCalendars()).filter((c) => c.id !== ourCalendarId && c.isVisible !== false);
  const from = fromISO(weekStart);
  const to = fromISO(addDays(weekStart, 7));
  const events = await Calendar.listEvents(cals.map((c) => c.id), from, to);
  const [h0, h1] = time === 'pagi' ? [5, 8] : [16, 20];
  const busy = new Map<DayIndex, number>();
  for (const e of events) {
    if (e.allDay || (e.notes ?? '').includes(TAG)) continue;
    const s = new Date(e.startDate);
    const en = new Date(e.endDate);
    const winStart = new Date(s);
    winStart.setHours(h0, 0, 0, 0);
    const winEnd = new Date(s);
    winEnd.setHours(h1, 0, 0, 0);
    const overlap = Math.min(en.getTime(), winEnd.getTime()) - Math.max(s.getTime(), winStart.getTime());
    if (overlap > 0) {
      const d = dayIndex(toISO(s));
      busy.set(d, (busy.get(d) ?? 0) + overlap / 60000);
    }
  }
  return [...busy.entries()].filter(([, m]) => m >= 60).map(([d]) => d);
}

export async function upsertRaceEvent(race: Race, calendarId: string): Promise<string> {
  const [h, m] = race.startTime.split(':').map(Number);
  const start = fromISO(race.date);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + race.targetSec * 1000);
  const details = { title: `Lomba: ${race.name}`, startDate: start, endDate: end, notes: `${race.distanceKm} km · target ${Math.round(race.targetSec / 60)} menit\n${TAG}` };
  if (race.calendarEventId) {
    try {
      await (await Calendar.ExpoCalendarEvent.get(race.calendarEventId)).update(details);
      return race.calendarEventId;
    } catch {
      // buat ulang
    }
  }
  const cal = await Calendar.ExpoCalendar.get(calendarId);
  return (await cal.createEvent(details)).id;
}
