import type { ProductCategory } from '../../constants/categories';
import {
  PRODUCT_CATEGORIES,
  categoryLabelKey,
  resolveProductCategory,
} from '../../constants/categories';
import { colors } from '../../constants/colors';
import { usePro } from '../../hooks/usePro';
import { useThemePalette } from '../../hooks/useThemePalette';
import { subscribeLocale, t } from '../../services/i18n/i18n';
import { LimitExceededError } from '../../services/storage/errors';
import { saveProduct } from '../../services/storage/products';
import type { InventoryLevel, Product } from '../../types/product';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect, useReducer, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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

function clampRating(r: number): number {
  if (!Number.isFinite(r)) return 3;
  return Math.min(5, Math.max(1, Math.round(r)));
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
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

export default function NewProductScreen() {
  const insets = useSafeAreaInsets();
  const palette = useThemePalette();
  const p = palette;
  const { isPro, isLifetime } = usePro();

  const [, redraw] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeLocale(redraw), []);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('other');
  const [description, setDescription] = useState('');
  const [usagesBuffer, setUsagesBuffer] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [rating, setRating] = useState(3);
  const [inventory, setInventory] = useState<InventoryLevel>('full');
  const [saveError, setSaveError] = useState<string | null>(null);

  const heroTop = Math.max(insets.top, 12);

  const handleSave = async () => {
    setSaveError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert(
        t('productNew.validationTitle') as string,
        t('productNew.nameRequired') as string,
      );
      return;
    }
    const usages = usagesBuffer
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const uniqTags = Array.from(
      new Set(tags.map((x) => x.trim()).filter((x) => x.length > 0)),
    );
    const now = new Date().toISOString();
    const prod: Product = {
      id: newId(),
      name: trimmedName,
      brand: brand.trim(),
      category: resolveProductCategory(category),
      description: description.trim(),
      notes: notes.trim(),
      usages,
      tags: uniqTags,
      rating: clampRating(rating),
      inventory,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await saveProduct(prod, { isPro: isPro || isLifetime, isLifetime });
      router.replace(`/product/${prod.id}`);
    } catch (e) {
      if (e instanceof LimitExceededError) {
        router.push('/paywall');
        return;
      }
      const msg = e instanceof Error ? e.message : String(e);
      setSaveError(msg);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: p.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[colors.sageDark, colors.sage]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.hero, { paddingTop: heroTop + 8 }]}
        >
          <View style={styles.heroTop}>
            <Pressable
              onPress={() => router.back()}
              style={styles.heroBackRow}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('general.back') as string}
            >
              <Ionicons name="chevron-back" size={26} color={colors.white} />
              <Text style={styles.heroBackText}>{t('general.back')}</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleSave()}
              style={styles.saveBtn}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('general.save') as string}
            >
              <Text style={styles.saveBtnText}>{t('general.save')}</Text>
            </Pressable>
          </View>
          <Text style={styles.heroScreenTitle}>{t('productNew.title') as string}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('import.fieldPlaceholderName') as string}
            placeholderTextColor="rgba(255,255,255,0.55)"
            style={styles.heroNameInput}
            maxLength={200}
            accessibilityLabel={t('import.fieldProductName') as string}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {PRODUCT_CATEGORIES.map((cat) => {
              const sel = category === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.categoryChip,
                    sel ? styles.categoryChipSelected : styles.categoryChipIdle,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}
                >
                  <Text style={sel ? styles.categoryChipTextSel : styles.categoryChipTextIdle}>
                    {t(categoryLabelKey(cat)) as string}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </LinearGradient>

        <View style={styles.scrollInner}>
        <Section palette={palette} title={t('import.fieldBrand')}>
          <TextInput
            value={brand}
            onChangeText={setBrand}
            style={[
              styles.inputSingle,
              { backgroundColor: p.inputBg, borderColor: p.border, color: p.text },
            ]}
            placeholderTextColor={p.placeholderColor}
            maxLength={120}
            accessibilityLabel={t('import.fieldBrand') as string}
          />
        </Section>

        <Section palette={palette} title={t('import.fieldDescription')}>
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[
              styles.inputMulti,
              { backgroundColor: p.inputBg, borderColor: p.border, color: p.text },
            ]}
            placeholderTextColor={p.placeholderColor}
            multiline
            textAlignVertical="top"
            accessibilityLabel={t('import.fieldDescription') as string}
          />
        </Section>

        <Section palette={palette} title={t('import.fieldUsages')}>
          <Text style={[styles.hint, { color: p.muted }]}>{t('product.usagesHint') as string}</Text>
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
            accessibilityLabel={t('import.fieldUsages') as string}
          />
        </Section>

        <Section palette={palette} title={t('import.fieldNotes')}>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            style={[
              styles.inputMulti,
              styles.inputMultiTall,
              { backgroundColor: p.inputBg, borderColor: p.border, color: p.text },
            ]}
            placeholder={t('import.fieldNotesPlaceholder') as string}
            placeholderTextColor={p.placeholderColor}
            multiline
            textAlignVertical="top"
            accessibilityLabel={t('import.fieldNotes') as string}
          />
        </Section>

        <Section palette={palette} title={t('product.rating')}>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setRating(n)}
                accessibilityRole="button"
                accessibilityLabel={`${n}`}
                hitSlop={6}
              >
                <Ionicons
                  name={n <= rating ? 'star' : 'star-outline'}
                  size={32}
                  color={n <= rating ? (p.isDark ? colors.sageLight : colors.sageDark) : p.muted}
                />
              </Pressable>
            ))}
          </View>
        </Section>

        <Section palette={palette} title={t('import.fieldTags')}>
          <View style={styles.tagWrap}>
            {tags.map((tag) => (
              <View
                key={tag}
                style={[styles.tagPillRow, { backgroundColor: p.chipBg, borderColor: p.border }]}
              >
                <Text style={[styles.tagText, { color: p.text }]}>{tag}</Text>
                <Pressable
                  onPress={() => setTags((prev) => prev.filter((x) => x !== tag))}
                  accessibilityRole="button"
                  accessibilityLabel={t('product.removeTagA11y', { tag }) as string}
                  hitSlop={8}
                  style={styles.tagRemoveHit}
                >
                  <Ionicons name="close-circle" size={20} color={p.muted} />
                </Pressable>
              </View>
            ))}
          </View>
          <View style={styles.tagAddRow}>
            <TextInput
              value={tagInput}
              onChangeText={setTagInput}
              placeholder={t('product.tagPlaceholder') as string}
              placeholderTextColor={p.placeholderColor}
              style={[
                styles.tagInput,
                { backgroundColor: p.inputBg, borderColor: p.border, color: p.text },
              ]}
              accessibilityLabel={t('product.tagPlaceholder') as string}
            />
            <Pressable
              onPress={() => {
                const next = tagInput.trim();
                if (!next || tags.includes(next)) return;
                setTags([...tags, next]);
                setTagInput('');
              }}
              style={[styles.addTagBtn, { borderColor: colors.sage }]}
              accessibilityRole="button"
              accessibilityLabel={t('product.addTag') as string}
            >
              <Text style={[styles.addTagBtnText, { color: palette.secondaryBtnLabel }]}>
                {t('product.addTag')}
              </Text>
            </Pressable>
          </View>
        </Section>

        <Section palette={palette} title={t('import.fieldInventory')}>
          <View style={styles.invGrid}>
            {INVENTORY_SEQUENCE.map((level) => {
              const sel = inventory === level;
              return (
                <Pressable
                  key={level}
                  onPress={() => setInventory(level)}
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
                    style={[styles.invOptionText, { color: sel ? colors.white : p.text }]}
                    numberOfLines={2}
                  >
                    {inventoryLabel(level)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {saveError ? (
          <Text style={styles.errText}>{saveError}</Text>
        ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  heroBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  heroBackText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  heroScreenTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.3,
    marginBottom: 10,
    textTransform: 'uppercase',
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
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
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
  tagRemoveHit: {
    padding: 2,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tagAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  addTagBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  addTagBtnText: {
    fontSize: 14,
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
  errText: {
    color: '#B00020',
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '500',
  },
});
