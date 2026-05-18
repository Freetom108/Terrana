import { HomeBlendCard, HomeProductCard } from '../../components/home/HomeListCards';
import { EmptyState } from '../../components/ui/EmptyState';
import { colors } from '../../constants/colors';
import { toggleFavorite } from '../../services/storage/products';
import { FREE_BLEND_WARN, FREE_PRODUCT_WARN } from '../../constants/limits';
import { useBlends } from '../../hooks/useBlends';
import { usePro } from '../../hooks/usePro';
import { useProducts } from '../../hooks/useProducts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { getLocale, subscribeLocale, t } from '../../services/i18n/i18n';
import type { Blend } from '../../types/blend';
import type { Product } from '../../types/product';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import type { ListRenderItem } from 'react-native';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LAST_USED_LIMIT = 3;
const BLENDS_LIMIT = 3;

/** Virtual rows for home feed (sections + lists + banners). */
type HomeRow =
  | { rowId: 'sec-recent'; kind: 'sectionHeader'; title: string; viewAllHref: '/recent-products' | null }
  | { rowId: 'empty-recent-products'; kind: 'emptyProducts'; emoji: '🕐' | '📦' }
  | { rowId: string; kind: 'productRecent'; product: Product }
  | { rowId: 'sec-all-products'; kind: 'sectionHeaderAllProducts'; title: string }
  | { rowId: 'empty-all-products'; kind: 'emptyProducts'; emoji: '📦' }
  | { rowId: string; kind: 'productAll'; product: Product }
  | { rowId: 'banner-products'; kind: 'limitBanner'; banner: 'product' }
  | { rowId: 'sec-blends'; kind: 'sectionHeaderBlends'; title: string; viewAllHref: '/all-blends' | null }
  | { rowId: string; kind: 'blendPreview'; blend: Blend }
  | { rowId: 'empty-blends'; kind: 'emptyBlendsPressable' }
  | { rowId: 'banner-blends'; kind: 'limitBanner'; banner: 'blend' };

function rowStacksVertically(kind: HomeRow['kind']): boolean {
  return kind === 'productRecent' || kind === 'productAll' || kind === 'blendPreview';
}

function stackingGap(prev: HomeRow | undefined, cur: HomeRow): undefined | { marginTop: number } {
  if (!prev || !rowStacksVertically(cur.kind)) return undefined;
  if (!rowStacksVertically(prev.kind)) return undefined;
  return { marginTop: 10 };
}

