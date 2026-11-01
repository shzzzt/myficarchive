/* Uploaded EPUB/PDF files, kept in the app's document folder (not cleared by the OS). */
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { kindFromName } from './books-kind';
import { uid, type BookFile } from './fic';

function booksDir() {
  const dir = new Directory(Paths.document, 'books');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}
const fileFor = (b: Pick<BookFile, 'id' | 'kind'>) => new File(booksDir(), `${b.id}.${b.kind}`);

export { kindFromName };

// Some file pickers report EPUBs as octet-stream with odd names, so also sniff the first bytes.
const sniff = (head: Uint8Array): BookFile['kind'] | null =>
  head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46 ? 'pdf'
    : head[0] === 0x50 && head[1] === 0x4b ? 'epub' : null;

export async function pickAndStoreBook(): Promise<BookFile | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/epub+zip', 'application/pdf', 'application/octet-stream', '*/*'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  const picked = new File(a.uri);
  let kind = kindFromName(a.name, a.mimeType);
  if (!kind) {
    const handle = picked.open();
    try { kind = sniff(handle.readBytesSync(4)); } finally { handle.close(); }
  }
  if (!kind) throw new Error('Please choose an .epub or .pdf file.');
  const book: BookFile = { id: uid(), name: a.name, kind, size: picked.size || a.size || 0, addedAt: new Date().toISOString() };
  await picked.copy(fileFor(book));
  return book;
}

export async function bookExists(b: BookFile) {
  return fileFor(b).exists;
}
export async function readBookBytes(b: BookFile): Promise<Uint8Array> {
  return fileFor(b).bytes();
}
export async function readBookBase64(b: BookFile): Promise<string> {
  return fileFor(b).base64();
}
export async function deleteBook(b: BookFile) {
  const f = fileFor(b);
  if (f.exists) f.delete();
}

