import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Nunito_400Regular } from '@expo-google-fonts/nunito';
import { PixelifySans_400Regular, PixelifySans_500Medium, PixelifySans_600SemiBold, PixelifySans_700Bold } from '@expo-google-fonts/pixelify-sans';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { FeedbackProvider } from '@/state/feedback';
import { LibraryProvider, useLibrary } from '@/state/library';
import { ThemeProvider, useTheme } from '@/ui/theme';
import { Txt } from '@/ui/kit';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LibraryProvider>
        <Themed />
      </LibraryProvider>
    </SafeAreaProvider>
  );
}

function Themed() {
  const { ui } = useLibrary();
  return (
    <ThemeProvider pref={ui.theme}>
      <FeedbackProvider>
        <Shell />
      </FeedbackProvider>
    </ThemeProvider>
  );
}

function Shell() {
  const t = useTheme();
  const { ready, error } = useLibrary();
  const [fontsLoaded, fontError] = useFonts({
    PressStart2P_400Regular, PixelifySans_400Regular, PixelifySans_500Medium, PixelifySans_600SemiBold, PixelifySans_700Bold, Nunito_400Regular,
  });
  const loaded = ready && (fontsLoaded || !!fontError);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.sky1).catch(() => {});
  }, [t.sky1]);
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;
  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: t.sky1 }}>
        <Txt v="display" size={13} style={{ marginBottom: 8, textAlign: 'center' }}>{"Couldn't open your library"}</Txt>
        <Txt color={t.ink2} style={{ textAlign: 'center' }}>{error}</Txt>
      </View>
    );
  }
  return (
    <>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.sky1 } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="fic/[id]" />
        <Stack.Screen name="edit/[id]" />
        <Stack.Screen name="author/[name]" />
        <Stack.Screen name="read/[id]" options={{ animation: 'fade' }} />
      </Stack>
    </>
  );
}
