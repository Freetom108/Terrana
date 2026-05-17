import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { applyThemePreference, screenSurfaceColor } from '../constants/themePreference';
import { subscribeLocale, setLocale } from '../services/i18n/i18n';
import { runStorageMigration } from '../services/storage/migration';
import { useEffect, useReducer } from 'react';
import { Platform, useColorScheme } from 'react-native';
import Purchases from 'react-native-purchases';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { applyCustomerInfoToStorage } from '../services/purchase/iap';
import { getSavedLanguageCode, getThemePreference } from '../services/storage/settings';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

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

  useEffect(() => {
    if (isExpoGo || Platform.OS === 'web') return;

    const apiKey =
      Platform.select({
        ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
        android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
      }) ?? '';

    if (!apiKey.trim()) {
      console.error('RevenueCat init failed:', new Error('empty API key (set EXPO_PUBLIC_REVENUECAT_* for EAS builds)'));
      return;
    }

    try {
      Purchases.configure({ apiKey });
      Purchases.addCustomerInfoUpdateListener((info) => {
        void applyCustomerInfoToStorage(info);
      });
    } catch (e) {
      console.error('RevenueCat init failed:', e);
    }
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
