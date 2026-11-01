/* Picking files to import and handing exported backups to the share sheet. */
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function pickFile(): Promise<{ name: string; bytes: Uint8Array } | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  if (Platform.OS === 'web') {
    const buf = a.file ? await a.file.arrayBuffer() : await (await fetch(a.uri)).arrayBuffer();
    return { name: a.name, bytes: new Uint8Array(buf) };
  }
  return { name: a.name, bytes: await new File(a.uri).bytes() };
}

/* Hands a bundled file (like the import template) to the share sheet, or downloads it on web. */
export async function shareAssetFile(mod: number, name: string, mimeType: string) {
  const [asset] = await Asset.loadAsync(mod);
  const uri = asset.localUri || asset.uri;
  if (Platform.OS === 'web') {
    const link = document.createElement('a');
    link.href = uri;
    link.download = name;
    link.click();
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  new File(uri).copy(file);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: 'Save the import template' });
}

export async function shareTextFile(name: string, text: string, mimeType: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(text);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: 'Save your Fic Archive backup' });
}
