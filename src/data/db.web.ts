// Versi web (pratinjau di browser): penyimpanan di localStorage dengan API yang sama dengan db.ts.
import type { Collection } from './db';

const KEY = 'pelatih-docs';
type Store = Record<string, Record<string, unknown>>;

function load(): Store {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(KEY) ?? '{}') as Store;
  } catch {
    return {};
  }
}
let mem: Store = load();
function save() {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(mem));
  } catch {
    // mode privat: cukup di memori
  }
}

export function put<T>(collection: Collection, id: string, value: T): void {
  mem[collection] = { ...(mem[collection] ?? {}), [id]: value };
  save();
}
export function get<T>(collection: Collection, id: string): T | null {
  return (mem[collection]?.[id] as T) ?? null;
}
export function list<T>(collection: Collection): T[] {
  const c = mem[collection] ?? {};
  return Object.keys(c).sort().map((k) => c[k] as T);
}
export function remove(collection: Collection, id: string): void {
  if (mem[collection]) delete mem[collection][id];
  save();
}
export function exportAll(): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), data: mem }, null, 1);
}
export function wipeAll(): void {
  mem = {};
  save();
}
