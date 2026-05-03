import { colors } from '../constants/colors';
import {
  screenPrimaryText,
  screenSecondaryText,
  screenSurfaceColor,
} from '../constants/themePreference';
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

export type ThemePalette = ReturnType<typeof useThemePalette>;

/**
 * Resolved UI colors for light / dark scheme (respects Appearance.setColorScheme from stored theme).
 */
export function useThemePalette() {
  const scheme = useColorScheme();

  return useMemo(() => {
    const isDark = scheme === 'dark';
    const surface = screenSurfaceColor(scheme);
    const text = screenPrimaryText(scheme);
    const muted = screenSecondaryText(scheme);
    const card = isDark ? '#2F2E2C' : colors.white;
    const inputBg = isDark ? '#3D3B38' : colors.cream;
    const border = isDark ? '#4E4B46' : colors.sageLight;
    const subtleBorder = isDark ? '#3D3A36' : colors.sageLight;
    const chipBg = isDark ? '#3E4A40' : 'rgba(122,158,126,0.18)';
    const placeholderColor = isDark ? '#958F88' : colors.mid;
    const tabBarBg = isDark ? '#1C1B19' : colors.white;
    const tabBarBorder = isDark ? '#383530' : colors.sageLight;
    const tabLabelActive = isDark ? colors.sageLight : colors.sageDark;
    const tabLabelInactive = isDark ? '#9A9590' : colors.mid;
    const secondaryBtnLabel = isDark ? colors.sageLight : colors.sageDark;

    return {
      scheme,
      isDark,
      surface,
      text,
      muted,
      card,
      inputBg,
      border,
      subtleBorder,
      chipBg,
      placeholderColor,
      tabBarBg,
      tabBarBorder,
      tabLabelActive,
      tabLabelInactive,
      secondaryBtnLabel,
    };
  }, [scheme]);
}
