import { Tabs } from 'expo-router';
import { colors } from '../../constants/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.sageDark,
        tabBarInactiveTintColor: colors.mid,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.sageLight },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Suche' }} />
      <Tabs.Screen name="import" options={{ title: 'Import' }} />
      <Tabs.Screen name="blends" options={{ title: 'Mischungen' }} />
    </Tabs>
  );
}
