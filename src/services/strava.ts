import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

import { toISO } from '@/core/dates';
import type { Activity } from '@/core/types';
import { defaultZoneBounds, zoneSeconds } from '@/core/zones';

WebBrowser.maybeCompleteAuthSession();

// Integrasi Strava untuk pemakaian pribadi: pengguna membuat aplikasi API sendiri di
// https://www.strava.com/settings/api lalu mengisi Client ID & Secret di aplikasi.
// Kredensial dan token disimpan di SecureStore (terenkripsi di perangkat).

const K = { id: 'strava_client_id', secret: 'strava_client_secret', token: 'strava_token' };
export const STRAVA_REDIRECT = 'pelatih://localhost';
const API = 'https://www.strava.com/api/v3';
const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://www.strava.com/oauth/authorize',
  tokenEndpoint: 'https://www.strava.com/oauth/token',
};

interface Token {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { firstname?: string; lastname?: string };
}

export async function getCredentials() {
  const [id, secret] = await Promise.all([SecureStore.getItemAsync(K.id), SecureStore.getItemAsync(K.secret)]);
  return id && secret ? { id, secret } : null;
}

export async function saveCredentials(id: string, secret: string) {
  await SecureStore.setItemAsync(K.id, id.trim());
  await SecureStore.setItemAsync(K.secret, secret.trim());
}

export async function isConnected(): Promise<boolean> {
  return !!(await SecureStore.getItemAsync(K.token));
}

export async function disconnect() {
  const t = await loadToken();
  if (t) {
    try {
      await fetch('https://www.strava.com/oauth/deauthorize', { method: 'POST', headers: { Authorization: `Bearer ${t.access_token}` } });
    } catch {
      // tetap hapus token lokal
    }
  }
  await SecureStore.deleteItemAsync(K.token);
}

async function loadToken(): Promise<Token | null> {
  const raw = await SecureStore.getItemAsync(K.token);
  return raw ? (JSON.parse(raw) as Token) : null;
}

async function tokenRequest(params: Record<string, string>): Promise<Token> {
  const creds = await getCredentials();
  if (!creds) throw new Error('Isi Client ID dan Client Secret Strava dulu.');
  const body = new URLSearchParams({ client_id: creds.id, client_secret: creds.secret, ...params }).toString();
  const res = await fetch(discovery.tokenEndpoint!, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!res.ok) throw new Error(`Strava menolak login (${res.status}). Cek Client ID, Secret, dan Authorization Callback Domain = localhost.`);
  const tok = (await res.json()) as Token;
  await SecureStore.setItemAsync(K.token, JSON.stringify({ access_token: tok.access_token, refresh_token: tok.refresh_token, expires_at: tok.expires_at, athlete: tok.athlete }));
  return tok;
}

/** Buka halaman login Strava dan simpan token. Mengembalikan nama atlet. */
export async function connect(): Promise<string> {
  const creds = await getCredentials();
  if (!creds) throw new Error('Isi Client ID dan Client Secret Strava dulu.');
  const req = new AuthSession.AuthRequest({
    clientId: creds.id,
    redirectUri: STRAVA_REDIRECT,
    // Strava memakai koma sebagai pemisah scope
    scopes: ['read,activity:read_all'],
    usePKCE: false,
    responseType: AuthSession.ResponseType.Code,
    extraParams: { approval_prompt: 'auto' },
  });
  const result = await req.promptAsync(discovery);
  if (result.type !== 'success' || !result.params.code) throw new Error('Login Strava dibatalkan.');
  const tok = await tokenRequest({ code: result.params.code, grant_type: 'authorization_code' });
  return [tok.athlete?.firstname, tok.athlete?.lastname].filter(Boolean).join(' ') || 'Atlet Strava';
}

