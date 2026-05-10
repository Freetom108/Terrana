import { HomeProductCard } from '../../components/home/HomeListCards';
import { colors } from '../../constants/colors';
import { useProducts } from '../../hooks/useProducts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { subscribeLocale, t } from '../../services/i18n/i18n';
import { toggleFavorite } from '../../services/storage/products';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FavoritesTab() {
  const p = useThemePalette();
  const { products, refreshProducts } = useProducts();
  const [, redraw] = useReducer((n: number) => n + 1, 0);

  useEffect(() => subscribeLocale(() => { redraw(); void refreshProducts(); }), [refreshProducts]);

  useFocusEffect(
    useCallback(() => {
      void refreshProducts();
    }, [refreshProducts]),
  );

  const favorites = useMemo(
    () => products.filter((prod) => prod.isFavorite),
    [products],
  );

  const handleToggleFavorite = useCallback(async (id: string) => {
    await toggleFavorite(id);
    void refreshProducts();
  }, [refreshProducts]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: p.surface }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: p.subtleBorder }]}>
        <Text style={[styles.title, { color: p.text }]}>{t('favorites.screenTitle') as string}</Text>
        <Link href="/(tabs)" asChild>
          <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel={t('favorites.addProducts') as string}>
            <Ionicons name="add" size={28} color={colors.sage} />
          </Pressable>
        </Link>
      </View>

      {favorites.length === 0 ? (
        /* Empty state */
        <View style={styles.empty}>
          <Ionicons name="star-outline" size={52} color={p.muted} />
          <Text style={[styles.emptyTitle, { color: p.text }]}>{t('favorites.emptyTitle') as string}</Text>
          <Text style={[styles.emptyHint, { color: p.muted }]}>{t('favorites.emptyHint') as string}</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <HomeProductCard
              product={item}
              palette={p}
              onToggleFavorite={(id) => void handleToggleFavorite(id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  list: {
    padding: 16,
  },
  separator: {
    height: 10,
  },
});
