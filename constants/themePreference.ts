import { Appearance } from 'react-native';
import { colors } from './colors';

export type ThemePreference = 'light' | 'auto' | 'dark';

export function parseStoredTheme(raw: string | null): ThemePreference {
  const v = typeof raw === 'string' ? raw.trim() : '';
  if (v === 'light' || v === 'auto' || v === 'dark') return v;
  return 'auto';
}

export function applyThemePreference(pref: ThemePreference): void {
  const set = Appearance.setColorScheme as ((s: 'light' | 'dark' | null) => void) | undefined;
  if (!set) return;
  if (pref === 'light') set('light');
  else if (pref === 'dark') set('dark');
  else set(null);
}

export function screenSurfaceColor(scheme: 'light' | 'dark' | null | undefined): string {
  return scheme === 'dark' ? '#252220' : colors.cream;
}

export function screenPrimaryText(scheme: 'light' | 'dark' | null | undefined): string {
  return scheme === 'dark' ? '#F2EDE6' : colors.dark;
}

export function screenSecondaryText(scheme: 'light' | 'dark' | null | undefined): string {
  return scheme === 'dark' ? '#B8B0A8' : colors.mid;
}
