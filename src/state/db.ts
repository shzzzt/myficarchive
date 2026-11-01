/* SQLite persistence: one row per fic (JSON), written in transactions. */
import * as SQLite from 'expo-sqlite';
import { normalizeFic, type Fic } from '@/lib/fic';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('fic-archive.db').then(async (d) => {
      await d.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS fics (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);
      `);
      return d;
    });
  }
  return dbPromise;
}

export async function loadAll(): Promise<Fic[]> {
  const rows = await (await db()).getAllAsync<{ data: string }>('SELECT data FROM fics');
  const out: Fic[] = [];
  for (const r of rows) {
    try { out.push(normalizeFic(JSON.parse(r.data))); } catch { /* skip a corrupt row rather than losing the library */ }
  }
  return out;
}

export async function put(fic: Fic) {
  await (await db()).runAsync('INSERT OR REPLACE INTO fics (id, data) VALUES (?, ?)', fic.id, JSON.stringify(fic));
}

export async function putMany(fics: Fic[]) {
  const d = await db();
  await d.withTransactionAsync(async () => {
    for (const f of fics) await d.runAsync('INSERT OR REPLACE INTO fics (id, data) VALUES (?, ?)', f.id, JSON.stringify(f));
  });
}

export async function remove(id: string) {
  await (await db()).runAsync('DELETE FROM fics WHERE id = ?', id);
}

export async function replaceAll(fics: Fic[]) {
  const d = await db();
  await d.withTransactionAsync(async () => {
    await d.runAsync('DELETE FROM fics');
    for (const f of fics) await d.runAsync('INSERT INTO fics (id, data) VALUES (?, ?)', f.id, JSON.stringify(f));
  });
}
