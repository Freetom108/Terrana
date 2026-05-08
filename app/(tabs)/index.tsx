import { HomeBlendCard, HomeProductCard } from '../../components/home/HomeListCards';
import { EmptyState } from '../../components/ui/EmptyState';
import { colors } from '../../constants/colors';
import {
  FREE_BLEND_LIMIT,
  FREE_BLEND_WARN,
  FREE_PRODUCT_LIMIT,
  FREE_PRODUCT_WARN,
} from '../../constants/limits';
import { useBlends } from '../../hooks/useBlends';
import { usePro } from '../../hooks/usePro';
import { useProducts } from '../../hooks/useProducts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { subscribeLocale, t } from '../../services/i18n/i18n';
import type { Product } from '../../types/product';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LAST_USED_LIMIT = 3;
const BLENDS_LIMIT = 3;

function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'home.greetingMorning';
  if (h >= 11 && h < 17) return 'home.greetingAfternoon';
  if (h >= 17 && h < 22) return 'home.greetingEvening';
  return 'home.greetingNight';
}
function sortByUpdatedDesc(a: Product, b: Product): number {
  const ta = Date.parse(a.updatedAt || a.createdAt);
  const tb = Date.parse(b.updatedAt || b.createdAt);
  return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
}

function sortByName(a: Product, b: Product): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

