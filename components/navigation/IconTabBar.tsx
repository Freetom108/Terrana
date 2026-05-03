import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_LABELS: Record<string, string> = {
  index: 'Sammlung',
  search: 'Suche',
  import: 'Import',
  blends: 'Mischungen',
};

const ICON_ROUTE_ICONS = {
  index: { inactive: 'home-outline' as const, active: 'home' as const },
  search: { inactive: 'search-outline' as const, active: 'search' as const },
  import: { inactive: 'add-circle-outline' as const, active: 'add-circle' as const },
  blends: { inactive: 'flask-outline' as const, active: 'flask' as const },
} as const;

const ICON_SIZE = 24;
const ICON_ROW_MIN_HEIGHT = 28;

export function IconTabBar(props: BottomTabBarProps) {
  const { state, descriptors, navigation } = props;
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: bottomPad,
          borderTopColor: colors.sageLight,
        },
      ]}
      accessibilityRole="tablist"
    >
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        const options = descriptor?.options ?? {};
        const metaLabel = TAB_LABELS[route.name] ?? route.name;
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : typeof options.title === 'string'
              ? options.title
              : metaLabel;

        const focused = state.index === index;
        const pair = ICON_ROUTE_ICONS[route.name as keyof typeof ICON_ROUTE_ICONS];
        const iconName = pair ? (focused ? pair.active : pair.inactive) : 'ellipse-outline';
        const iconColor = focused ? colors.sageDark : colors.mid;

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
            <Text
              style={[styles.label, focused ? styles.labelActive : styles.labelInactive]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              maxFontSizeMultiplier={1.12}
            >
              {label}
            </Text>
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
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
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
    paddingHorizontal: 2,
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
  labelActive: {
    color: colors.sageDark,
  },
  labelInactive: {
    color: colors.mid,
    fontWeight: '500',
  },
});
