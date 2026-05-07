import { PRODUCT_CATEGORIES } from '../../constants/categories';
import { colors } from '../../constants/colors';
import { useThemePalette } from '../../hooks/useThemePalette';
import { t } from '../../services/i18n/i18n';
import { deleteProduct, getProductById, saveProduct } from '../../services/storage/products';
import type { InventoryLevel, Product } from '../../types/product';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const INVENTORY_SEQUENCE: InventoryLevel[] = ['full', 'medium', 'low', 'empty'];

function inventoryLabel(inv: InventoryLevel): string {
  switch (inv) {
    case 'full':
      return t('import.inventoryFull');
    case 'medium':
      return t('import.inventoryMedium');
    case 'low':
      return t('import.inventoryLow');
    case 'empty':
    default:
      return t('import.inventoryEmpty');
  }
}

function cloneProduct(pr: Product): Product {
  return {
    ...pr,
    usages: [...pr.usages],
    tags: [...pr.tags],
  };
}

function clampRating(r: number): number {
  if (!Number.isFinite(r)) return 3;
  return Math.min(5, Math.max(1, Math.round(r)));
}

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = typeof id === 'string' ? id : '';
  const insets = useSafeAreaInsets();
  const palette = useThemePalette();
  const p = palette;

  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Product | null>(null);
  const [usagesBuffer, setUsagesBuffer] = useState('');
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    setEditing(false);
    setDraft(null);
    setTagInput('');
    setUsagesBuffer('');
  }, [productId]);

  useFocusEffect(
    useCallback(() => {
      if (editing) {
        return () => {};
      }
      let active = true;
      void (async () => {
        if (!productId) {
          if (active) setProduct(null);
          return;
        }
        const found = await getProductById(productId);
        if (active) setProduct(found ?? null);
      })();
      return () => {
        active = false;
      };
    }, [productId, editing]),
  );

  const enterEdit = useCallback(() => {
    if (!product) return;
    const c = cloneProduct(product);
    setDraft(c);
    setUsagesBuffer(c.usages.join('\n'));
    setTagInput('');
    setEditing(true);
  }, [product]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setDraft(null);
    setUsagesBuffer('');
    setTagInput('');
  }, []);

  const commitSave = useCallback(async () => {
    if (!draft) return;
    const usages = usagesBuffer
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const tags = draft.tags.map((x) => x.trim()).filter((x) => x.length > 0);
    const uniqueTags = Array.from(new Set(tags));
    const next: Product = {
      ...draft,
      name: draft.name.trim(),
      brand: draft.brand.trim(),
      description: draft.description.trim(),
      notes: draft.notes.trim(),
      usages,
      tags: uniqueTags,
      rating: clampRating(draft.rating),
      updatedAt: new Date().toISOString(),
    };
    await saveProduct(next);
    setProduct(next);
    setEditing(false);
    setDraft(null);
    setUsagesBuffer('');
    setTagInput('');
  }, [draft, usagesBuffer]);

  const handleDelete = useCallback(() => {
    if (!product) return;
    Alert.alert(
      t('product.deleteTitle') as string,
      t('product.deleteMessage', { name: product.name }) as string,
      [
        { text: t('general.cancel') as string, style: 'cancel' },
        {
          text: t('product.deleteConfirm') as string,
          style: 'destructive',
          onPress: () => {
            void deleteProduct(product.id).then(() => router.back());
          },
        },
      ],
    );
  }, [product]);

  const starColor = p.isDark ? colors.sageLight : colors.sageDark;
  const starEmpty = p.muted;

  if (product === undefined) {
    return (
      <View style={[styles.centered, { backgroundColor: p.surface }]}>
        <ActivityIndicator color={colors.sage} />
      </View>
    );
  }

  if (product === null) {
    return (
      <View style={[styles.centeredBlock, { backgroundColor: p.surface, paddingHorizontal: 24 }]}>
        <Text style={[styles.notFoundTitle, { color: p.text }]}>{t('product.notFoundTitle')}</Text>
        <Text style={[styles.notFoundHint, { color: p.muted }]}>{t('product.notFoundHint')}</Text>
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

  const display: Product = draft ?? product;

  const desc = display.description.trim();
  const notes = display.notes.trim();

  return (
    <View style={[styles.root, { backgroundColor: p.surface }]}>
      <LinearGradient
        colors={[colors.sageDark, colors.sage]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.hero, { paddingTop: Math.max(insets.top, 12) + 8 }]}
      >
        <View style={styles.heroTop}>
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

          {editing ? (
            <View style={styles.heroActions}>
              <Pressable
                onPress={cancelEdit}
                accessibilityRole="button"
                accessibilityLabel={t('general.cancel')}
                style={styles.heroTextBtn}
                hitSlop={8}
              >
                <Text style={styles.heroActionText}>{t('general.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={() => void commitSave()}
                accessibilityRole="button"
                accessibilityLabel={t('general.save')}
                style={styles.heroTextBtnStrong}
                hitSlop={8}
              >
                <Text style={styles.heroActionTextStrong}>{t('general.save')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.heroActions}>
              <Pressable
                onPress={handleDelete}
                accessibilityRole="button"
                accessibilityLabel={t('product.deleteTitle')}
                style={styles.iconBtn}
                hitSlop={12}
              >
                <Ionicons name="trash-outline" size={23} color="rgba(255,255,255,0.80)" />
              </Pressable>
              <Pressable
                onPress={enterEdit}
                accessibilityRole="button"
                accessibilityLabel={t('product.edit')}
                style={styles.iconBtn}
                hitSlop={12}
              >
                <Ionicons name="pencil-outline" size={26} color={colors.white} />
              </Pressable>
            </View>
          )}
        </View>

        {editing && draft ? (
          <>
            <TextInput
              value={draft.name}
              onChangeText={(txt) => setDraft({ ...draft, name: txt })}
              placeholder={t('import.fieldPlaceholderName')}
              placeholderTextColor="rgba(255,255,255,0.55)"
              style={styles.heroNameInput}
              maxLength={200}
              accessibilityLabel={t('import.fieldProductName')}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {PRODUCT_CATEGORIES.map((cat) => {
                const sel = draft.category === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setDraft({ ...draft, category: cat })}
                    style={[
                      styles.categoryChip,
                      sel ? styles.categoryChipSelected : styles.categoryChipIdle,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sel }}
                  >
                    <Text style={sel ? styles.categoryChipTextSel : styles.categoryChipTextIdle}>
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : (
          <>
            <Text style={styles.heroTitle} numberOfLines={3}>
              {display.name}
            </Text>
            <Text style={styles.heroCategory}>{display.category}</Text>
          </>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollInner, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Section palette={palette} title={t('import.fieldBrand')}>
          {editing && draft ? (
            <TextInput
              value={draft.brand}
              onChangeText={(txt) => setDraft({ ...draft, brand: txt })}
              style={[
                styles.inputSingle,
                { backgroundColor: p.inputBg, borderColor: p.border, color: p.text },
              ]}
              placeholderTextColor={p.placeholderColor}
              maxLength={120}
              accessibilityLabel={t('import.fieldBrand')}
            />
          ) : (
            <Text style={[styles.body, { color: p.text }]}>{display.brand.trim() ? display.brand : '—'}</Text>
          )}
        </Section>

        <Section palette={palette} title={t('import.fieldDescription')}>
          {editing && draft ? (
            <TextInput
              value={draft.description}
              onChangeText={(txt) => setDraft({ ...draft, description: txt })}
              style={[
                styles.inputMulti,
                { backgroundColor: p.inputBg, borderColor: p.border, color: p.text },
              ]}
              placeholderTextColor={p.placeholderColor}
              multiline
              textAlignVertical="top"
              accessibilityLabel={t('import.fieldDescription')}
            />
          ) : (
            <Text style={[styles.body, { color: p.text }]}>{desc.length > 0 ? desc : '—'}</Text>
          )}
        </Section>

        <Section palette={palette} title={t('import.fieldUsages')}>
          {editing ? (
            <>
              <Text style={[styles.hint, { color: p.muted }]}>{t('product.usagesHint')}</Text>
              <TextInput
                value={usagesBuffer}
                onChangeText={setUsagesBuffer}
                style={[
                  styles.inputMulti,
                  styles.inputMultiTall,
                  { backgroundColor: p.inputBg, borderColor: p.border, color: p.text },
                ]}
                placeholderTextColor={p.placeholderColor}
                multiline
                textAlignVertical="top"
                accessibilityLabel={t('import.fieldUsages')}
              />
            </>
          ) : display.usages.length === 0 ? (
            <Text style={[styles.body, { color: p.muted }]}>—</Text>
          ) : (
            <View style={styles.usageList}>
              {display.usages.map((line, idx) => (
                <Text key={`${idx}-${line}`} style={[styles.usageRow, { color: p.text }]}>
                  • {line}
                </Text>
              ))}
            </View>
          )}
        </Section>

        <Section palette={palette} title={t('import.fieldNotes')}>
          {editing && draft ? (
            <TextInput
              value={draft.notes}
              onChangeText={(txt) => setDraft({ ...draft, notes: txt })}
              style={[
                styles.inputMulti,
                styles.inputMultiTall,
                { backgroundColor: p.inputBg, borderColor: p.border, color: p.text },
              ]}
              placeholder={t('import.fieldNotesPlaceholder')}
              placeholderTextColor={p.placeholderColor}
              multiline
              textAlignVertical="top"
              accessibilityLabel={t('import.fieldNotes')}
            />
          ) : (
            <Text style={[styles.body, { color: p.text }]}>{notes.length > 0 ? notes : '—'}</Text>
          )}
        </Section>

        <Section palette={palette} title={t('product.rating')}>
          {editing && draft ? (
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setDraft({ ...draft, rating: n })}
                  accessibilityRole="button"
                  accessibilityLabel={`${n}`}
                  hitSlop={6}
                >
                  <Ionicons
                    name={n <= draft.rating ? 'star' : 'star-outline'}
                    size={32}
                    color={n <= draft.rating ? starColor : starEmpty}
                  />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Ionicons
                  key={n}
                  name={n <= display.rating ? 'star' : 'star-outline'}
                  size={28}
                  color={n <= display.rating ? starColor : starEmpty}
                />
              ))}
            </View>
          )}
        </Section>

        <Section palette={palette} title={t('import.fieldTags')}>
          <View style={styles.tagWrap}>
            {(editing && draft ? draft.tags : display.tags).length === 0 && !editing ? (
              <Text style={[styles.body, { color: p.muted }]}>—</Text>
            ) : (
              (editing && draft ? draft.tags : display.tags).map((tag) => (
                <View
                  key={tag}
                  style={[styles.tagPillRow, { backgroundColor: p.chipBg, borderColor: p.border }]}
                >
                  <Text style={[styles.tagText, { color: p.text }]}>{tag}</Text>
                  {editing && draft ? (
                    <Pressable
                      onPress={() =>
                        setDraft({ ...draft, tags: draft.tags.filter((x) => x !== tag) })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={t('product.removeTagA11y', { tag }) as string}
                      hitSlop={8}
                      style={styles.tagRemoveHit}
                    >
                      <Ionicons name="close-circle" size={20} color={p.muted} />
                    </Pressable>
                  ) : null}
                </View>
              ))
            )}
          </View>
          {editing && draft ? (
            <View style={styles.tagAddRow}>
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                placeholder={t('product.tagPlaceholder')}
                placeholderTextColor={p.placeholderColor}
                style={[
                  styles.tagInput,
                  { backgroundColor: p.inputBg, borderColor: p.border, color: p.text },
                ]}
                accessibilityLabel={t('product.tagPlaceholder')}
              />
              <Pressable
                onPress={() => {
                  const next = tagInput.trim();
                  if (!next || draft.tags.includes(next)) return;
                  setDraft({ ...draft, tags: [...draft.tags, next] });
                  setTagInput('');
                }}
                style={[styles.addTagBtn, { borderColor: colors.sage }]}
                accessibilityRole="button"
                accessibilityLabel={t('product.addTag')}
              >
                <Text style={[styles.addTagBtnText, { color: palette.secondaryBtnLabel }]}>
                  {t('product.addTag')}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Section>

        <Section palette={palette} title={t('import.fieldInventory')}>
          {editing && draft ? (
            <View style={styles.invGrid}>
              {INVENTORY_SEQUENCE.map((level) => {
                const sel = draft.inventory === level;
                return (
                  <Pressable
                    key={level}
                    onPress={() => setDraft({ ...draft, inventory: level })}
                    style={[
                      styles.invOption,
                      {
                        backgroundColor: sel ? colors.sageDark : p.card,
                        borderColor: sel ? colors.sageDark : p.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sel }}
                  >
                    <Text
                      style={[
                        styles.invOptionText,
                        { color: sel ? colors.white : p.text },
                      ]}
                      numberOfLines={2}
                    >
                      {inventoryLabel(level)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={[styles.inventoryBanner, { backgroundColor: p.card, borderColor: p.border }]}>
              <Text style={[styles.inventoryText, { color: p.text }]}>
                {inventoryLabel(display.inventory)}
              </Text>
            </View>
          )}
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
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  backHero: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  backHeroText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 2,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexShrink: 0,
  },
  heroTextBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  heroTextBtnStrong: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  heroActionText: {
    color: colors.sageLight,
    fontSize: 16,
    fontWeight: '600',
  },
  heroActionTextStrong: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  iconBtn: {
    padding: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
    lineHeight: 34,
  },
  heroNameInput: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.sageLight,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    paddingVertical: 4,
    paddingRight: 8,
  },
  categoryChip: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  categoryChipIdle: {
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'transparent',
  },
  categoryChipSelected: {
    borderColor: colors.white,
    backgroundColor: colors.white,
  },
  categoryChipTextIdle: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipTextSel: {
    color: colors.sageDark,
    fontSize: 13,
    fontWeight: '700',
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
  hint: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputSingle: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  inputMulti: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '500',
    minHeight: 88,
  },
  inputMultiTall: {
    minHeight: 120,
  },
  usageList: {
    gap: 6,
  },
  usageRow: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  tagPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 6,
    paddingLeft: 14,
    paddingRight: 6,
    gap: 4,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tagRemoveHit: {
    padding: 2,
  },
  tagAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  addTagBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  addTagBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  invGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  invOption: {
    width: '47%',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    minHeight: 52,
    justifyContent: 'center',
  },
  invOptionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  inventoryBanner: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  inventoryText: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
});