export default function HomeTab() {
  const insets = useSafeAreaInsets();
  const palette = useThemePalette();
  const p = palette;
  const router = useRouter();
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeLocale(redraw), []);
  const { products, refreshProducts } = useProducts();
  const { blends, refreshBlends } = useBlends();
  const { isPro, isLifetime, reload: reloadPro } = usePro();

  useFocusEffect(
    useCallback(() => {
      void refreshProducts();
      void refreshBlends();
      void reloadPro();
    }, [refreshProducts, refreshBlends, reloadPro]),
  );

  const [greetingKey, setGreetingKey] = useState(getGreetingKey);

  useFocusEffect(
    useCallback(() => {
      setGreetingKey(getGreetingKey());
    }, []),
  );

  const isFreeUser = !isPro && !isLifetime;

  const productCount = products.length;
  const blendCount = blends.length;

  const statsSubtitle = useMemo(() => {
    const productLabel =
      productCount === 1
        ? (t('home.statProduct') as string)
        : (t('home.statProducts', { count: productCount }) as string);
    const blendLabel =
      blendCount === 1
        ? (t('home.statBlend') as string)
        : (t('home.statBlends', { count: blendCount }) as string);
    return `${productLabel} · ${blendLabel}`;
  }, [productCount, blendCount]);

  const byUpdated = useMemo(() => [...products].sort(sortByUpdatedDesc), [products]);
  const byName = useMemo(() => [...products].sort(sortByName), [products]);

  const recentlyUsed = useMemo(() => {
    const withLast = products.filter((prod) => prod.lastUsed);
    if (withLast.length === 0) {
      return byUpdated;
    }
    return [...withLast].sort((a, b) =>
      String(b.lastUsed ?? '').localeCompare(String(a.lastUsed ?? '')),
    );
  }, [products, byUpdated]);

  const recentlyUsedPreview = recentlyUsed.slice(0, LAST_USED_LIMIT);
  const blendsPreview = blends.slice(0, BLENDS_LIMIT);

  const showMoreRecentlyUsed = recentlyUsed.length > LAST_USED_LIMIT;
  const showMoreBlends = blends.length > BLENDS_LIMIT;

  const showProductEmpty = productCount === 0;
  const showBlendEmpty = blendCount === 0;

  return (
    <View style={[styles.root, { backgroundColor: p.surface }]}>
      <LinearGradient
        colors={[colors.sageDark, colors.sage]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <Text style={styles.greeting}>{t(greetingKey)}</Text>
        <Text style={styles.statsLine}>{statsSubtitle}</Text>

        <Link href="/search" asChild>
          <Pressable style={styles.searchShell} accessibilityRole="button">
            <Text style={styles.searchIcon}>🔍</Text>
            <Text style={styles.searchPlaceholder}>{t('home.searchPlaceholder')}</Text>
          </Pressable>
        </Link>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollInner, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, styles.sectionTitleFlex, { color: p.text }]}>
              {t('home.lastUsed')}
            </Text>
            {!showProductEmpty && showMoreRecentlyUsed ? (
              <Link href="/recent-products" asChild>
                <Pressable hitSlop={8} accessibilityRole="link">
                  <Text style={[styles.viewAll, { color: p.secondaryBtnLabel }]}>{t('home.viewAll')}</Text>
                </Pressable>
              </Link>
            ) : null}
          </View>
          {showProductEmpty ? (
            <EmptyState
              title={t('home.emptyProductsTitle')}
              message={t('home.emptyProductsMessage')}
              emoji="🕐"
            />
          ) : (
            <View style={styles.productStack}>
              {recentlyUsedPreview.map((prod) => (
                <HomeProductCard key={`recent-${prod.id}`} product={prod} palette={palette} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, styles.sectionTitleFlex, { color: p.text }]}>
              {t('home.allProducts')}
            </Text>
          </View>
          {showProductEmpty ? (
            <EmptyState
              title={t('home.emptyProductsTitle')}
              message={t('home.emptyProductsMessage')}
              emoji="📦"
            />
          ) : (
            <View style={styles.productStack}>
              {byName.map((prod) => (
                <HomeProductCard key={`all-${prod.id}`} product={prod} palette={palette} />
              ))}
            </View>
          )}
          {isFreeUser && productCount >= FREE_PRODUCT_WARN ? (
            <Pressable
              style={[styles.limitBanner, { backgroundColor: p.isDark ? '#3D2E1A' : '#FFF3E0', borderColor: '#E6A817' }]}
              onPress={() => router.push('/paywall')}
              accessibilityRole="button"
            >
              <Text style={[styles.limitBannerText, { color: p.isDark ? '#FFD580' : '#8A5A00' }]}>
                {t('limits.productWarning', { used: productCount, max: FREE_PRODUCT_LIMIT }) as string}
              </Text>
              <Text style={[styles.limitBannerLink, { color: p.isDark ? '#FFD580' : '#8A5A00' }]}>
                {t('limits.upgradeLink') as string}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, styles.sectionTitleFlex, { color: p.text }]}>
              {t('home.myBlends')}
            </Text>
            {!showBlendEmpty && showMoreBlends ? (
              <Link href="/all-blends" asChild>
                <Pressable hitSlop={8} accessibilityRole="link">
                  <Text style={[styles.viewAll, { color: p.secondaryBtnLabel }]}>{t('home.viewAll')}</Text>
                </Pressable>
              </Link>
            ) : null}
          </View>
          {showBlendEmpty ? (
            <Pressable
              onPress={() => router.push('/blend/new')}
              accessibilityRole="button"
            >
              <EmptyState
                title={t('home.emptyBlendsTitle')}
                message={t('home.emptyBlendsMessage')}
                emoji="🧪"
              />
            </Pressable>
          ) : (
            <View style={styles.productStack}>
              {blendsPreview.map((blend) => (
                <HomeBlendCard key={blend.id} blend={blend} palette={palette} />
              ))}
            </View>
          )}
          {isFreeUser && blendCount >= FREE_BLEND_WARN ? (
            <Pressable
              style={[styles.limitBanner, { backgroundColor: p.isDark ? '#3D2E1A' : '#FFF3E0', borderColor: '#E6A817' }]}
              onPress={() => router.push('/paywall')}
              accessibilityRole="button"
            >
              <Text style={[styles.limitBannerText, { color: p.isDark ? '#FFD580' : '#8A5A00' }]}>
                {t('limits.blendWarning', { used: blendCount, max: FREE_BLEND_LIMIT }) as string}
              </Text>
              <Text style={[styles.limitBannerLink, { color: p.isDark ? '#FFD580' : '#8A5A00' }]}>
                {t('limits.upgradeLink') as string}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 6,
  },
  statsLine: {
    fontSize: 15,
    color: colors.sageLight,
    marginBottom: 18,
    fontWeight: '500',
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  searchIcon: {
    fontSize: 18,
    opacity: 0.55,
    marginRight: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: colors.mid,
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitleFlex: {
    flex: 1,
  },
  viewAll: {
    fontSize: 15,
    fontWeight: '600',
  },
  productStack: {
    gap: 10,
  },
  limitBanner: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  limitBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  limitBannerLink: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 0,
  },
});
