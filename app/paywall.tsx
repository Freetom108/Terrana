import { colors } from '../constants/colors';
import {
  FREE_BLEND_LIMIT,
  FREE_IMPORT_LIMIT,
  FREE_PRODUCT_LIMIT,
} from '../constants/limits';
import { useThemePalette } from '../hooks/useThemePalette';
import { t } from '../services/i18n/i18n';
import { setIsLifetime, setIsPro } from '../services/storage/settings';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback } from 'react';
import {
  Alert,
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
    free: String(FREE_PRODUCT_LIMIT),
    pro: '∞',
    lifetime: '∞',
  },
  {
    labelKey: 'paywall.featureBlends',
    free: String(FREE_BLEND_LIMIT),
    pro: '∞',
    lifetime: '∞',
  },
  {
    labelKey: 'paywall.featureAiImport',
    free: String(FREE_IMPORT_LIMIT),
    pro: '∞',
    lifetime: '∞',
  },
  {
    labelKey: 'paywall.featureSharing',
    free: false,
    pro: true,
    lifetime: true,
  },
  {
    labelKey: 'paywall.featurePdf',
    free: false,
    pro: false,
    lifetime: true,
  },
  {
    labelKey: 'paywall.featurePrint',
    free: false,
    pro: false,
    lifetime: true,
  },
  {
    labelKey: 'paywall.featureInventory',
    free: false,
    pro: false,
    lifetime: true,
  },
];

const SHARE_METHODS: Array<{ icon: 'logo-whatsapp' | 'mail-outline' | 'chatbubble-outline' | 'share-outline'; label: string }> = [
  { icon: 'logo-whatsapp', label: 'WhatsApp' },
  { icon: 'mail-outline', label: 'E-Mail' },
  { icon: 'chatbubble-outline', label: 'SMS' },
  { icon: 'share-outline', label: 'More' },
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

  const handleBuyPro = useCallback(async () => {
    // TODO: Replace with RevenueCat purchase flow
    await setIsPro(true);
    Alert.alert('Pro', 'Pro activated (placeholder).');
    router.back();
  }, []);

  const handleBuyLifetime = useCallback(async () => {
    // TODO: Replace with RevenueCat purchase flow
    await setIsLifetime(true);
    await setIsPro(true);
    Alert.alert('Lifetime', 'Lifetime activated (placeholder).');
    router.back();
  }, []);

  const handleRestore = useCallback(() => {
    // TODO: Replace with RevenueCat restorePurchases()
    Alert.alert(t('paywall.restore') as string, 'Restore not yet implemented.');
  }, []);

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
          accessibilityRole="button"
          accessibilityLabel="Close"
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
                <Text style={[styles.featureLabel, { color: p.text }]} numberOfLines={1}>
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

        {/* ── Sharing highlight card ── */}
        <View
          style={[
            styles.sharingCard,
            {
              backgroundColor: p.isDark ? '#2C3B2E' : 'rgba(122,158,126,0.1)',
              borderColor: colors.sage,
            },
          ]}
        >
          <View style={styles.sharingHeader}>
            <View style={styles.sharingTitleRow}>
              <Text style={[styles.sharingTitle, { color: p.text }]}>
                {t('paywall.sharing') as string}
              </Text>
              <View style={styles.sharingBadge}>
                <Text style={styles.sharingBadgeText}>{t('paywall.sharingBadge') as string}</Text>
              </View>
            </View>
            <Text style={[styles.sharingDesc, { color: p.muted }]}>
              {t('paywall.sharingDesc') as string}
            </Text>
          </View>

          <View style={styles.shareMethodsRow}>
            {SHARE_METHODS.map((method) => (
              <View key={method.label} style={styles.shareMethod}>
                <View style={[styles.shareIconWrap, { backgroundColor: p.chipBg }]}>
                  <Ionicons name={method.icon} size={22} color={colors.sageDark} />
                </View>
                <Text style={[styles.shareMethodLabel, { color: p.muted }]}>{method.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Buy buttons ── */}
        <View style={styles.buttonsSection}>
          {/* Pro button */}
          <Pressable
            style={({ pressed }) => [styles.buyBtn, styles.buyBtnPro, pressed && styles.buyBtnPressed]}
            onPress={() => void handleBuyPro()}
            accessibilityRole="button"
          >
            <Text style={styles.buyBtnTitle}>{t('paywall.buyPro') as string}</Text>
            <Text style={styles.buyBtnPrice}>{t('paywall.buyProPrice') as string}</Text>
          </Pressable>

          {/* Lifetime button — golden border + floating badge top-right */}
          <View style={styles.lifetimeWrap}>
            <Pressable
              style={({ pressed }) => [
                styles.buyBtn,
                styles.buyBtnLifetime,
                pressed && styles.buyBtnPressed,
              ]}
              onPress={() => void handleBuyLifetime()}
              accessibilityRole="button"
            >
              <Text style={styles.buyBtnTitle}>{t('paywall.buyLifetime') as string}</Text>
              <Text style={styles.buyBtnPrice}>{t('paywall.buyLifetimePrice') as string}</Text>
            </Pressable>
            <View style={styles.popularBadge} pointerEvents="none">
              <Text style={styles.popularBadgeText}>{t('paywall.mostPopular') as string}</Text>
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Pressable onPress={handleRestore} hitSlop={8}>
            <Text style={[styles.footerLink, { color: p.secondaryBtnLabel }]}>
              {t('paywall.restore') as string}
            </Text>
          </Pressable>

          <Text style={[styles.footerNote, { color: p.muted }]}>
            {t('paywall.noSubscription') as string}
          </Text>

          <View style={styles.legalRow}>
            <Pressable hitSlop={8}>
              <Text style={[styles.footerLink, { color: p.muted }]}>
                {t('paywall.privacy') as string}
              </Text>
            </Pressable>
            <Text style={[styles.footerDot, { color: p.muted }]}>·</Text>
            <Pressable hitSlop={8}>
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

  /* Sharing card */
  sharingCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
  },
  sharingHeader: {
    marginBottom: 14,
  },
  sharingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  sharingTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sharingBadge: {
    backgroundColor: colors.sage,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sharingBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  sharingDesc: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  shareMethodsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  shareMethod: {
    alignItems: 'center',
    gap: 6,
  },
  shareIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareMethodLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  /* Buy buttons */
  buttonsSection: {
    gap: 10,
    marginBottom: 20,
  },
  lifetimeWrap: {
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 14,
    backgroundColor: colors.earth,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 2,
  },
  popularBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
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
    borderWidth: 2,
    borderColor: '#C9A84C',
  },
  buyBtnPressed: {
    opacity: 0.82,
  },
  buyBtnTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
  },
  buyBtnPrice: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '500',
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
