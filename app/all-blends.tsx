import { HomeBlendCard } from '../components/home/HomeListCards';
import { EmptyState } from '../components/ui/EmptyState';
import { useBlends } from '../hooks/useBlends';
import { useThemePalette } from '../hooks/useThemePalette';
import { t } from '../services/i18n/i18n';
import type { Blend } from '../types/blend';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, ListRenderItem, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AllBlendsScreen() {
  const palette = useThemePalette();
  const p = palette;
  const insets = useSafeAreaInsets();
  const { blends, refreshBlends } = useBlends();

  useFocusEffect(
    useCallback(() => {
      void refreshBlends();
    }, [refreshBlends]),
  );

  const renderItem: ListRenderItem<Blend> = ({ item }) => (
    <HomeBlendCard blend={item} palette={palette} />
  );

  const listEmpty = useMemo(
    () => (
      <Pressable onPress={() => router.push('/blend/new')} accessibilityRole="button">
        <EmptyState
          title={t('home.emptyBlendsTitle')}
          message={t('home.emptyBlendsMessage')}
          icon="flask-outline"
          iconColor="#C2D4C4"
        />
      </Pressable>
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
      <Text style={[styles.screenTitle, { color: p.text }]}>{t('home.myBlends')}</Text>
      <FlatList
        data={blends}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
          blends.length === 0 && styles.listEmptyGrow,
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
