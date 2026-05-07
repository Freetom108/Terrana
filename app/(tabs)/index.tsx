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
import { shareProducts } from '../../services/export/shareService';
import type { Product } from '../../types/product';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LAST_USED_LIMIT = 3;
const ALL_PRODUCTS_LIMIT = 5;
const BLENDS_LIMIT = 3;
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

  const isFreeUser = !isPro && !isLifetime;

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelectMode = useCallback(() => {
    if (!isPro && !isLifetime) {
      router.push('/paywall');
      return;
    }
    setSelectMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, [isPro, isLifetime, router]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleShareSelected = useCallback(() => {
    const toShare = products.filter((p) => selectedIds.has(p.id));
    if (toShare.length === 0) return;
    void shareProducts(toShare).catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Share', msg);
    });
  }, [products, selectedIds]);

  const productCount = products.length;
  const blendCount = blends.length;

  const statsSubtitle = t('home.statsSubtitle', {
    productCount,
    blendCount,
  });

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
  const productsByNamePreview = byName.slice(0, ALL_PRODUCTS_LIMIT);
  const blendsPreview = blends.slice(0, BLENDS_LIMIT);

  const showMoreRecentlyUsed = recentlyUsed.length > LAST_USED_LIMIT;
  const showMoreAllProducts = byName.length > ALL_PRODUCTS_LIMIT;
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
        <Text style={styles.greeting}>{t('home.greetingMorning')}</Text>
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
            {!showProductEmpty && showMoreAllProducts && !selectMode ? (
              <Link href="/all-products" asChild>
                <Pressable hitSlop={8} accessibilityRole="link">
                  <Text style={[styles.viewAll, { color: p.secondaryBtnLabel }]}>{t('home.viewAll')}</Text>
                </Pressable>
              </Link>
            ) : null}
            {!showProductEmpty ? (
              <Pressable
                onPress={toggleSelectMode}
                hitSlop={8}
                accessibilityRole="button"
                style={selectMode ? styles.selectDoneBtn : styles.selectBtn}
              >
                <Text style={selectMode ? styles.selectDoneBtnText : [styles.selectBtnText, { color: p.secondaryBtnLabel }]}>
                  {selectMode ? t('home.cancelSelect') : t('home.selectBtn')}
                </Text>
              </Pressable>
            ) : null}
          </View>
          {showProductEmpty ? (
            <EmptyState
              title={t('home.emptyProductsTitle')}
              message={t('home.emptyProductsMessage')}
              emoji="📦"
            />
          ) : selectMode ? (
            <View style={styles.productStack}>
              {byName.map((prod) => {
                const selected = selectedIds.has(prod.id);
                return (
                  <Pressable
                    key={`sel-${prod.id}`}
                    onPress={() => toggleSelected(prod.id)}
                    style={[
                      styles.selectableCard,
                      {
                        backgroundColor: selected
                          ? (p.isDark ? '#1E3320' : '#EAF4EC')
                          : p.card,
                        borderColor: selected ? colors.sage : p.border,
                      },
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={selected ? colors.sage : p.muted}
                    />
                    <View style={styles.selectableContent}>
                      <Text style={[styles.selectableName, { color: p.text }]} numberOfLines={1}>
                        {prod.name}
                      </Text>
                      <Text style={[styles.selectableMeta, { color: p.muted }]} numberOfLines={1}>
                        {prod.brand ? `${prod.brand} · ` : ''}{prod.category}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.productStack}>
              {productsByNamePreview.map((prod) => (
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

      {selectMode && selectedIds.size > 0 ? (
        <View
          style={[
            styles.shareBar,
            {
              backgroundColor: p.card,
              borderColor: p.border,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          <Pressable
            onPress={handleShareSelected}
            style={[styles.shareBarBtn, { backgroundColor: colors.sage }]}
            accessibilityRole="button"
          >
            <Ionicons name="share-outline" size={18} color={colors.white} />
            <Text style={styles.shareBarBtnText}>
              {t('home.shareSelected', { count: selectedIds.size }) as string}
            </Text>
          </Pressable>
        </View>
      ) : null}
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
  selectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectDoneBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.sage,
  },
  selectDoneBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  selectableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  selectableContent: {
    flex: 1,
  },
  selectableName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  selectableMeta: {
    fontSize: 13,
  },
  shareBar: {
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  shareBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  shareBarBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
