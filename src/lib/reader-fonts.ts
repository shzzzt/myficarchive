/* Book fonts bundled with the app, turned into @font-face rules for the reader page.
   Each weight is imported from its own subpath so only these four files per family are bundled. */
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { Literata_400Regular } from '@expo-google-fonts/literata/400Regular';
import { Literata_400Regular_Italic } from '@expo-google-fonts/literata/400Regular_Italic';
import { Literata_700Bold } from '@expo-google-fonts/literata/700Bold';
import { Literata_700Bold_Italic } from '@expo-google-fonts/literata/700Bold_Italic';
import { Lora_400Regular } from '@expo-google-fonts/lora/400Regular';
import { Lora_400Regular_Italic } from '@expo-google-fonts/lora/400Regular_Italic';
import { Lora_700Bold } from '@expo-google-fonts/lora/700Bold';
import { Lora_700Bold_Italic } from '@expo-google-fonts/lora/700Bold_Italic';
import { EBGaramond_400Regular } from '@expo-google-fonts/eb-garamond/400Regular';
import { EBGaramond_400Regular_Italic } from '@expo-google-fonts/eb-garamond/400Regular_Italic';
import { EBGaramond_700Bold } from '@expo-google-fonts/eb-garamond/700Bold';
import { EBGaramond_700Bold_Italic } from '@expo-google-fonts/eb-garamond/700Bold_Italic';
import { AtkinsonHyperlegible_400Regular } from '@expo-google-fonts/atkinson-hyperlegible/400Regular';
import { AtkinsonHyperlegible_400Regular_Italic } from '@expo-google-fonts/atkinson-hyperlegible/400Regular_Italic';
import { AtkinsonHyperlegible_700Bold } from '@expo-google-fonts/atkinson-hyperlegible/700Bold';
import { AtkinsonHyperlegible_700Bold_Italic } from '@expo-google-fonts/atkinson-hyperlegible/700Bold_Italic';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_400Regular_Italic } from '@expo-google-fonts/nunito/400Regular_Italic';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_700Bold_Italic } from '@expo-google-fonts/nunito/700Bold_Italic';
import { readerFontFamily, type ReaderFont } from './reader-html';

// regular, italic, bold, bold italic
const FILES: Record<Exclude<ReaderFont, 'classic'>, [number, number, number, number]> = {
  literata: [Literata_400Regular, Literata_400Regular_Italic, Literata_700Bold, Literata_700Bold_Italic],
  lora: [Lora_400Regular, Lora_400Regular_Italic, Lora_700Bold, Lora_700Bold_Italic],
  garamond: [EBGaramond_400Regular, EBGaramond_400Regular_Italic, EBGaramond_700Bold, EBGaramond_700Bold_Italic],
  atkinson: [AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_400Regular_Italic, AtkinsonHyperlegible_700Bold, AtkinsonHyperlegible_700Bold_Italic],
  nunito: [Nunito_400Regular, Nunito_400Regular_Italic, Nunito_700Bold, Nunito_700Bold_Italic],
};
const FACES = [['400', 'normal'], ['400', 'italic'], ['700', 'normal'], ['700', 'italic']] as const;

/* Regular weights, for showing each font's name in its own face in the settings sheet. */
export const PREVIEW_FONTS = {
  ReaderPreview_literata: Literata_400Regular,
  ReaderPreview_lora: Lora_400Regular,
  ReaderPreview_garamond: EBGaramond_400Regular,
  ReaderPreview_atkinson: AtkinsonHyperlegible_400Regular,
  ReaderPreview_nunito: Nunito_400Regular,
};

// The page is a WebView with an https base URL, so on phones the files are inlined as data URIs.
async function src(mod: number) {
  const [a] = await Asset.loadAsync(mod);
  const uri = a.localUri || a.uri;
  if (Platform.OS === 'web') return `url("${uri}")`;
  return `url(data:font/ttf;base64,${await new File(uri).base64()}) format("truetype")`;
}

const cache = new Map<ReaderFont, Promise<string>>();

/* CSS for the chosen font ('' for the built-in serif). Loaded once per session. */
export function readerFontCss(font: ReaderFont): Promise<string> {
  if (font === 'classic') return Promise.resolve('');
  let p = cache.get(font);
  if (!p) {
    const family = readerFontFamily(font);
    p = Promise.all(FILES[font].map(src))
      .then((srcs) => srcs.map((s, i) => `@font-face{font-family:"${family}";src:${s};font-weight:${FACES[i][0]};font-style:${FACES[i][1]};font-display:block}`).join('\n'))
      .catch((e) => { cache.delete(font); throw e; });
    cache.set(font, p);
  }
  return p;
}
