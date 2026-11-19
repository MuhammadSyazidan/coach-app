import type { Profile, WeekRequest } from '../types';

export const profile = (over: Partial<Profile> = {}): Profile => ({
  name: 'Uji',
  level: 'menengah',
  goal: '10k',
  goalNote: '',
  longestRecentRunMin: 60,
  weeklyRunMinutes: 180,
  maxHr: 190,
  dumbbell: { adjustable: true, weightsKg: [], minKg: 2, maxKg: 20, stepKg: 2 },
  hasBench: false,
  injuries: '',
  parqFlag: false,
  defaultRunSessions: 4,
  defaultStrengthSessions: 2,
  preferredDays: [0, 1, 2, 3, 4, 5, 6],
  maxSessionMinutes: 120,
  trailEveryWeeks: 3,
  trainingTime: 'pagi',
  createdAt: '2026-11-16',
  ...over,
});

export const request = (over: Partial<WeekRequest> = {}): WeekRequest => ({
  weekStart: '2026-11-23',
  runSessions: 4,
  strengthSessions: 2,
  availableDays: [0, 1, 2, 3, 4, 5, 6],
  busyDays: [],
  includeTrail: false,
  confirmed: true,
  ...over,
});

/** GPX sintetis: 10 km lurus ke timur, naik 300 m di km 2-5, turun di km 6-9. */
export function syntheticGpx(withWaypoint = true): string {
  const pts: string[] = [];
  const n = 401;
  for (let i = 0; i < n; i++) {
    const km = (10 * i) / (n - 1);
    let ele = 100;
    if (km >= 2 && km <= 5) ele = 100 + ((km - 2) / 3) * 300;
    else if (km > 5 && km < 6) ele = 400;
    else if (km >= 6 && km <= 9) ele = 400 - ((km - 6) / 3) * 300;
    else if (km > 9) ele = 100;
    const lon = 106.8 + km / 110.6; // ~1 derajat bujur ≈ 110,6 km di dekat khatulistiwa
    pts.push(`<trkpt lat="-6.2" lon="${lon.toFixed(6)}"><ele>${ele.toFixed(1)}</ele></trkpt>`);
  }
  const wpt = withWaypoint ? `<wpt lat="-6.2" lon="${(106.8 + 5.5 / 110.6).toFixed(6)}"><name>Pos 1</name></wpt>` : '';
  return `<?xml version="1.0"?><gpx version="1.1"><metadata><name>Uji Trail</name></metadata>${wpt}<trk><name>Uji Trail</name><trkseg>${pts.join('')}</trkseg></trk></gpx>`;
}
