import { colors } from '../../constants/colors';
import { useThemePalette } from '../../hooks/useThemePalette';
import { t } from '../../services/i18n/i18n';
import { getBlendById } from '../../services/storage/blends';
import type { Blend } from '../../types/blend';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BlendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const blendId = typeof id === 'string' ? id : '';
  const insets = useSafeAreaInsets();
  const palette = useThemePalette();
  const p = palette;

  const [blend, setBlend] = useState<Blend | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        if (!blendId) {
          if (active) setBlend(null);
          return;
        }
        const found = await getBlendById(blendId);
        if (active) setBlend(found ?? null);
      })();
      return () => {
        active = false;
      };
    }, [blendId]),
  );

  if (blend === undefined) {
    return (
      <View style={[styles.centered, { backgroundColor: p.surface }]}>
        <ActivityIndicator color={colors.sage} />
      </View>
    );
  }

  if (blend === null) {
    return (
      <View style={[styles.centeredBlock, { backgroundColor: p.surface, paddingHorizontal: 24 }]}>
        <Text style={[styles.notFoundTitle, { color: p.text }]}>{t('blend.notFoundTitle')}</Text>
        <Text style={[styles.notFoundHint, { color: p.muted }]}>{t('blend.notFoundHint')}</Text>
        <Pressable
          style={[styles.backPill, { borderColor: colors.sage }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('general.back')}
        >
          <Text style={[styles.backPillText, { color: palette.secondaryBtnLabel }]}>
            {t('general.back')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const notes = blend.notes.trim();
  const ingredientSummary = t('home.blendIngredientSummary', {
    count: blend.ingredients.length,
  });

  return (
    <View style={[styles.root, { backgroundColor: p.surface }]}>
      <LinearGradient
        colors={[colors.sageDark, colors.sage]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.hero, { paddingTop: Math.max(insets.top, 12) + 8 }]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backHero}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('general.back')}
        >
          <Ionicons name="chevron-back" size={26} color={colors.white} />
          <Text style={styles.backHeroText}>{t('general.back')}</Text>
        </Pressable>
        <Text style={styles.heroTitle} numberOfLines={3}>
          {blend.name}
        </Text>
        <Text style={styles.heroCategory}>{ingredientSummary}</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollInner, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <Section palette={palette} title={t('import.fieldNotes')}>
          <Text style={[styles.body, { color: p.text }]}>{notes.length > 0 ? notes : '—'}</Text>
        </Section>

        <Section palette={palette} title={t('blend.ingredients')}>
          {blend.ingredients.length === 0 ? (
            <Text style={[styles.body, { color: p.muted }]}>—</Text>
          ) : (
            <View style={styles.usageList}>
              {blend.ingredients.map((ing) => (
                <Text
                  key={`${ing.productId}-${ing.amount}-${ing.unit}`}
                  style={[styles.usageRow, { color: p.text }]}
                >
                  • {ing.productName} — {ing.amount} {ing.unit}
                </Text>
              ))}
            </View>
          )}
        </Section>

        <Section palette={palette} title={t('import.fieldTags')}>
          <View style={styles.tagWrap}>
            {blend.tags.length === 0 ? (
              <Text style={[styles.body, { color: p.muted }]}>—</Text>
            ) : (
              blend.tags.map((tag) => (
                <View
                  key={tag}
                  style={[styles.tagPill, { backgroundColor: p.chipBg, borderColor: p.border }]}
                >
                  <Text style={[styles.tagText, { color: p.text }]}>{tag}</Text>
                </View>
              ))
            )}
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({
  palette,
  title,
  children,
}: {
  palette: ReturnType<typeof useThemePalette>;
  title: string;
  children: ReactNode;
}) {
  const p = palette;
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: p.muted }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  notFoundHint: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 22,
  },
  backPill: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backPillText: {
    fontSize: 16,
    fontWeight: '600',
  },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  backHero: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backHeroText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 2,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
    lineHeight: 34,
  },
  heroCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.sageLight,
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  usageList: {
    gap: 6,
  },
  usageRow: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  tagPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
