import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { applyThemePreference, screenSurfaceColor } from '../constants/themePreference';
import { subscribeLocale, setLocale } from '../services/i18n/i18n';
import { runStorageMigration } from '../services/storage/migration';
import { useEffect, useReducer } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  getSavedLanguageCode,
  getThemePreference,
} from '../services/storage/settings';

function RootNavigator() {
  const scheme = useColorScheme();
  const [, redraw] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    let cancelled = false;
    const unsub = subscribeLocale(() => redraw());

    void (async () => {
      await runStorageMigration();
      const lang = await getSavedLanguageCode();
      if (!cancelled && lang) setLocale(lang);
      const theme = await getThemePreference();
      if (!cancelled) applyThemePreference(theme);
    })();

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const bg = screenSurfaceColor(scheme);

  const statusStyle = scheme === 'dark' ? 'light' : 'dark';

  return (
    <>
      <StatusBar style={statusStyle} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="blend/[id]" />
        <Stack.Screen name="blend/new" />
        <Stack.Screen name="recent-products" />
        <Stack.Screen name="all-products" />
        <Stack.Screen name="all-blends" />
        <Stack.Screen name="paywall" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}
