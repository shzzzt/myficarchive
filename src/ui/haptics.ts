import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export function tap() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}
