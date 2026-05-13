import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useReducer } from 'react';
import { IconTabBar } from '../../components/navigation/IconTabBar';
import { subscribeLocale, t } from '../../services/i18n/i18n';

export default function TabsLayout() {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeLocale(() => bump()), []);

  return (
    <Tabs tabBar={(props) => <IconTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ title: t('tabs.favorites'), tabBarLabel: t('tabs.favorites') }}
      />
      <Tabs.Screen name="import" options={{ title: t('tabs.import'), tabBarLabel: t('tabs.import') }} />
      <Tabs.Screen
        name="search"
        options={{ href: null, title: t('tabs.search'), tabBarLabel: t('tabs.search') }}
      />
      <Tabs.Screen
        name="blends"
        options={{ headerShown: false, title: t('tabs.blends'), tabBarLabel: t('tabs.blends') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t('tabs.settings'), tabBarLabel: t('tabs.settings') }}
      />
    </Tabs>
  );
}
