import * as SQLite from 'expo-sqlite';

// Penyimpanan dokumen JSON sederhana di SQLite. Untuk pemakaian pribadi, data kecil
// sehingga semua koleksi dimuat ke memori saat aplikasi dibuka.

export type Collection = 'profile' | 'week' | 'checkin' | 'setlog' | 'activity' | 'race' | 'settings';

let db: SQLite.SQLiteDatabase | null = null;

function conn(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('pelatih.db');
    db.execSync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS docs (
        collection TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        updated INTEGER NOT NULL,
        PRIMARY KEY (collection, id)
      );
    `);
  }
  return db;
}

export function put<T>(collection: Collection, id: string, value: T): void {
  conn().runSync(
    'INSERT INTO docs (collection, id, data, updated) VALUES (?, ?, ?, ?) ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data, updated = excluded.updated',
    collection, id, JSON.stringify(value), Date.now(),
  );
}

export function get<T>(collection: Collection, id: string): T | null {
  const row = conn().getFirstSync<{ data: string }>('SELECT data FROM docs WHERE collection = ? AND id = ?', collection, id);
  return row ? (JSON.parse(row.data) as T) : null;
}

export function list<T>(collection: Collection): T[] {
  return conn().getAllSync<{ data: string }>('SELECT data FROM docs WHERE collection = ? ORDER BY id', collection).map((r) => JSON.parse(r.data) as T);
}

export function remove(collection: Collection, id: string): void {
  conn().runSync('DELETE FROM docs WHERE collection = ? AND id = ?', collection, id);
}

export function exportAll(): string {
  const rows = conn().getAllSync<{ collection: string; id: string; data: string }>('SELECT collection, id, data FROM docs');
  return JSON.stringify({ exportedAt: new Date().toISOString(), rows: rows.map((r) => ({ ...r, data: JSON.parse(r.data) })) }, null, 1);
}

export function wipeAll(): void {
  conn().execSync('DELETE FROM docs');
}