async function accessToken(): Promise<string> {
  let t = await loadToken();
  if (!t) throw new Error('Strava belum terhubung.');
  if (t.expires_at * 1000 < Date.now() + 60_000) t = await tokenRequest({ refresh_token: t.refresh_token, grant_type: 'refresh_token' });
  return t.access_token;
}

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${await accessToken()}` } });
  if (res.status === 429) throw new Error('Batas permintaan Strava tercapai, coba lagi 15 menit lagi.');
  if (!res.ok) throw new Error(`Gagal mengambil data Strava (${res.status}).`);
  return (await res.json()) as T;
}

interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  type: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_heartrate?: number;
  max_heartrate?: number;
  has_heartrate: boolean;
}

interface Streams {
  time?: { data: number[] };
  heartrate?: { data: number[] };
  distance?: { data: number[] };
  grade_smooth?: { data: number[] };
  velocity_smooth?: { data: number[] };
}

/** Batas zona HR dari Strava (bila diatur di profil Strava), selain itu dari HR maksimal. */
async function zoneBounds(maxHr?: number): Promise<number[] | null> {
  try {
    const z = await api<{ heart_rate?: { custom_zones: boolean; zones: { min: number; max: number }[] } }>('/athlete/zones');
    const zones = z.heart_rate?.zones;
    if (zones && zones.length === 5) return zones.slice(1).map((x) => x.min);
  } catch {
    // scope atau akun tanpa zona
  }
  return maxHr ? defaultZoneBounds(maxHr) : null;
}

function kindOf(a: StravaActivity): Activity['type'] {
  const t = a.sport_type || a.type;
  if (t === 'TrailRun') return 'trail';
  if (t === 'Run' || t === 'VirtualRun') return 'run';
  return 'other';
}

/** Sampel (gradien, pace detik/km) per ~100 m untuk kurva pribadi. */
function gradePaceSamples(s: Streams): [number, number][] {
  const d = s.distance?.data;
  const g = s.grade_smooth?.data;
  const v = s.velocity_smooth?.data;
  if (!d || !g || !v) return [];
  const out: [number, number][] = [];
  let next = 100;
  for (let i = 0; i < d.length; i++) {
    if (d[i] < next) continue;
    next = d[i] + 100;
    if (v[i] > 0.5) out.push([Math.round((g[i] / 100) * 1000) / 1000, Math.round(1000 / v[i])]);
  }
  return out;
}

/** Ambil aktivitas lari sejak tanggal tertentu, lengkap dengan zona HR dan sampel gradien. */
export async function fetchActivities(afterEpochSec: number, maxHr: number | undefined, knownIds: Set<string>): Promise<Activity[]> {
  const list: StravaActivity[] = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await api<StravaActivity[]>(`/athlete/activities?after=${Math.floor(afterEpochSec)}&per_page=50&page=${page}`);
    list.push(...batch);
    if (batch.length < 50) break;
  }
  const bounds = await zoneBounds(maxHr);
  const out: Activity[] = [];
  for (const a of list) {
    const type = kindOf(a);
    const id = `strava:${a.id}`;
    if (type === 'other' || knownIds.has(id)) continue;
    const act: Activity = {
      id,
      source: 'strava',
      name: a.name,
      date: a.start_date_local.slice(0, 10),
      startTime: a.start_date_local.slice(11, 16),
      type,
      distanceKm: Math.round(a.distance) / 1000,
      movingSec: a.moving_time,
      elapsedSec: a.elapsed_time,
      elevGainM: Math.round(a.total_elevation_gain),
      avgHr: a.average_heartrate,
      maxHr: a.max_heartrate,
    };
    try {
      const keys = ['time', 'heartrate', 'distance', 'grade_smooth', 'velocity_smooth'].join(',');
      const s = await api<Streams>(`/activities/${a.id}/streams?keys=${keys}&key_by_type=true`);
      if (bounds && s.heartrate?.data && s.time?.data) act.zoneSec = zoneSeconds(s.heartrate.data, s.time.data, bounds);
      if (type === 'trail' || a.total_elevation_gain > 100) act.gradePace = gradePaceSamples(s);
    } catch {
      // aktivitas tetap disimpan tanpa stream
    }
    out.push(act);
  }
  return out;
}

export function defaultSyncFrom(): number {
  const d = new Date();
  d.setDate(d.getDate() - 56);
  return Math.floor(d.getTime() / 1000);
}

export const todayISO = () => toISO(new Date());
