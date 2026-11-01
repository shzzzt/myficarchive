/* Small synchronous key-value store for preferences and unsaved drafts. */
import { useSyncExternalStore } from 'react';
import Storage from 'expo-sqlite/kv-store';
import type { BookFile } from '@/lib/fic';

export function getJSON<T>(key: string, fallback: T): T {
  try {
    const v = Storage.getItemSync(key);
    return v == null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

export function setJSON(key: string, value: unknown) {
  try { Storage.setItemSync(key, JSON.stringify(value)); } catch { /* preferences are best-effort */ }
}

export function removeKey(key: string) {
  try { Storage.removeItemSync(key); } catch { /* ignore */ }
}

export const draftKey = (id: string) => `draft:${id}`;
export const thoughtsKey = (id: string) => `thoughts:${id}`;

/* Where you stopped in an uploaded book. */
export interface ReadingProgress { chapter: number; chapters?: number; frac: number; page?: number; pages?: number; at: number }
export const progressKey = (bookId: string) => `progress:${bookId}`;
// Cached + subscribable, so screens showing progress update as soon as the reader saves it.
const progressCache = new Map<string, ReadingProgress | null>();
const progressListeners = new Set<() => void>();
const notifyProgress = () => progressListeners.forEach((l) => l());
export function getProgress(bookId: string): ReadingProgress | null {
  if (!progressCache.has(bookId)) progressCache.set(bookId, getJSON<ReadingProgress | null>(progressKey(bookId), null));
  return progressCache.get(bookId) ?? null;
}
export function setProgress(bookId: string, p: ReadingProgress) {
  setJSON(progressKey(bookId), p);
  progressCache.set(bookId, p);
  notifyProgress();
}
export function clearProgress(bookId: string) {
  removeKey(progressKey(bookId));
  progressCache.delete(bookId);
  notifyProgress();
}
export function useProgress(bookId: string) {
  return useSyncExternalStore(
    (cb) => { progressListeners.add(cb); return () => { progressListeners.delete(cb); }; },
    () => getProgress(bookId),
  );
}

/* Books of deleted fics wait here until the next launch, so Undo can still bring them back. */
const TRASH = 'books:trash';
export const getTrash = () => getJSON<BookFile[]>(TRASH, []);
export const setTrash = (list: BookFile[]) => setJSON(TRASH, list);
