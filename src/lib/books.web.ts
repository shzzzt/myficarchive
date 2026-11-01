/* Web build: uploaded books live in IndexedDB. */
import * as DocumentPicker from 'expo-document-picker';
import { toBase64 } from './base64';
import { uid, type BookFile } from './fic';

import { kindFromName } from './books-kind';

export { kindFromName };

const DB = 'fic-archive-books';
const STORE = 'books';

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
  });
}

export async function pickAndStoreBook(): Promise<BookFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/epub+zip', 'application/pdf', '*/*'] });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  const bytes = new Uint8Array(a.file ? await a.file.arrayBuffer() : await (await fetch(a.uri)).arrayBuffer());
  const kind = kindFromName(a.name, a.mimeType)
    || (bytes[0] === 0x25 && bytes[1] === 0x50 ? 'pdf' : bytes[0] === 0x50 && bytes[1] === 0x4b ? 'epub' : null);
  if (!kind) throw new Error('Please choose an .epub or .pdf file.');
  const book: BookFile = { id: uid(), name: a.name, kind, size: bytes.length, addedAt: new Date().toISOString() };
  await run('readwrite', (s) => s.put(bytes, book.id));
  return book;
}

export async function bookExists(b: BookFile) {
  return (await run('readonly', (s) => s.count(b.id))) > 0;
}
export async function readBookBytes(b: BookFile): Promise<Uint8Array> {
  const v = await run<Uint8Array | undefined>('readonly', (s) => s.get(b.id));
  if (!v) throw new Error('missing');
  return v;
}
export async function readBookBase64(b: BookFile): Promise<string> {
  return toBase64(await readBookBytes(b));
}
export async function deleteBook(b: BookFile) {
  await run('readwrite', (s) => s.delete(b.id));
}
