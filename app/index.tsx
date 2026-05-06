import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export const ONBOARDED_KEY = 'terrana_onboarded';

type Status = 'loading' | 'onboarded' | 'fresh';

export default function Index() {
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const value = await AsyncStorage.getItem(ONBOARDED_KEY);
        if (!cancelled) {
          setStatus(value === 'true' ? 'onboarded' : 'fresh');
        }
      } catch {
        if (!cancelled) setStatus('fresh');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (status === 'onboarded') {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}
