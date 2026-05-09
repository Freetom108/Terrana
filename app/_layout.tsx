import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { applyThemePreference, screenSurfaceColor } from '../constants/themePreference';
import { subscribeLocale, setLocale } from '../services/i18n/i18n';
import { runStorageMigration } from '../services/storage/migration';
import * as Notifications from 'expo-notifications';
import { useEffect, useReducer } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  getSavedLanguageCode,
  getThemePreference,
} from '../services/storage/settings';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function RootNavigator() {
  const scheme = useColorScheme();
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const router = useRouter();

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

    // Navigate to settings when user taps a backup-reminder notification
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.navigate === 'backup') {
        router.push('/(tabs)/settings');
      }
    });

    return () => {
      cancelled = true;
      unsub();
      responseSub.remove();
    };
  }, [router]);

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
        <Stack.Screen name="product/new" />
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
