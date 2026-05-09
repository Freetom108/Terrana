import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useThemePalette } from '../../hooks/useThemePalette';
import { subscribeLocale, t } from '../../services/i18n/i18n';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useReducer } from 'react';

const ROUTE_TAB_KEY: Record<string, string> = {
  index: 'tabs.home',
  favorites: 'tabs.favorites',
  import: 'tabs.import',
  blends: 'tabs.blends',
  settings: 'tabs.settings',
};

const ICON_ROUTE_ICONS = {
  index: { inactive: 'home-outline' as const, active: 'home' as const },
  favorites: { inactive: 'star-outline' as const, active: 'star' as const },
  import: { inactive: 'add-circle-outline' as const, active: 'add-circle' as const },
  blends: { inactive: 'flask-outline' as const, active: 'flask' as const },
  settings: { inactive: 'settings-outline' as const, active: 'settings' as const },
} as const;

const ICON_SIZE = 24;
const ICON_ROW_MIN_HEIGHT = 28;

const ICON_ONLY_ROUTES = new Set(['index']);

export function IconTabBar(props: BottomTabBarProps) {
  const { state, navigation } = props;
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);
  const p = useThemePalette();
  const [, bumpTabs] = useReducer((n: number) => n + 1, 0);

  useEffect(() => subscribeLocale(() => bumpTabs()), []);

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: bottomPad,
          borderTopColor: p.tabBarBorder,
          backgroundColor: p.tabBarBg,
        },
      ]}
      accessibilityRole="tablist"
    >
      {state.routes.map((route, index) => {
        const tabKey = ROUTE_TAB_KEY[route.name];
        const label = tabKey ? (t(tabKey) as string) : route.name;

        const focused = state.index === index;
        const pair = ICON_ROUTE_ICONS[route.name as keyof typeof ICON_ROUTE_ICONS];
        const iconName = pair ? (focused ? pair.active : pair.inactive) : 'ellipse-outline';
        const iconColor = focused ? p.tabLabelActive : p.tabLabelInactive;

        const onPress = () => {
          const e = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !e.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () =>
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={typeof label === 'string' ? label : route.name}
            onPress={onPress}
            onLongPress={onLongPress}
            style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
          >
            <View style={styles.iconSlot}>
              <Ionicons name={iconName} size={ICON_SIZE} color={iconColor} />
            </View>
            {!ICON_ONLY_ROUTES.has(route.name) ? (
              <Text
                style={[
                  styles.label,
                  { color: focused ? p.tabLabelActive : p.tabLabelInactive },
                ]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
                maxFontSizeMultiplier={1.12}
              >
                {label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 1,
    paddingTop: 4,
    paddingBottom: 8,
    minHeight: 58,
    gap: 4,
  },
  cellPressed: {
    opacity: 0.76,
  },
  iconSlot: {
    minHeight: ICON_ROW_MIN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
  },
});
