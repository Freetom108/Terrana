import { colors } from '../constants/colors';
import { usePro } from '../hooks/usePro';
import { useThemePalette } from '../hooks/useThemePalette';
import { t } from '../services/i18n/i18n';
import {
  fetchPaywallPriceStrings,
  isPurchasesCancelError,
  purchaseTerranaLifetime,
  purchaseTerranaPro,
} from '../services/purchase/iap';
import {
  restorePurchasesWithAlerts,
  showPurchaseFailureAlert,
} from '../services/purchase/restorePurchasesFlow';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type CellValue = string | boolean;

interface FeatureRow {
  labelKey: string;
  free: CellValue;
  pro: CellValue;
  lifetime: CellValue;
}

// ─── Feature table data ───────────────────────────────────────────────────────

const FEATURES: FeatureRow[] = [
  {
    labelKey: 'paywall.featureProducts',
    free: '10',
    pro: '100',
    lifetime: '1000',
  },
  {
    labelKey: 'paywall.featureBlends',
    free: '10',
    pro: '100',
    lifetime: '1000',
  },
  {
    labelKey: 'paywall.featureAiImport',
    free: '10',
    pro: '100',
    lifetime: '1000',
  },
  {
    labelKey: 'paywall.featureSharing',
    free: true,
    pro: true,
    lifetime: true,
  },
  {
    labelKey: 'paywall.featurePdf',
    free: true,
    pro: true,
    lifetime: true,
  },
  {
    labelKey: 'paywall.featureCollection',
    free: true,
    pro: true,
    lifetime: true,
  },
  {
    labelKey: 'paywall.featureInventory',
    free: true,
    pro: true,
    lifetime: true,
  },
  {
    labelKey: 'paywall.featureBackup',
    free: true,
    pro: true,
    lifetime: true,
  },
];

// ─── Cell renderer ────────────────────────────────────────────────────────────

