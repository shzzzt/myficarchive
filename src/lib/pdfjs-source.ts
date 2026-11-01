/* Loads the bundled pdf.js sources (assets/pdfjs) as text, once per app session. */
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import pdfSrc from '../../assets/pdfjs/pdf.min.mjs.txt';
import workerSrc from '../../assets/pdfjs/pdf.worker.min.mjs.txt';

let cached: Promise<{ pdf: string; worker: string }> | null = null;

async function read(a: Asset) {
  if (Platform.OS === 'web') return (await fetch(a.localUri || a.uri)).text();
  return new File(a.localUri || a.uri).text();
}

export function loadPdfJs() {
  if (!cached) {
    cached = Asset.loadAsync([pdfSrc, workerSrc])
      .then(async ([p, w]) => ({ pdf: await read(p), worker: await read(w) }))
      .catch((e) => { cached = null; throw e; });
  }
  return cached;
}
