import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';

import de from '../../locales/de.json';
import en from '../../locales/en.json';
import es from '../../locales/es.json';
import fr from '../../locales/fr.json';

const SUPPORTED = new Set(['en', 'de', 'fr', 'es']);

function normalizeLanguageCode(tag: string | undefined, languageCode: string | undefined): string {
  const raw = (languageCode ?? tag?.split('-')[0] ?? 'en').toLowerCase();
  if (SUPPORTED.has(raw)) return raw;
  return 'en';
}

export function resolveDeviceLocale(): string {
  const locales = getLocales();
  const primary = locales[0];
  return normalizeLanguageCode(primary?.languageTag, primary?.languageCode ?? undefined);
}

const i18n = new I18n({
  en,
  de,
  fr,
  es,
});

i18n.defaultLocale = 'en';
i18n.enableFallback = true;
i18n.locale = resolveDeviceLocale();

export function syncLocaleFromDevice(): void {
  i18n.locale = resolveDeviceLocale();
}

export function setLocale(locale: string): void {
  const code = locale.split('-')[0]?.toLowerCase() ?? 'en';
  i18n.locale = SUPPORTED.has(code) ? code : 'en';
}

export function getLocale(): string {
  return i18n.locale;
}

export const t = i18n.t.bind(i18n);

export { i18n };