function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'home.goodMorning';
  if (h >= 11 && h < 17) return 'home.goodAfternoon';
  if (h >= 17 && h < 22) return 'home.goodEvening';
  return 'home.goodNight';
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
  const localeTag = getLocale();

  const statsSubtitle = useMemo(() => {
    return t('home.stats', { products: productCount, blends: blendCount }) as string;
  }, [productCount, blendCount, localeTag]);

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

  const handleToggleFavorite = useCallback(
    async (id: string) => {
      await toggleFavorite(id);
      void refreshProducts();
    },
    [refreshProducts],
  );

  const showMoreRecentlyUsed = recentlyUsed.length > LAST_USED_LIMIT;
  const showMoreBlends = blends.length > BLENDS_LIMIT;

  const showProductEmpty = productCount === 0;
  const showBlendEmpty = blendCount === 0;

  const listData = useMemo((): HomeRow[] => {
    const rows: HomeRow[] = [];

    rows.push({
      rowId: 'sec-recent',
      kind: 'sectionHeader',
      title: t('home.lastUsed') as string,
      viewAllHref:
        !showProductEmpty && showMoreRecentlyUsed ? '/recent-products' : null,
    });
    if (showProductEmpty) {
      rows.push({ rowId: 'empty-recent-products', kind: 'emptyProducts', emoji: '🕐' });
    } else {
      for (const prod of recentlyUsedPreview) {
        rows.push({
          rowId: `prd-recent-${prod.id}`,
          kind: 'productRecent',
          product: prod,
        });
      }
    }

    rows.push({
      rowId: 'sec-all-products',
      kind: 'sectionHeaderAllProducts',
      title: t('home.allProducts') as string,
    });
    if (showProductEmpty) {
      rows.push({ rowId: 'empty-all-products', kind: 'emptyProducts', emoji: '📦' });
    } else {
      for (const prod of byName) {
        rows.push({ rowId: `prd-all-${prod.id}`, kind: 'productAll', product: prod });
      }
    }
    if (isFreeUser && productCount >= FREE_PRODUCT_WARN) {
      rows.push({ rowId: 'banner-products', kind: 'limitBanner', banner: 'product' });
    }

    rows.push({
      rowId: 'sec-blends',
      kind: 'sectionHeaderBlends',
      title: t('home.myBlends') as string,
      viewAllHref:
        !showBlendEmpty && showMoreBlends ? '/all-blends' : null,
    });
    if (showBlendEmpty) {
      rows.push({ rowId: 'empty-blends', kind: 'emptyBlendsPressable' });
    } else {
      for (const blend of blendsPreview) {
        rows.push({
          rowId: `blend-${blend.id}`,
          kind: 'blendPreview',
          blend,
        });
      }
    }
    if (isFreeUser && blendCount >= FREE_BLEND_WARN) {
      rows.push({ rowId: 'banner-blends', kind: 'limitBanner', banner: 'blend' });
    }

    return rows;
  }, [
    showProductEmpty,
    showBlendEmpty,
    showMoreRecentlyUsed,
    showMoreBlends,
    recentlyUsedPreview,
    byName,
    blendsPreview,
    isFreeUser,
    productCount,
    blendCount,
  ]);

  const listHeaderComponent = useMemo(
    () => (
      <View style={[styles.headerSafe, { paddingTop: insets.top + 6 }]}>
        <View style={[styles.homeHeaderCard, styles.homeHeaderCardTint, { borderColor: colors.sage }]}>
          <View style={styles.headerBrandRow}>
            <Text style={styles.headerBrandText}>{t('settings.appName')}</Text>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.headerAppIcon}
              accessibilityIgnoresInvertColors
            />
          </View>
          <Text style={[styles.headerGreeting, { color: p.muted }]}>{t(greetingKey)}</Text>
          <Text style={[styles.headerStats, { color: p.muted }]}>{statsSubtitle}</Text>
        </View>
      </View>
    ),
    [greetingKey, insets.top, statsSubtitle, p.muted, localeTag],
  );

  const renderHomeItem: ListRenderItem<HomeRow> = ({ item, index }) => {
    const prevRow = index > 0 ? listData[index - 1] : undefined;
    const gap = stackingGap(prevRow, item);

    let inner: ReactNode;

    switch (item.kind) {
      case 'sectionHeader':
        return (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, styles.sectionTitleFlex, { color: p.text }]}>
              {item.title}
            </Text>
            {item.viewAllHref ? (
              <Link href={item.viewAllHref} asChild>
                <Pressable hitSlop={8} accessibilityRole="link">
                  <Text style={[styles.viewAll, { color: p.secondaryBtnLabel }]}>
                    {t('home.viewAll')}
                  </Text>
                </Pressable>
              </Link>
            ) : null}
          </View>
        );
      case 'sectionHeaderAllProducts':
        return (
          <View style={[styles.sectionHeader, styles.sectionTopSpacing]}>
            <Text style={[styles.sectionTitle, styles.sectionTitleFlex, { color: p.text }]}>
              {item.title}
            </Text>
            <Link href="/product/new" asChild>
              <Pressable hitSlop={8} accessibilityRole="link">
                <Text style={[styles.addManual, { color: colors.sage }]}>
                  {t('home.addProductManually')}
                </Text>
              </Pressable>
            </Link>
          </View>
        );
      case 'sectionHeaderBlends':
        return (
          <View style={[styles.sectionHeader, styles.sectionTopSpacing]}>
            <Text style={[styles.sectionTitle, styles.sectionTitleFlex, { color: p.text }]}>
              {item.title}
            </Text>
            {item.viewAllHref ? (
              <Link href={item.viewAllHref} asChild>
                <Pressable hitSlop={8} accessibilityRole="link">
                  <Text style={[styles.viewAll, { color: p.secondaryBtnLabel }]}>
                    {t('home.viewAll')}
                  </Text>
                </Pressable>
              </Link>
            ) : null}
          </View>
        );
      case 'emptyProducts':
        return (
          <EmptyState
            title={t('home.emptyProductsTitle')}
            message={t('home.emptyProductsMessage')}
            emoji={item.emoji}
          />
        );
      case 'productRecent':
        inner = (
          <HomeProductCard
            product={item.product}
            palette={palette}
            onToggleFavorite={(id) => void handleToggleFavorite(id)}
          />
        );
        break;
      case 'productAll':
        inner = (
          <HomeProductCard
            product={item.product}
            palette={palette}
            onToggleFavorite={(id) => void handleToggleFavorite(id)}
          />
        );
        break;
      case 'blendPreview':
        inner = <HomeBlendCard blend={item.blend} palette={palette} />;
        break;
      case 'emptyBlendsPressable':
        return (
          <Pressable
            onPress={() => router.push('/blend/new')}
            accessibilityRole="button"
          >
            <EmptyState
              title={t('home.emptyBlendsTitle')}
              message={t('home.emptyBlendsMessage')}
              icon="flask-outline"
              iconColor="#C2D4C4"
            />
          </Pressable>
        );
      case 'limitBanner':
        return (
          <Pressable
            style={[
              styles.limitBanner,
              {
                marginTop: 10,
                backgroundColor: p.isDark ? '#3D2E1A' : '#FFF3E0',
                borderColor: '#E6A817',
              },
            ]}
            onPress={() => router.push('/paywall')}
            accessibilityRole="button"
          >
            <Text style={[styles.limitBannerText, { color: p.isDark ? '#FFD580' : '#8A5A00' }]}>
              {item.banner === 'product'
                ? (t('limits.productWarning') as string)
                : (t('limits.blendWarning') as string)}
            </Text>
            <Text style={[styles.limitBannerLink, { color: p.isDark ? '#FFD580' : '#8A5A00' }]}>
              {t('limits.upgradeLink') as string}
            </Text>
          </Pressable>
        );
      default:
        return null;
    }

    return <View style={gap}>{inner}</View>;
  };

  const keyExtractor = (row: HomeRow) => row.rowId;

  return (
    <View style={[styles.root, { backgroundColor: p.surface }]}>
      <FlatList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderHomeItem}
        ListHeaderComponent={listHeaderComponent}
        contentContainerStyle={[styles.scrollInner, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerSafe: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  homeHeaderCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 4,
  },
  homeHeaderCardTint: {
    backgroundColor: 'rgba(122,158,126,0.10)',
  },
  headerBrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerBrandText: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.sageDark,
  },
  headerAppIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  headerGreeting: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  headerStats: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionTopSpacing: {
    marginTop: 24,
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
  addManual: {
    fontSize: 15,
    fontWeight: '600',
  },
  limitBanner: {
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
