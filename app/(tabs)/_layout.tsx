import { Tabs } from 'expo-router';
import { IconTabBar } from '../../components/navigation/IconTabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <IconTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Sammlung', tabBarLabel: 'Sammlung' }} />
      <Tabs.Screen name="search" options={{ title: 'Suche', tabBarLabel: 'Suche' }} />
      <Tabs.Screen name="import" options={{ title: 'Import', tabBarLabel: 'Import' }} />
      <Tabs.Screen name="blends" options={{ headerShown: false }} />
      <Tabs.Screen name="settings" options={{ title: 'Einstellungen', tabBarLabel: 'Einstellungen' }} />
    </Tabs>
  );
}
