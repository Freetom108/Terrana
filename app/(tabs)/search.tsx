import { HomeProductCard } from '../../components/home/HomeListCards';
import { colors } from '../../constants/colors';
import { useProducts } from '../../hooks/useProducts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { subscribeLocale, t } from '../../services/i18n/i18n';
import type { Product } from '../../types/product';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

function stripHash(raw: string): string {
  return raw.startsWith('#') ? raw.slice(1).trimStart() : raw;
}

function matchesQuery(product: Product, query: string): boolean {
  const q = query.toLowerCase();
  if (product.name.toLowerCase().includes(q)) return true;
  if (product.brand?.toLowerCase().includes(q)) return true;
  if (product.description?.toLowerCase().includes(q)) return true;
  if (product.usages?.some((u) => u.toLowerCase().includes(q))) return true;
  if (product.tags?.some((tag) => tag.toLowerCase().includes(q))) return true;
  return false;
}

export default function SearchTab() {
  const p = useThemePalette();
  const { products, refreshProducts } = useProducts();
  const [rawQuery, setRawQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeLocale(redraw), []);

  useFocusEffect(
    useCallback(() => {
      void refreshProducts();
    }, [refreshProducts]),
  );

  const query = stripHash(rawQuery).trim();

  const popularTags = useMemo(() => {
    const freq = new Map<string, number>();
    for (const product of products) {
      for (const tag of product.tags ?? []) {
        const key = tag.toLowerCase();
        freq.set(key, (freq.get(key) ?? 0) + 1);
      }
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag]) => tag);
  }, [products]);

  const results = useMemo<Product[]>(() => {
    if (!query) return [];
    return products.filter((p) => matchesQuery(p, query));
  }, [products, query]);

  const isEmpty = rawQuery.trim() === '';

  return (
    <View style={[styles.root, { backgroundColor: p.surface }]}>
      {/* Search bar */}
      <View style={[styles.searchRow, { borderBottomColor: p.subtleBorder }]}>
        <View style={[styles.inputWrap, { backgroundColor: p.inputBg, borderColor: p.border }]}>
          <Text style={[styles.loupe, { color: p.muted }]}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: p.text }]}
            placeholder={t('search.placeholder')}
            placeholderTextColor={p.placeholderColor}
            value={rawQuery}
            onChangeText={setRawQuery}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Body */}
      {isEmpty ? (
        <ScrollView
          contentContainerStyle={styles.emptyScroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Empty state hint */}
          <View style={styles.emptyHint}>
            <Text style={styles.emptyIcon}>🌿</Text>
            <Text style={[styles.emptyText, { color: p.muted }]}>{t('search.empty')}</Text>
          </View>

          {/* Popular tags */}
          {popularTags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={[styles.tagsSectionTitle, { color: p.muted }]}>
                {t('search.popular')}
              </Text>
              <View style={styles.tagsWrap}>
                {popularTags.map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => setRawQuery(`#${tag}`)}
                    style={({ pressed }) => [
                      styles.chip,
                      { backgroundColor: p.chipBg, borderColor: p.border },
                      pressed && styles.chipPressed,
                    ]}
                  >
                    <Text style={[styles.chipText, { color: colors.sageDark }]}>#{tag}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      ) : results.length === 0 ? (
        /* No results */
        <View style={styles.noResults}>
          <Text style={[styles.noResultsText, { color: p.muted }]}>
            {t('search.noResults', { query: rawQuery.trim() })}
          </Text>
        </View>
      ) : (
        /* Results list */
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <HomeProductCard product={item} palette={p} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  loupe: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  /* Empty state */
  emptyScroll: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 40,
  },
  emptyHint: {
    alignItems: 'center',
    marginBottom: 36,
    gap: 10,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  /* Tags section */
  tagsSection: {
    gap: 12,
  },
  tagsSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  /* No results */
  noResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  noResultsText: {
    fontSize: 15,
    textAlign: 'center',
  },
  /* Results list */
  list: {
    padding: 16,
  },
  separator: {
    height: 10,
  },
});
