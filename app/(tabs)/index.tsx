import { EmptyState } from '../../components/ui/EmptyState';
import { colors } from '../../constants/colors';
import { useBlends } from '../../hooks/useBlends';
import { useProducts } from '../../hooks/useProducts';
import { t } from '../../services/i18n/i18n';
import type { Product } from '../../types/product';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function sortByUpdatedDesc(a: Product, b: Product): number {
  const ta = Date.parse(a.updatedAt || a.createdAt);
  const tb = Date.parse(b.updatedAt || b.createdAt);
  return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
}

function sortByName(a: Product, b: Product): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

function ProductRow({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.id}`} asChild>
      <Pressable style={({ pressed }) => [styles.productRow, pressed && styles.productRowPressed]}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.productMeta} numberOfLines={1}>
          {product.brand ? `${product.brand} · ` : ''}
          {product.category}
        </Text>
      </Pressable>
    </Link>
  );
}

export default function HomeTab() {
  const insets = useSafeAreaInsets();
  const { products, refreshProducts } = useProducts();
  const { blends, refreshBlends } = useBlends();

  useFocusEffect(
    useCallback(() => {
      void refreshProducts();
      void refreshBlends();
    }, [refreshProducts, refreshBlends])
  );

  const productCount = products.length;
  const blendCount = blends.length;

  const statsSubtitle = t('home.statsSubtitle', {
    productCount,
    blendCount,
  });

  const byUpdated = useMemo(() => [...products].sort(sortByUpdatedDesc), [products]);
  const byName = useMemo(() => [...products].sort(sortByName), [products]);

  const recentlyUsed = useMemo(() => {
    const withLast = products.filter((p) => p.lastUsed);
    if (withLast.length === 0) {
      return byUpdated.slice(0, 8);
    }
    return [...withLast].sort((a, b) =>
      String(b.lastUsed ?? '').localeCompare(String(a.lastUsed ?? ''))
    );
  }, [products, byUpdated]);

  const showProductEmpty = productCount === 0;
  const showBlendEmpty = blendCount === 0;

  return (
    <View style={styles.root}>
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
          <Text style={styles.sectionTitle}>{t('home.lastUsed')}</Text>
          {showProductEmpty ? (
            <EmptyState
              title={t('home.emptyProductsTitle')}
              message={t('home.emptyProductsMessage')}
              emoji="🕐"
            />
          ) : (
            <View style={styles.productStack}>
              {recentlyUsed.map((p) => (
                <ProductRow key={`recent-${p.id}`} product={p} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.allProducts')}</Text>
          {showProductEmpty ? (
            <EmptyState
              title={t('home.emptyProductsTitle')}
              message={t('home.emptyProductsMessage')}
              emoji="📦"
            />
          ) : (
            <View style={styles.productStack}>
              {byName.map((p) => (
                <ProductRow key={`all-${p.id}`} product={p} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.myBlends')}</Text>
          {showBlendEmpty ? (
            <EmptyState
              title={t('home.emptyBlendsTitle')}
              message={t('home.emptyBlendsMessage')}
              emoji="🧪"
            />
          ) : (
            <View style={styles.productStack}>
              {blends.map((blend) => (
                <Link key={blend.id} href={`/blend/${blend.id}`} asChild>
                  <Pressable
                    style={({ pressed }) => [styles.productRow, pressed && styles.productRowPressed]}
                  >
                    <Text style={styles.productName} numberOfLines={2}>
                      {blend.name}
                    </Text>
                    <Text style={styles.productMeta} numberOfLines={1}>
                      {t('home.blendIngredientSummary', { count: blend.ingredients.length })}
                    </Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: 12,
  },
  productStack: {
    gap: 10,
  },
  productRow: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.sageLight,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  productRowPressed: {
    opacity: 0.85,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 4,
  },
  productMeta: {
    fontSize: 13,
    color: colors.mid,
    fontWeight: '500',
  },
});
