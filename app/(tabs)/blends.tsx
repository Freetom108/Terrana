import { HomeBlendCard } from '../../components/home/HomeListCards';
import { EmptyState } from '../../components/ui/EmptyState';
import { colors } from '../../constants/colors';
import { useBlends } from '../../hooks/useBlends';
import { useThemePalette } from '../../hooks/useThemePalette';
import { subscribeLocale, t } from '../../services/i18n/i18n';
import { BLEND_KINDS, blendKindLabelKey, type Blend, type BlendKind } from '../../types/blend';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FilterKey = BlendKind | 'all';

function sortUpdatedDesc(a: Blend, b: Blend): number {
  const tb = Date.parse(b.updatedAt || b.createdAt);
  const ta = Date.parse(a.updatedAt || a.createdAt);
  return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
}

export default function BlendsTab() {
  const palette = useThemePalette();
  const p = palette;
  const insets = useSafeAreaInsets();
  const { blends, refreshBlends } = useBlends();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeLocale(redraw), []);

  useFocusEffect(
    useCallback(() => {
      void refreshBlends();
    }, [refreshBlends]),
  );

  const sorted = useMemo(() => [...blends].sort(sortUpdatedDesc), [blends]);

  const filtered = useMemo(
    () => (filter === 'all' ? sorted : sorted.filter((b) => b.kind === filter)),
    [sorted, filter],
  );

  const showFilterEmpty = blends.length > 0 && filtered.length === 0;

  const FILTERS: FilterKey[] = ['all', ...BLEND_KINDS];
  const fabBottom = insets.bottom + 72;

  return (
    <View style={[styles.root, { backgroundColor: p.surface }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
        <Text style={[styles.screenTitle, { color: p.text }]}>{t('tabs.blends')}</Text>
        <Text style={[styles.screenSubtitle, { color: p.muted }]}>{t('blends.screenSubtitle')}</Text>
      </View>

      {blends.length > 0 ? (
        <View style={styles.filterBlock}>
          <Text style={[styles.filterLabel, { color: p.muted }]}>{t('blends.filterLabel')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsInner}
          >
            {FILTERS.map((key) => {
              const sel = filter === key;
              const chipText =
                key === 'all' ? t('blends.filterAll') : (t(blendKindLabelKey(key)) as string);
              return (
                <Pressable
                  key={key}
                  onPress={() => setFilter(key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: sel ? colors.sageDark : p.card,
                      borderColor: sel ? colors.sageDark : p.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: sel ? colors.white : p.text }]}>{chipText}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollInner,
          { paddingBottom: insets.bottom + 24 + 72 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {blends.length === 0 ? (
          <EmptyState
            title={t('blends.emptyTitle')}
            message={t('blends.emptyMessage')}
            emoji="🧪"
          />
        ) : showFilterEmpty ? (
          <EmptyState title={t('blends.noMatchesTitle')} message={t('blends.noMatchesMessage')} emoji="🔍" />
        ) : (
          <View style={styles.stack}>
            {filtered.map((blend) => (
              <HomeBlendCard key={blend.id} blend={blend} palette={palette} />
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('blendNew.screenTitle') as string}
        onPress={() => router.push('/blend/new')}
        style={[
          styles.fab,
          {
            backgroundColor: colors.sageDark,
            bottom: fabBottom,
          },
        ]}
      >
        <Ionicons name="add" size={30} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  filterBlock: {
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  filterChipsInner: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 10,
    paddingRight: 4,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 2,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 20,
    flexGrow: 1,
    paddingTop: 4,
  },
  stack: {
    gap: 10,
  },
  fab: {
    position: 'absolute',
    right: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
