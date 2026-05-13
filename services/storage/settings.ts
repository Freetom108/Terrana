import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ThemePreference } from '../../constants/themePreference';
import { parseStoredTheme } from '../../constants/themePreference';

const KEY_PRO = 'terrana_isPro';
const KEY_LIFETIME = 'terrana_isLifetime';
const KEY_IMPORT_COUNT = 'terrana_importCount';
const KEY_THEME = 'terrana_theme';
const KEY_LANGUAGE = 'terrana_language';

const SUPPORTED_LANG_CODES = new Set(['en', 'de', 'fr', 'es']);

function parseBoolean(raw: string | null): boolean {
  if (raw === null) return false;
  try {
    return Boolean(JSON.parse(raw));
  } catch {
    return raw === 'true';
  }
}

function parseCount(raw: string | null): number {
  if (raw === null) return 0;
  try {
    const n = JSON.parse(raw) as unknown;
    if (typeof n !== 'number' || !Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
  } catch {
    return 0;
  }
}

export async function getIsPro(): Promise<boolean> {
  return parseBoolean(await AsyncStorage.getItem(KEY_PRO));
}

export async function setIsPro(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_PRO, JSON.stringify(Boolean(value)));
}

export async function getIsLifetime(): Promise<boolean> {
  return parseBoolean(await AsyncStorage.getItem(KEY_LIFETIME));
}

export async function setIsLifetime(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_LIFETIME, JSON.stringify(Boolean(value)));
}

/**
 * TEMP TEST — remove after testing.
 * Writes Pro + Lifetime flags to AsyncStorage (`terrana_isPro`, `terrana_isLifetime`)
 * using the same format as {@link setIsPro} / {@link setIsLifetime}.
 */
export async function tempForceProLifetimeForTesting(): Promise<void> {
  await AsyncStorage.multiSet([
    [KEY_PRO, JSON.stringify(true)],
    [KEY_LIFETIME, JSON.stringify(true)],
  ]);
}

export async function getImportCount(): Promise<number> {
  return parseCount(await AsyncStorage.getItem(KEY_IMPORT_COUNT));
}

export async function incrementImportCount(): Promise<void> {
  const next = (await getImportCount()) + 1;
  await AsyncStorage.setItem(KEY_IMPORT_COUNT, JSON.stringify(next));
}

export async function resetImportCount(): Promise<void> {
  await AsyncStorage.setItem(KEY_IMPORT_COUNT, JSON.stringify(0));
}

export async function getThemePreference(): Promise<ThemePreference> {
  return parseStoredTheme(await AsyncStorage.getItem(KEY_THEME));
}

export async function setThemePreference(value: ThemePreference): Promise<void> {
  await AsyncStorage.setItem(KEY_THEME, value);
}

/** Saved app language (`en`|`de`|`fr`|`es`), or null to follow device locale. */
export async function getSavedLanguageCode(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(KEY_LANGUAGE);
  if (raw == null || raw.trim() === '') return null;
  const code = raw.trim().split('-')[0]?.toLowerCase() ?? '';
  return SUPPORTED_LANG_CODES.has(code) ? code : null;
}

export async function setSavedLanguageCode(code: string): Promise<void> {
  const c = code.split('-')[0]?.toLowerCase() ?? 'en';
  await AsyncStorage.setItem(KEY_LANGUAGE, SUPPORTED_LANG_CODES.has(c) ? c : 'en');
}
