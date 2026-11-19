import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { addDays, today, weekStartOf } from '@/core/dates';
import { computeAdaptation } from '@/core/plan/adapt';
import { generateWeek } from '@/core/plan/generator';
import type { Activity, Checkin, PlannedSession, Profile, Race, SetLog, WeekPlan, WeekRequest } from '@/core/types';
import * as calendar from '@/services/calendar';
import * as notify from '@/services/notify';
import * as strava from '@/services/strava';
import type { ThemeMode } from '@/ui/theme';

import * as db from './db';

export interface Settings {
  themeMode?: ThemeMode;
  watchName?: string;
  calendarId?: string;
  calendarTitle?: string;
  calendarEnabled: boolean;
  notificationsEnabled: boolean;
  lastStravaSync?: number;
  stravaAthlete?: string;
}

const DEFAULT_SETTINGS: Settings = { calendarEnabled: false, notificationsEnabled: false };

interface State {
  ready: boolean;
  profile: Profile | null;
  weeks: Record<string, WeekPlan>;
  checkins: Checkin[];
  setLogs: SetLog[];
  activities: Activity[];
  races: Race[];
  settings: Settings;
}

interface Actions {
  saveProfile(p: Profile): void;
  planWeek(req: WeekRequest): Promise<WeekPlan>;
  updateSession(id: string, patch: Partial<PlannedSession>): void;
  moveSession(id: string, newDate: string): void;
  addCheckin(c: Checkin): void;
  addSetLogs(logs: SetLog[]): void;
  saveRace(r: Race): Promise<void>;
  deleteRace(id: string): void;
  saveSettings(s: Partial<Settings>): void;
  syncStrava(): Promise<{ added: number }>;
  syncCalendar(): Promise<void>;
  linkActivity(activityId: string, patch: Partial<Activity>): void;
  resetAll(): void;
}

type Store = State & Actions & {
  currentWeek: WeekPlan | null;
  sessionById(id: string): { week: WeekPlan; session: PlannedSession } | null;
  strengthHistory(exerciseId: string): SetLog[][];
};

const Ctx = createContext<Store | null>(null);

function loadState(): State {
  const profile = db.get<Profile>('profile', 'me');
  const weeks = Object.fromEntries(db.list<WeekPlan>('week').map((w) => [w.weekStart, w]));
  return {
    ready: true,
    profile,
    weeks,
    checkins: db.list<Checkin>('checkin'),
    setLogs: db.list<SetLog>('setlog'),
    activities: db.list<Activity>('activity'),
    races: db.list<Race>('race'),
    settings: { ...DEFAULT_SETTINGS, ...(db.get<Settings>('settings', 'app') ?? {}) },
  };
}

const EMPTY: State = { ready: false, profile: null, weeks: {}, checkins: [], setLogs: [], activities: [], races: [], settings: DEFAULT_SETTINGS };

