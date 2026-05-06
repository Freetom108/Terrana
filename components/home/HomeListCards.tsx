import { colors } from '../../constants/colors';
import type { ThemePalette } from '../../hooks/useThemePalette';
import { t } from '../../services/i18n/i18n';
import { blendKindLabelKey, blendStructuredItemCount, type Blend } from '../../types/blend';
import type { Product } from '../../types/product';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

export function HomeProductCard({ product, palette }: { product: Product; palette: ThemePalette }) {
  const p = palette;
  return (
    <Link href={`/product/${product.id}`} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: p.card,
            borderColor: p.border,
            shadowOpacity: p.isDark ? 0.25 : 0.05,
          },
          pressed && styles.cardPressed,
        ]}
      >
        <Text style={[styles.name, { color: p.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.meta, { color: p.muted }]} numberOfLines={1}>
          {product.brand ? `${product.brand} · ` : ''}
          {product.category}
        </Text>
      </Pressable>
    </Link>
  );
}

export function HomeBlendCard({ blend, palette }: { blend: Blend; palette: ThemePalette }) {
  const p = palette;
  return (
    <Link href={`/blend/${blend.id}`} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: p.card,
            borderColor: p.border,
            shadowOpacity: p.isDark ? 0.25 : 0.05,
          },
          pressed && styles.cardPressed,
        ]}
      >
        <Text style={[styles.name, { color: p.text }]} numberOfLines={2}>
          {blend.name}
        </Text>
        <Text style={[styles.kindLine, { color: p.muted }]} numberOfLines={1}>
          {t(blendKindLabelKey(blend.kind))}
        </Text>
        <Text style={[styles.meta, { color: p.muted }]} numberOfLines={2}>
          {t(
            blend.kind === 'mix'
              ? 'blends.heroSubtitleMix'
              : blend.kind === 'combination'
                ? 'blends.heroSubtitleCombo'
                : 'blends.heroSubtitleProtocol',
            { count: blendStructuredItemCount(blend) },
          )}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.85,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  kindLine: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  meta: {
    fontSize: 13,
    fontWeight: '500',
  },
});
