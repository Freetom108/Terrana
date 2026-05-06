import { colors } from '../../constants/colors';
import type { ThemePreference } from '../../constants/themePreference';
import {
  applyThemePreference,
} from '../../constants/themePreference';
import { usePro } from '../../hooks/usePro';
import { useThemePalette } from '../../hooks/useThemePalette';
import { getLocale, setLocale, t } from '../../services/i18n/i18n';
import {
  getThemePreference,
  setSavedLanguageCode,
  setThemePreference,
} from '../../services/storage/settings';
import { useFocusEffect } from 'expo-router';
import { useCallback, useReducer, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const APP_VERSION = '1.0.0';

const THEME_OPTIONS: { value: ThemePreference; labelKey: string }[] = [
  { value: 'light', labelKey: 'settings.themeLight' },
  { value: 'auto', labelKey: 'settings.themeAuto' },
  { value: 'dark', labelKey: 'settings.themeDark' },
];

const LANGUAGE_OPTIONS: { code: string; labelKey: string }[] = [
  { code: 'en', labelKey: 'settings.langEnglish' },
  { code: 'de', labelKey: 'settings.langGerman' },
  { code: 'fr', labelKey: 'settings.langFrench' },
  { code: 'es', labelKey: 'settings.langSpanish' },
];

export default function SettingsTab() {
  const palette = useThemePalette();
  const p = palette;
  const insets = useSafeAreaInsets();
  const { isPro, isLifetime, reload } = usePro();
  const [, bump] = useReducer((x: number) => x + 1, 0);

  const [themePref, setThemePrefState] = useState<ThemePreference>('auto');

  useFocusEffect(
    useCallback(() => {
      void reload();
      void getThemePreference().then(setThemePrefState);
    }, [reload]),
  );

  const surfaceBg = p.surface;
  const headline = p.text;
  const muted = p.muted;

  const cardBg = p.card;
  const inactiveBtnBg = p.inputBg;

  const selectTheme = async (value: ThemePreference) => {
    await setThemePreference(value);
    applyThemePreference(value);
    setThemePrefState(value);
  };

  const selectLanguage = async (code: string) => {
    await setSavedLanguageCode(code);
    setLocale(code);
    bump();
  };

  const locale = getLocale();

  const subscriptionLabel = isLifetime
    ? t('settings.statusLifetime')
    : isPro
      ? t('settings.statusPro')
      : t('settings.statusFree');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: surfaceBg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: headline }]}>{t('settings.title')}</Text>

        <Text style={[styles.sectionHeading, { color: muted }]}>{t('settings.sectionAppearance')}</Text>
        <Text style={[styles.sectionLabel, { color: muted }]}>{t('settings.appearanceLabel')}</Text>
        <View style={styles.rowGap}>
          {THEME_OPTIONS.map(({ value, labelKey }) => {
            const sel = themePref === value;
            return (
              <Pressable
                key={value}
                onPress={() => void selectTheme(value)}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                style={[
                  styles.pillThird,
                  { backgroundColor: inactiveBtnBg, borderColor: p.border },
                  sel && styles.pillSelected,
                ]}
              >
                <Text style={[styles.pillText, { color: sel ? colors.white : headline }]}>{t(labelKey)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionHeading, styles.sectionSpacer, { color: muted }]}>
          {t('settings.sectionLanguage')}
        </Text>
        <View style={styles.langGrid}>
          {LANGUAGE_OPTIONS.map(({ code, labelKey }) => {
            const sel = locale === code;
            return (
              <Pressable
                key={code}
                onPress={() => void selectLanguage(code)}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                style={[
                  styles.langCell,
                  { backgroundColor: inactiveBtnBg, borderColor: p.border },
                  sel && styles.pillSelected,
                ]}
              >
                <Text style={[styles.langLabel, { color: sel ? colors.white : headline }]} numberOfLines={1}>
                  {t(labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionHeading, styles.sectionSpacer, { color: muted }]}>
          {t('settings.tipsTitle')}
        </Text>
        <View style={[styles.tipCard, { backgroundColor: cardBg, borderColor: p.border }]}>
          <Text style={[styles.tipTitle, { color: headline }]}>{t('settings.importTipTitle')}</Text>
          <Text style={[styles.tipBody, { color: muted }]}>{t('settings.importTipBody')}</Text>
        </View>

        <Text style={[styles.sectionHeading, styles.sectionSpacer, { color: muted }]}>
          {t('settings.sectionAbout')}
        </Text>
        <View style={[styles.aboutCard, { backgroundColor: cardBg, borderColor: p.border }]}>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutKey, { color: muted }]}>{t('settings.appNameLabel')}</Text>
            <Text style={[styles.aboutVal, { color: headline }]}>{t('settings.appName')}</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutKey, { color: muted }]}>{t('settings.versionLabel')}</Text>
            <Text style={[styles.aboutVal, { color: headline }]}>{APP_VERSION}</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutKey, { color: muted }]}>{t('settings.statusLabel')}</Text>
            <Text style={[styles.aboutVal, { color: headline }]}>{subscriptionLabel}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 22,
    letterSpacing: -0.3,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionSpacer: {
    marginTop: 26,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  rowGap: {
    flexDirection: 'row',
    columnGap: 8,
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
  },
  pillThird: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 46,
  },
  pillSelected: {
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDark,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 10,
    rowGap: 10,
    justifyContent: 'space-between',
  },
  langCell: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 48,
  },
  langLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  tipCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  tipBody: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '500',
  },
  aboutCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    rowGap: 12,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutKey: {
    fontSize: 15,
    fontWeight: '600',
  },
  aboutVal: {
    fontSize: 15,
    fontWeight: '700',
  },
});
