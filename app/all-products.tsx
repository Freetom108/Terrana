import { HomeProductCard } from '../components/home/HomeListCards';
import { EmptyState } from '../components/ui/EmptyState';
import { useProducts } from '../hooks/useProducts';
import { useThemePalette } from '../hooks/useThemePalette';
import { t } from '../services/i18n/i18n';
import type { Product } from '../types/product';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, ListRenderItem, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function sortByName(a: Product, b: Product): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

export default function AllProductsScreen() {
  const palette = useThemePalette();
  const p = palette;
  const insets = useSafeAreaInsets();
  const { products, refreshProducts } = useProducts();

  useFocusEffect(
    useCallback(() => {
      void refreshProducts();
    }, [refreshProducts]),
  );

  const byName = useMemo(() => [...products].sort(sortByName), [products]);

  const renderItem: ListRenderItem<Product> = ({ item }) => (
    <HomeProductCard product={item} palette={palette} />
  );

  const listEmpty = useMemo(
    () => (
      <EmptyState title={t('home.emptyProductsTitle')} message={t('home.emptyProductsMessage')} emoji="📦" />
    ),
    [],
  );

  return (
    <View style={[styles.root, { backgroundColor: p.surface, paddingTop: insets.top + 8 }]}>
      <Pressable
        onPress={() => router.back()}
        style={styles.backRow}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t('general.back')}
      >
        <Ionicons name="chevron-back" size={26} color={p.secondaryBtnLabel} />
        <Text style={[styles.backLabel, { color: p.secondaryBtnLabel }]}>{t('general.back')}</Text>
      </Pressable>
      <Text style={[styles.screenTitle, { color: p.text }]}>{t('home.allProducts')}</Text>
      <FlatList
        data={byName}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
          byName.length === 0 && styles.listEmptyGrow,
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  backLabel: {
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 2,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 8,
    flexGrow: 1,
  },
  listEmptyGrow: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  sep: {
    height: 10,
  },
});