function CellContent({ value, highlight }: { value: CellValue; highlight: boolean }) {
  if (typeof value === 'boolean') {
    return (
      <Text style={[styles.cellIcon, highlight && styles.cellIconHighlight]}>
        {value ? '✓' : '✗'}
      </Text>
    );
  }
  return (
    <Text style={[styles.cellText, highlight && styles.cellTextHighlight]}>{value}</Text>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const p = useThemePalette();
  const insets = useSafeAreaInsets();
  const { reload } = usePro();
  const [iapBusy, setIapBusy] = useState<'idle' | 'pro' | 'lifetime' | 'restore'>('idle');
  const [prices, setPrices] = useState<{ pro: string | null; lifetime: string | null }>({
    pro: null,
    lifetime: null,
  });
  const [pricesLoading, setPricesLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setPricesLoading(true);
    fetchPaywallPriceStrings()
      .then((result) => {
        if (active) setPrices(result);
      })
      .catch(() => {
        if (active) setPrices({ pro: null, lifetime: null });
      })
      .finally(() => {
        if (active) setPricesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleBuyPro = useCallback(async () => {
    if (iapBusy !== 'idle') return;
    setIapBusy('pro');
    try {
      await purchaseTerranaPro();
      await reload();
      router.back();
    } catch (e) {
      if (isPurchasesCancelError(e)) return;
      showPurchaseFailureAlert(e);
    } finally {
      setIapBusy('idle');
    }
  }, [iapBusy, reload]);

  const handleBuyLifetime = useCallback(async () => {
    if (iapBusy !== 'idle') return;
    setIapBusy('lifetime');
    try {
      await purchaseTerranaLifetime();
      await reload();
      router.back();
    } catch (e) {
      if (isPurchasesCancelError(e)) return;
      showPurchaseFailureAlert(e);
    } finally {
      setIapBusy('idle');
    }
  }, [iapBusy, reload]);

  const handleRestore = useCallback(async () => {
    if (iapBusy !== 'idle') return;
    setIapBusy('restore');
    try {
      await restorePurchasesWithAlerts({
        reload,
        onSuccessNavigateBack: () => router.back(),
      });
    } finally {
      setIapBusy('idle');
    }
  }, [iapBusy, reload]);

  return (
    <View style={[styles.root, { backgroundColor: p.surface }]}>
      {/* ── Header gradient ── */}
      <LinearGradient
        colors={[colors.sageDark, colors.sage]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.closeBtn}
          hitSlop={12}
          disabled={iapBusy !== 'idle'}
          accessibilityRole="button"
          accessibilityLabel={t('general.closePaywall') as string}
        >
          <Ionicons name="close" size={26} color={colors.white} />
        </Pressable>

        <Text style={styles.headerEmoji}>🌿</Text>
        <Text style={styles.headerTitle}>{t('paywall.title') as string}</Text>
        <Text style={styles.headerSubtitle}>{t('paywall.headerSubtitle') as string}</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Feature comparison table ── */}
        <View style={[styles.tableCard, { backgroundColor: p.card, borderColor: p.border }]}>
          {/* Table header */}
          <View style={styles.tableRow}>
            <View style={styles.colFeature} />
            <View style={[styles.colPlan, styles.colFree]}>
              <Text style={[styles.planLabel, { color: p.muted }]}>
                {t('paywall.free') as string}
              </Text>
            </View>
            <View style={[styles.colPlan, styles.colPro]}>
              <Text style={[styles.planLabel, styles.planLabelPro]}>
                {t('paywall.pro') as string}
              </Text>
            </View>
            <View style={[styles.colPlan, styles.colLifetime]}>
              <Text style={[styles.planLabel, styles.planLabelLifetime]}>
                {t('paywall.lifetimeCol') as string}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: p.border }]} />

          {/* Feature rows */}
          {FEATURES.map((row, idx) => (
            <View
              key={row.labelKey}
              style={[
                styles.tableRow,
                styles.featureRow,
                idx % 2 === 1 && { backgroundColor: p.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)' },
              ]}
            >
              <View style={styles.colFeature}>
                <Text style={[styles.featureLabel, { color: p.text }]} numberOfLines={2}>
                  {t(row.labelKey) as string}
                </Text>
              </View>
              <View style={[styles.colPlan, styles.colFree]}>
                <CellContent value={row.free} highlight={false} />
              </View>
              <View style={[styles.colPlan, styles.colPro]}>
                <CellContent value={row.pro} highlight={true} />
              </View>
              <View style={[styles.colPlan, styles.colLifetime]}>
                <CellContent value={row.lifetime} highlight={true} />
              </View>
            </View>
          ))}
        </View>

        {/* ── Buy buttons ── */}
        <View style={styles.buttonsSection}>
          {/* Pro button */}
          <Pressable
            style={({ pressed }) => [
              styles.buyBtn,
              styles.buyBtnPro,
              pressed && styles.buyBtnPressed,
              iapBusy !== 'idle' && styles.buyBtnDisabled,
            ]}
            onPress={() => void handleBuyPro()}
            disabled={iapBusy !== 'idle'}
            accessibilityRole="button"
          >
            {iapBusy === 'pro' ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Text style={styles.buyBtnTitle}>{t('paywall.buyPro') as string}</Text>
                {pricesLoading ? (
                  <ActivityIndicator
                    color="rgba(255,255,255,0.82)"
                    size="small"
                    style={styles.buyBtnPriceLoader}
                  />
                ) : prices.pro ? (
                  <Text style={styles.buyBtnPrice}>
                    {t('paywall.buyProPrice', { price: prices.pro }) as string}
                  </Text>
                ) : null}
              </>
            )}
          </Pressable>

          {/* Lifetime button */}
          <Pressable
            style={({ pressed }) => [
              styles.buyBtn,
              styles.buyBtnLifetime,
              pressed && styles.buyBtnPressed,
              iapBusy !== 'idle' && styles.buyBtnDisabled,
            ]}
            onPress={() => void handleBuyLifetime()}
            disabled={iapBusy !== 'idle'}
            accessibilityRole="button"
          >
            {iapBusy === 'lifetime' ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Text style={styles.buyBtnTitle}>{t('paywall.buyLifetime') as string}</Text>
                {pricesLoading ? (
                  <ActivityIndicator
                    color="rgba(255,255,255,0.82)"
                    size="small"
                    style={styles.buyBtnPriceLoader}
                  />
                ) : prices.lifetime ? (
                  <Text style={styles.buyBtnPrice}>
                    {t('paywall.buyLifetimePrice', { price: prices.lifetime }) as string}
                  </Text>
                ) : null}
              </>
            )}
          </Pressable>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Pressable
            onPress={() => void handleRestore()}
            hitSlop={8}
            disabled={iapBusy !== 'idle'}
            accessibilityRole="button"
            accessibilityLabel={t('paywall.restore') as string}
          >
            {iapBusy === 'restore' ? (
              <ActivityIndicator color={p.secondaryBtnLabel} size="small" />
            ) : (
              <Text style={[styles.footerLink, { color: p.secondaryBtnLabel }]}>
                {t('paywall.restore') as string}
              </Text>
            )}
          </Pressable>

          <Text style={[styles.footerNote, { color: p.muted }]}>
            {t('paywall.noSubscription') as string}
          </Text>

          <View style={styles.legalRow}>
            <Pressable
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel={t('paywall.privacy') as string}
              onPress={() =>
                void Linking.openURL('https://freetom108.github.io/terrana-privacy-policy/')
              }
            >
              <Text style={[styles.footerLink, { color: p.muted }]}>
                {t('paywall.privacy') as string}
              </Text>
            </Pressable>
            <Text style={[styles.footerDot, { color: p.muted }]}>·</Text>
            <Pressable
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel={t('paywall.terms') as string}
              onPress={() => void Linking.openURL('https://freetom108.github.io/terrana-terms/')}
            >
              <Text style={[styles.footerLink, { color: p.muted }]}>
                {t('paywall.terms') as string}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  /* Header */
  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 10,
  },
  headerEmoji: {
    fontSize: 52,
    marginBottom: 8,
    lineHeight: 60,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.sageLight,
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 16,
  },

  /* Scroll */
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  /* Feature table */
  tableCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureRow: {
    minHeight: 40,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 0,
  },
  colFeature: {
    flex: 2.4,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
  },
  colPlan: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  colFree: {},
  colPro: {
    backgroundColor: 'rgba(122,158,126,0.10)',
  },
  colLifetime: {
    backgroundColor: 'rgba(74,107,78,0.12)',
  },
  planLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingVertical: 8,
  },
  planLabelPro: {
    color: colors.sage,
  },
  planLabelLifetime: {
    color: colors.sageDark,
  },
  featureLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  cellIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B0B0B0',
  },
  cellIconHighlight: {
    color: colors.sageDark,
  },
  cellText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B0B0B0',
  },
  cellTextHighlight: {
    color: colors.sageDark,
  },

  /* Buy buttons */
  buttonsSection: {
    gap: 10,
    marginBottom: 20,
  },
  buyBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  buyBtnPro: {
    backgroundColor: colors.sage,
  },
  buyBtnLifetime: {
    backgroundColor: colors.sageDark,
  },
  buyBtnPressed: {
    opacity: 0.82,
  },
  buyBtnDisabled: {
    opacity: 0.65,
  },
  buyBtnTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
    textAlign: 'center',
  },
  buyBtnPrice: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  buyBtnPriceLoader: {
    marginTop: 3,
    height: 16,
  },
  /* Footer */
  footer: {
    alignItems: 'center',
    gap: 10,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footerNote: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerDot: {
    fontSize: 13,
  },
});
