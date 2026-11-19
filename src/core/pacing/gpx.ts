// Parser dan penulis GPX sederhana tanpa dependensi (aman dipakai di React Native).

export interface GeoPoint {
  lat: number;
  lon: number;
  ele?: number;
}

export interface Waypoint extends GeoPoint {
  name: string;
  desc?: string;
}

export interface ParsedGpx {
  name?: string;
  points: GeoPoint[];
  waypoints: Waypoint[];
}

const num = (s: string | undefined) => (s === undefined ? undefined : Number(s));

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`));
  return m ? m[1] : undefined;
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function child(body: string, tag: string): string | undefined {
  const m = body.match(new RegExp(`<(?:\\w+:)?${tag}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${tag}>`));
  return m ? decode(m[1]) : undefined;
}

function readPoints(xml: string, tag: 'trkpt' | 'rtept' | 'wpt'): { head: string; body: string }[] {
  const out: { head: string; body: string }[] = [];
  const re = new RegExp(`<${tag}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${tag}>)`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push({ head: m[1], body: m[2] ?? '' });
  return out;
}

export function parseGpx(xml: string): ParsedGpx {
  if (!/<gpx[\s>]/i.test(xml)) throw new Error('File ini bukan GPX.');
  let raw = readPoints(xml, 'trkpt');
  if (raw.length === 0) raw = readPoints(xml, 'rtept');
  const points: GeoPoint[] = [];
  for (const p of raw) {
    const lat = num(attr(p.head, 'lat'));
    const lon = num(attr(p.head, 'lon'));
    if (lat === undefined || lon === undefined || !isFinite(lat) || !isFinite(lon)) continue;
    const ele = num(child(p.body, 'ele'));
    points.push({ lat, lon, ele: ele !== undefined && isFinite(ele) ? ele : undefined });
  }
  if (points.length < 2) throw new Error('GPX tidak berisi rute (titik trk atau rte).');
  const waypoints: Waypoint[] = [];
  for (const w of readPoints(xml, 'wpt')) {
    const lat = num(attr(w.head, 'lat'));
    const lon = num(attr(w.head, 'lon'));
    if (lat === undefined || lon === undefined) continue;
    waypoints.push({ lat, lon, ele: num(child(w.body, 'ele')), name: child(w.body, 'name') ?? 'Waypoint', desc: child(w.body, 'desc') });
  }
  const meta = xml.match(/<metadata>([\s\S]*?)<\/metadata>/);
  const trk = xml.match(/<(?:trk|rte)>([\s\S]*?)<(?:trkseg|rtept)/);
  const name = (meta && child(meta[1], 'name')) || (trk && child(trk[1], 'name')) || undefined;
  return { name, points, waypoints };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f6 = (x: number) => x.toFixed(6);

export function writeGpx(opts: { name: string; points: GeoPoint[]; waypoints: Waypoint[] }): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<gpx version="1.1" creator="Pelatih" xmlns="http://www.topografix.com/GPX/1/1">');
  lines.push(`  <metadata><name>${esc(opts.name)}</name></metadata>`);
  for (const w of opts.waypoints) {
    lines.push(`  <wpt lat="${f6(w.lat)}" lon="${f6(w.lon)}">`);
    if (w.ele !== undefined) lines.push(`    <ele>${w.ele.toFixed(1)}</ele>`);
    lines.push(`    <name>${esc(w.name)}</name>`);
    if (w.desc) lines.push(`    <desc>${esc(w.desc)}</desc>`);
    lines.push('  </wpt>');
  }
  lines.push(`  <trk><name>${esc(opts.name)}</name><trkseg>`);
  for (const p of opts.points) {
    lines.push(
      p.ele !== undefined
        ? `    <trkpt lat="${f6(p.lat)}" lon="${f6(p.lon)}"><ele>${p.ele.toFixed(1)}</ele></trkpt>`
        : `    <trkpt lat="${f6(p.lat)}" lon="${f6(p.lon)}"/>`,
    );
  }
  lines.push('  </trkseg></trk>');
  lines.push('</gpx>');
  return lines.join('\n');
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371.0088;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
