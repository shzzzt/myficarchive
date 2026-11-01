/* App state: the fic library (mirrored to SQLite) and UI preferences. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { EMPTY_FILTERS, today, type Fic, type Filters, type SortKey } from '@/lib/fic';
import { deleteBook } from '@/lib/books';
import { DEFAULT_READER, type ReaderSettings } from '@/lib/reader-html';
import type { ThemePref } from '@/ui/theme';
import * as db from './db';
import { clearProgress, getJSON, getTrash, setJSON, setTrash } from './kv';

export interface UIPrefs {
  theme: ThemePref;
  q: string;
  sort: SortKey;
  dir: 'asc' | 'desc';
  f: Filters;
  lastBackup: string | null;
  reader: ReaderSettings;
}

const DEFAULT_UI: UIPrefs = { theme: 'system', q: '', sort: 'added', dir: 'desc', f: EMPTY_FILTERS, lastBackup: null, reader: DEFAULT_READER };

interface Library {
  ready: boolean;
  error: string | null;
  fics: Fic[];
  byId: Map<string, Fic>;
  ui: UIPrefs;
  setUI: (patch: Partial<UIPrefs>) => void;
  save: (fic: Fic) => Promise<Fic>;
  patch: (id: string, patch: Partial<Fic>) => Promise<{ fic: Fic; note: string }>;
  remove: (id: string) => Promise<void>;
  addMany: (fics: Fic[]) => Promise<void>;
  replaceAll: (fics: Fic[]) => Promise<void>;
}

const Ctx = createContext<Library | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [fics, setFics] = useState<Fic[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ui, setUIState] = useState<UIPrefs>(() => {
    const saved = getJSON<Partial<UIPrefs>>('ui', {});
    return { ...DEFAULT_UI, ...saved, f: { ...EMPTY_FILTERS, ...(saved.f || {}) }, reader: { ...DEFAULT_READER, ...(saved.reader || {}) } };
  });
  // Latest list for async actions, so they never work from a stale render.
  const ficsRef = useRef(fics);
  useEffect(() => { ficsRef.current = fics; }, [fics]);

  useEffect(() => {
    db.loadAll()
      .then((list) => {
        setFics(list);
        setReady(true);
        emptyBookTrash(list);
      })
      .catch((e) => { console.error(e); setError(String(e?.message || e)); setReady(true); });
  }, []);

  const setUI = useCallback((p: Partial<UIPrefs>) => {
    setUIState((prev) => {
      const next = { ...prev, ...p };
      setJSON('ui', next);
      return next;
    });
  }, []);

  // Storage is written first; state only changes once the write succeeded.
  const save = useCallback(async (fic: Fic) => {
    const next = { ...fic, updatedAt: new Date().toISOString() };
    await db.put(next);
    setFics((prev) => {
      const i = prev.findIndex((f) => f.id === next.id);
      if (i < 0) return [...prev, next];
      const copy = prev.slice();
      copy[i] = next;
      return copy;
    });
    return next;
  }, []);

  // Applies a partial change, filling in start/finish dates when the status implies them.
  const patch = useCallback(async (id: string, p: Partial<Fic>) => {
    const cur = ficsRef.current.find((f) => f.id === id);
    if (!cur) throw new Error('Fic not found');
    const next = { ...cur, ...p };
    let note = '';
    if (p.status && p.status !== cur.status) {
      if (p.status === 'reading' && !next.startedAt) { next.startedAt = today(); note = 'Started date set to today'; }
      if (p.status === 'finished' && !next.finishedAt) { next.finishedAt = today(); note = 'Finished date set to today'; }
    }
    return { fic: await save(next), note };
  }, [save]);

  const remove = useCallback(async (id: string) => {
    await db.remove(id);
    setFics((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const addMany = useCallback(async (list: Fic[]) => {
    await db.putMany(list);
    setFics((prev) => {
      const map = new Map(prev.map((f) => [f.id, f]));
      list.forEach((f) => map.set(f.id, f));
      return [...map.values()];
    });
  }, []);

  const replaceAll = useCallback(async (list: Fic[]) => {
    await db.replaceAll(list);
    setFics(list);
  }, []);

  const byId = useMemo(() => new Map(fics.map((f) => [f.id, f])), [fics]);

  const value = useMemo(
    () => ({ ready, error, fics, byId, ui, setUI, save, patch, remove, addMany, replaceAll }),
    [ready, error, fics, byId, ui, setUI, save, patch, remove, addMany, replaceAll],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Deletes the files of fics deleted last session (unless the fic came back, e.g. via Undo or a restore).
function emptyBookTrash(list: Fic[]) {
  const trash = getTrash();
  if (!trash.length) return;
  const kept = new Set(list.flatMap((f) => f.files.map((b) => b.id)));
  setTrash([]);
  trash.filter((b) => !kept.has(b.id)).forEach((b) => {
    deleteBook(b).catch(() => {});
    clearProgress(b.id);
  });
}

export function useLibrary() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLibrary outside LibraryProvider');
  return v;
}