/** Tandai sesi selesai bila ada aktivitas lari pada tanggal yang sama. */
function matchActivities(weeks: Record<string, WeekPlan>, acts: Activity[]): { weeks: Record<string, WeekPlan>; acts: Activity[] } {
  const out = { ...weeks };
  const linked: Activity[] = [];
  for (const a of acts) {
    if (a.sessionId) {
      linked.push(a);
      continue;
    }
    const w = out[weekStartOf(a.date)];
    const s = w?.sessions.find((x) => x.kind === 'run' && x.date === a.date && x.status === 'planned');
    if (w && s) {
      out[w.weekStart] = { ...w, sessions: w.sessions.map((x) => (x.id === s.id ? { ...x, status: 'done', activityId: a.id, completedAt: a.startTime } : x)) };
      linked.push({ ...a, sessionId: s.id });
    } else linked.push(a);
  }
  return { weeks: out, acts: linked };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(() => {
    try {
      return loadState();
    } catch {
      return { ...EMPTY, ready: true };
    }
  });

  const persistWeek = (w: WeekPlan) => db.put('week', w.weekStart, w);

  const strengthHistory = useCallback(
    (exerciseId: string) => {
      const bySession = new Map<string, SetLog[]>();
      for (const l of state.setLogs) {
        if (l.exerciseId !== exerciseId) continue;
        if (!bySession.has(l.sessionId)) bySession.set(l.sessionId, []);
        bySession.get(l.sessionId)!.push(l);
      }
      return [...bySession.values()].sort((a, b) => a[0].date.localeCompare(b[0].date)).slice(-4);
    },
    [state.setLogs],
  );

  const sessionById = useCallback(
    (id: string) => {
      for (const w of Object.values(state.weeks)) {
        const s = w.sessions.find((x) => x.id === id);
        if (s) return { week: w, session: s };
      }
      return null;
    },
    [state.weeks],
  );

  const updateSession = useCallback((id: string, patch: Partial<PlannedSession>) => {
    setState((st) => {
      const weeks = { ...st.weeks };
      for (const w of Object.values(weeks)) {
        if (w.sessions.some((s) => s.id === id)) {
          const nw = { ...w, sessions: w.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
          weeks[w.weekStart] = nw;
          persistWeek(nw);
        }
      }
      return { ...st, weeks };
    });
  }, []);

  const moveSession = useCallback((id: string, newDate: string) => {
    setState((st) => {
      const weeks = { ...st.weeks };
      for (const w of Object.values(weeks)) {
        if (w.sessions.some((s) => s.id === id)) {
          const nw = {
            ...w,
            sessions: w.sessions
              .map((s) => (s.id === id ? { ...s, date: newDate, why: 'Dipindah oleh kamu.' } : s))
              .sort((a, b) => a.date.localeCompare(b.date)),
          };
          weeks[w.weekStart] = nw;
          persistWeek(nw);
        }
      }
      return { ...st, weeks };
    });
  }, []);

  const saveSettings = useCallback((s: Partial<Settings>) => {
    setState((st) => {
      const settings = { ...st.settings, ...s };
      db.put('settings', 'app', settings);
      return { ...st, settings };
    });
  }, []);

  const planWeek = useCallback(
    async (req: WeekRequest) => {
      if (!state.profile) throw new Error('Profil belum diisi.');
      const prevStart = addDays(req.weekStart, -7);
      const prev = state.weeks[prevStart] ?? null;
      const existing = state.weeks[req.weekStart];
      const adaptation = computeAdaptation(prev, state.checkins, state.activities);
      let plan = generateWeek({ profile: state.profile, request: req, prev, adaptation, races: state.races, strengthHistory });
      // pertahankan status sesi yang sudah selesai jika minggu yang sama disusun ulang
      if (existing) {
        plan = {
          ...plan,
          weekNumber: existing.weekNumber,
          sessions: plan.sessions.map((s) => {
            const old = existing.sessions.find((o) => o.id === s.id);
            return old && old.status !== 'planned' ? { ...s, status: old.status, activityId: old.activityId, completedAt: old.completedAt } : s;
          }),
        };
      }
      if (state.settings.calendarEnabled && state.settings.calendarId && Platform.OS !== 'web') {
        try {
          plan = { ...plan, sessions: await calendar.syncWeek(plan, state.settings.calendarId, state.profile.trainingTime, existing) };
        } catch (e) {
          plan = { ...plan, notes: [...plan.notes, `Kalender gagal diperbarui: ${(e as Error).message}`] };
        }
      }
      persistWeek(plan);
      setState((st) => ({ ...st, weeks: { ...st.weeks, [plan.weekStart]: plan } }));
      if (state.settings.notificationsEnabled) notify.rescheduleAll(plan, state.profile.trainingTime).catch(() => {});
      return plan;
    },
    [state.profile, state.weeks, state.checkins, state.activities, state.races, state.settings, strengthHistory],
  );

  const syncStrava = useCallback(async () => {
    const known = new Set(state.activities.map((a) => a.id));
    const after = state.settings.lastStravaSync ? state.settings.lastStravaSync - 2 * 86400 : strava.defaultSyncFrom();
    const fresh = await strava.fetchActivities(after, state.profile?.maxHr, known);
    setState((st) => {
      const { weeks, acts } = matchActivities(st.weeks, fresh);
      for (const a of acts) db.put('activity', a.id, a);
      for (const w of Object.values(weeks)) if (w !== st.weeks[w.weekStart]) persistWeek(w);
      const settings = { ...st.settings, lastStravaSync: Math.floor(Date.now() / 1000) };
      db.put('settings', 'app', settings);
      return { ...st, weeks, activities: [...st.activities, ...acts].sort((a, b) => a.date.localeCompare(b.date)), settings };
    });
    return { added: fresh.length };
  }, [state.activities, state.settings.lastStravaSync, state.profile?.maxHr]);

  const syncCalendar = useCallback(async () => {
    const wk = state.weeks[weekStartOf(today())];
    if (!wk || !state.settings.calendarEnabled) return;
    const moves = await calendar.detectMoves(wk);
    for (const m of moves) moveSession(m.sessionId, m.newDate);
  }, [state.weeks, state.settings.calendarEnabled, moveSession]);

  const store: Store = useMemo(
    () => ({
      ...state,
      currentWeek: state.weeks[weekStartOf(today())] ?? null,
      sessionById,
      strengthHistory,
      saveProfile(p) {
        db.put('profile', 'me', p);
        setState((st) => ({ ...st, profile: p }));
      },
      planWeek,
      updateSession,
      moveSession,
      addCheckin(c) {
        db.put('checkin', c.id, c);
        setState((st) => ({
          ...st,
          checkins: [...st.checkins.filter((x) => x.id !== c.id), c],
          activities: c.activityId ? st.activities.map((a) => (a.id === c.activityId ? { ...a, checkinDone: true } : a)) : st.activities,
        }));
        if (c.activityId) {
          const a = state.activities.find((x) => x.id === c.activityId);
          if (a) db.put('activity', a.id, { ...a, checkinDone: true });
        }
      },
      addSetLogs(logs) {
        for (const l of logs) db.put('setlog', l.id, l);
        setState((st) => ({ ...st, setLogs: [...st.setLogs.filter((x) => !logs.some((l) => l.id === x.id)), ...logs] }));
      },
      async saveRace(r) {
        let race = r;
        if (state.settings.calendarEnabled && state.settings.calendarId && Platform.OS !== 'web') {
          try {
            race = { ...r, calendarEventId: await calendar.upsertRaceEvent(r, state.settings.calendarId) };
          } catch {
            // kalender opsional
          }
        }
        db.put('race', race.id, race);
        setState((st) => ({ ...st, races: [...st.races.filter((x) => x.id !== race.id), race].sort((a, b) => a.date.localeCompare(b.date)) }));
      },
      deleteRace(id) {
        db.remove('race', id);
        setState((st) => ({ ...st, races: st.races.filter((x) => x.id !== id) }));
      },
      saveSettings,
      syncStrava,
      syncCalendar,
      linkActivity(activityId, patch) {
        setState((st) => {
          const activities = st.activities.map((a) => (a.id === activityId ? { ...a, ...patch } : a));
          const a = activities.find((x) => x.id === activityId);
          if (a) db.put('activity', a.id, a);
          return { ...st, activities };
        });
      },
      resetAll() {
        db.wipeAll();
        setState({ ...EMPTY, ready: true });
      },
    }),
    [state, sessionById, strengthHistory, planWeek, updateSession, moveSession, saveSettings, syncStrava, syncCalendar],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore di luar StoreProvider');
  return s;
}

/** Permintaan minggu default dari profil (dipakai saat pertama kali atau bila pertanyaan mingguan tidak dijawab). */
export function defaultRequest(profile: Profile, weekStart: string, prev?: WeekPlan | null): WeekRequest {
  const base = prev?.request;
  const weekNumber = (prev?.weekNumber ?? 0) + 1;
  const trailDue = profile.trailEveryWeeks > 0 && weekNumber % profile.trailEveryWeeks === 0;
  return {
    weekStart,
    runSessions: base?.runSessions ?? profile.defaultRunSessions,
    strengthSessions: base?.strengthSessions ?? profile.defaultStrengthSessions,
    availableDays: base?.availableDays ?? profile.preferredDays,
    busyDays: [],
    includeTrail: trailDue,
    confirmed: false,
  };
}
