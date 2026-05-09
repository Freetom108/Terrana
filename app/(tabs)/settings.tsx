import { colors } from '../../constants/colors';
import type { ThemePreference } from '../../constants/themePreference';
import {
  applyThemePreference,
} from '../../constants/themePreference';
import { usePro } from '../../hooks/usePro';
import { useProducts } from '../../hooks/useProducts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { getLocale, setLocale, t } from '../../services/i18n/i18n';
import { exportCollectionAsPDF } from '../../services/export/pdfExport';
import { createBackup, restoreBackup } from '../../services/storage/backup';
import {
  disableBackupReminder,
  enableBackupReminder,
  isBackupReminderEnabled,
} from '../../services/notifications';
import {
  getThemePreference,
  setSavedLanguageCode,
  setThemePreference,
} from '../../services/storage/settings';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useReducer, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const APP_VERSION = '1.0.0';

const FAQ_ITEMS = [
  { q: 'faq.q1', a: 'faq.a1', btnKey: undefined },
  { q: 'faq.q3', a: 'faq.a3', btnKey: undefined },
  { q: 'faq.q4', a: 'faq.a4', btnKey: undefined },
  { q: 'faq.q5', a: 'faq.a5', btnKey: undefined },
  { q: 'faq.q6', a: 'faq.a6', btnKey: 'faq.a6Btn' },
  { q: 'faq.q7', a: 'faq.a7', btnKey: undefined },
  { q: 'faq.q8', a: 'faq.a8', btnKey: undefined },
] satisfies Array<{ q: string; a: string; btnKey: string | undefined }>;

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
  const router = useRouter();
  const { isPro, isLifetime, reload } = usePro();
  const { products, refreshProducts } = useProducts();
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);

  const [themePref, setThemePrefState] = useState<ThemePreference>('auto');

  useFocusEffect(
    useCallback(() => {
      void reload();
      void getThemePreference().then(setThemePrefState);
      void refreshProducts();
      void isBackupReminderEnabled().then(setReminderEnabled);
    }, [reload, refreshProducts]),
  );

  const handleExportCollection = useCallback(async () => {
    if (!isPro && !isLifetime) {
      router.push('/paywall');
      return;
    }
    if (products.length === 0) {
      Alert.alert(t('home.emptyProductsTitle') as string, t('home.emptyProductsMessage') as string);
      return;
    }
    setExportingPdf(true);
    try {
      await exportCollectionAsPDF(products);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('PDF', msg);
    } finally {
      setExportingPdf(false);
    }
  }, [isPro, isLifetime, products, router]);

  const handleBackup = useCallback(async () => {
    setBackingUp(true);
    try {
      await createBackup();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('backup.errorTitle') as string, msg);
    } finally {
      setBackingUp(false);
    }
  }, []);

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      const completed = await restoreBackup();
      if (completed) {
        router.replace('/(tabs)');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('backup.errorTitle') as string, msg);
    } finally {
      setRestoring(false);
    }
  }, [router]);

  const handleToggleReminder = useCallback(async (value: boolean) => {
    if (value) {
      const granted = await enableBackupReminder();
      if (!granted) {
        Alert.alert(
          t('settings.backupReminderToggle') as string,
          t('notifications.permissionDenied') as string,
        );
        return;
      }
    } else {
      await disableBackupReminder();
    }
    setReminderEnabled(value);
  }, []);

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

        {/* ── Upgrade card ── */}
        <Text style={[styles.sectionHeading, { color: muted }]}>{t('settings.sectionUpgrade')}</Text>
        {isLifetime ? (
          <View style={[styles.upgradeCard, styles.upgradeCardLifetime, { borderColor: colors.sageDark }]}>
            <Text style={[styles.upgradeTitle, { color: colors.sageDark }]}>
              {t('settings.upgradeLifetimeTitle') as string}
            </Text>
            <Text style={[styles.upgradeHint, { color: p.muted }]}>
              {t('settings.upgradeLifetimeHint') as string}
            </Text>
          </View>
        ) : isPro ? (
          <View style={[styles.upgradeCard, styles.upgradeCardPro, { borderColor: colors.sage }]}>
            <Text style={[styles.upgradeTitle, { color: colors.sage }]}>
              {t('settings.upgradeProTitle') as string}
            </Text>
            <Text style={[styles.upgradeHint, { color: p.muted }]}>
              {t('settings.upgradeProHint') as string}
            </Text>
            <Pressable
              style={[styles.upgradeBtn, styles.upgradeBtnPro]}
              onPress={() => router.push('/paywall')}
              accessibilityRole="button"
            >
              <Text style={styles.upgradeBtnText}>{t('settings.upgradeProButton') as string}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.upgradeCard, styles.upgradeCardFree, { borderColor: colors.sage }]}>
            <Text style={[styles.upgradeTitle, { color: p.text }]}>
              {t('settings.upgradeFreeTitle') as string}
            </Text>
            <Text style={[styles.upgradeFeatures, { color: p.muted }]}>
              {t('settings.upgradeFreeFeatures') as string}
            </Text>
            <Pressable
              style={[styles.upgradeBtn, styles.upgradeBtnFree]}
              onPress={() => router.push('/paywall')}
              accessibilityRole="button"
            >
              <Text style={styles.upgradeBtnText}>{t('settings.upgradeFreeButton') as string}</Text>
            </Pressable>
          </View>
        )}

        <Text style={[styles.sectionHeading, styles.sectionSpacer, { color: muted }]}>{t('settings.sectionAppearance')}</Text>
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

        {/* ── FAQ ── */}
        <Text style={[styles.sectionHeading, styles.sectionSpacer, { color: muted }]}>
          {t('settings.sectionFaq')}
        </Text>
        <View style={[styles.faqCard, { backgroundColor: cardBg, borderColor: p.border }]}>
          {FAQ_ITEMS.map(({ q, a, btnKey }, idx) => {
            const isOpen = openFaq === idx;
            const isLast = idx === FAQ_ITEMS.length - 1;
            return (
              <View key={q}>
                <Pressable
                  style={styles.faqRow}
                  onPress={() => setOpenFaq(isOpen ? null : idx)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                >
                  <Text style={[styles.faqQuestion, { color: headline }]} numberOfLines={isOpen ? undefined : 2}>
                    {t(q) as string}
                  </Text>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={muted}
                    style={styles.faqChevron}
                  />
                </Pressable>
                {isOpen ? (
                  <View style={styles.faqAnswerWrap}>
                    <Text style={[styles.faqAnswer, { color: muted }]}>{t(a) as string}</Text>
                    {btnKey ? (
                      <Pressable
                        onPress={() => router.push('/paywall')}
                        style={[styles.faqBtn, { backgroundColor: colors.sage }]}
                        accessibilityRole="button"
                      >
                        <Text style={styles.faqBtnText}>{t(btnKey) as string}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                {!isLast ? (
                  <View style={[styles.faqDivider, { backgroundColor: p.border }]} />
                ) : null}
              </View>
            );
          })}
        </View>

        {/* ── Backup & Restore ── */}
        <Text style={[styles.sectionHeading, styles.sectionSpacer, { color: muted }]}>
          {t('settings.sectionBackup')}
        </Text>
        <View style={[styles.aboutCard, { backgroundColor: cardBg, borderColor: p.border }]}>
          {isLifetime ? (
            <>
              {/* Backup */}
              <Pressable
                style={styles.exportRow}
                onPress={() => void handleBackup()}
                accessibilityRole="button"
                disabled={backingUp}
              >
                <View style={styles.exportRowLeft}>
                  <Ionicons name="cloud-upload-outline" size={22} color={colors.sageDark} />
                  <View style={styles.exportRowText}>
                    <Text style={[styles.exportRowTitle, { color: headline, opacity: backingUp ? 0.5 : 1 }]}>
                      {t('settings.backupCreate') as string}
                    </Text>
                    <Text style={[styles.exportRowHint, { color: muted }]}>
                      {t('settings.backupCreateHint') as string}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={muted} />
              </Pressable>

              <View style={[styles.faqDivider, { backgroundColor: p.border }]} />

              {/* Restore */}
              <Pressable
                style={styles.exportRow}
                onPress={() => void handleRestore()}
                accessibilityRole="button"
                disabled={restoring}
              >
                <View style={styles.exportRowLeft}>
                  <Ionicons name="cloud-download-outline" size={22} color={colors.sageDark} />
                  <View style={styles.exportRowText}>
                    <Text style={[styles.exportRowTitle, { color: headline, opacity: restoring ? 0.5 : 1 }]}>
                      {t('settings.backupRestore') as string}
                    </Text>
                    <Text style={[styles.exportRowHint, { color: muted }]}>
                      {t('settings.backupRestoreHint') as string}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={muted} />
              </Pressable>

              <View style={[styles.faqDivider, { backgroundColor: p.border }]} />

              {/* Weekly reminder toggle */}
              <View style={styles.exportRow}>
                <View style={styles.exportRowLeft}>
                  <Ionicons name="notifications-outline" size={22} color={colors.sageDark} />
                  <View style={styles.exportRowText}>
                    <Text style={[styles.exportRowTitle, { color: headline }]}>
                      {t('settings.backupReminderToggle') as string}
                    </Text>
                    <Text style={[styles.exportRowHint, { color: muted }]}>
                      {t('settings.backupReminderHint') as string}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={reminderEnabled}
                  onValueChange={(v) => void handleToggleReminder(v)}
                  trackColor={{ false: p.border, true: colors.sage }}
                  thumbColor={reminderEnabled ? colors.sageDark : p.muted}
                />
              </View>
            </>
          ) : (
            <Pressable
              style={styles.exportRow}
              onPress={() => router.push('/paywall')}
              accessibilityRole="button"
            >
              <View style={styles.exportRowLeft}>
                <Ionicons name="lock-closed-outline" size={22} color={muted} />
                <View style={styles.exportRowText}>
                  <Text style={[styles.exportRowTitle, { color: headline }]}>
                    {t('settings.backupCreate') as string}
                  </Text>
                  <Text style={[styles.exportRowHint, { color: muted }]}>
                    {t('settings.backupLockedHint') as string}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={muted} />
            </Pressable>
          )}
        </View>

        {/* ── Export ── */}
        <Text style={[styles.sectionHeading, styles.sectionSpacer, { color: muted }]}>
          {t('settings.sectionExport')}
        </Text>
        <View style={[styles.aboutCard, { backgroundColor: cardBg, borderColor: p.border }]}>
          <Pressable
            style={styles.exportRow}
            onPress={() => void handleExportCollection()}
            accessibilityRole="button"
            disabled={exportingPdf}
          >
            <View style={styles.exportRowLeft}>
              <Ionicons
                name="document-text-outline"
                size={22}
                color={isPro || isLifetime ? colors.sage : p.muted}
              />
              <View style={styles.exportRowText}>
                <Text style={[styles.exportRowTitle, { color: headline, opacity: exportingPdf ? 0.5 : 1 }]}>
                  {t('settings.exportCollection') as string}
                </Text>
                <Text style={[styles.exportRowHint, { color: muted }]}>
                  {t('settings.exportCollectionHint') as string}
                </Text>
              </View>
            </View>
            <Ionicons
              name={isPro || isLifetime ? 'chevron-forward' : 'lock-closed-outline'}
              size={18}
              color={muted}
            />
          </Pressable>
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

  /* Upgrade card */
  upgradeCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 4,
  },
  upgradeCardFree: {
    backgroundColor: 'rgba(122,158,126,0.10)',
  },
  upgradeCardPro: {
    backgroundColor: 'rgba(122,158,126,0.08)',
  },
  upgradeCardLifetime: {
    backgroundColor: 'rgba(74,107,78,0.10)',
  },
  upgradeTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  upgradeHint: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 12,
  },
  upgradeFeatures: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
  },
  upgradeBtn: {
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  upgradeBtnFree: {
    backgroundColor: colors.sage,
  },
  upgradeBtnPro: {
    backgroundColor: colors.sageDark,
  },
  upgradeBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },

  /* FAQ accordion */
  faqCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  faqChevron: {
    flexShrink: 0,
  },
  faqAnswerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  faqDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  faqBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  faqBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  exportRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  exportRowText: {
    flex: 1,
  },
  exportRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  exportRowHint: {
    fontSize: 12,
    fontWeight: '400',
  },
});
