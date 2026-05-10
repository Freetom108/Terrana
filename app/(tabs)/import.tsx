import type { ProductCategory } from '../../constants/categories';
import {
  PRODUCT_CATEGORIES,
  categoryLabelKey,
  resolveProductCategory,
} from '../../constants/categories';
import { colors } from '../../constants/colors';
import { FREE_IMPORT_DISPLAY_MAX, FREE_IMPORT_LIMIT, FREE_IMPORT_WARN } from '../../constants/limits';
import { useImportLimit } from '../../hooks/useImportLimit';
import { usePro } from '../../hooks/usePro';
import type { ThemePalette } from '../../hooks/useThemePalette';
import { useThemePalette } from '../../hooks/useThemePalette';
import { extractProductFromText } from '../../services/ai/extractor';
import { subscribeLocale, t } from '../../services/i18n/i18n';
import { LimitExceededError } from '../../services/storage/errors';
import { saveProduct } from '../../services/storage/products';
import type { InventoryLevel, Product } from '../../types/product';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useReducer, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function parseList(s: string): string[] {
  return s
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

type FormState = {
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  userNotes: string;
  usagesText: string;
  tagsText: string;
  inventory: InventoryLevel;
};

const EMPTY_FORM: FormState = {
  name: '',
  brand: '',
  category: 'other',
  description: '',
  userNotes: '',
  usagesText: '',
  tagsText: '',
  inventory: 'full',
};

const INVENTORY_OPTIONS: { value: InventoryLevel; labelKey: string }[] = [
  { value: 'full', labelKey: 'import.inventoryFull' },
  { value: 'medium', labelKey: 'import.inventoryMedium' },
  { value: 'low', labelKey: 'import.inventoryLow' },
  { value: 'empty', labelKey: 'import.inventoryEmpty' },
];

function FieldBlock({
  palette,
  labelKey,
  value,
  onChangeText,
  multiline,
  minHeight,
  placeholder,
}: {
  palette: ThemePalette;
  labelKey:
    | 'import.fieldProductName'
    | 'import.fieldBrand'
    | 'import.fieldCategory'
    | 'import.fieldDescription'
    | 'import.fieldUsages'
    | 'import.fieldTags';
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  minHeight?: number;
  placeholder?: string;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, { color: palette.muted }]}>
        ✏️ {t(labelKey)}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={palette.placeholderColor}
        style={[
          styles.fieldInput,
          multiline && styles.fieldInputMulti,
          {
            backgroundColor: palette.inputBg,
            borderColor: palette.border,
            color: palette.text,
          },
          minHeight !== undefined ? { minHeight } : null,
        ]}
      />
    </View>
  );
}

export default function ImportTab() {
  const palette = useThemePalette();
  const router = useRouter();
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const { isPro, isLifetime } = usePro();
  const { canImport, importsUsed, incrementImport, refresh } = useImportLimit({ isPro, isLifetime });
  const isFreeUser = !isPro && !isLifetime;
  const showImportProgress = isFreeUser && importsUsed >= FREE_IMPORT_WARN;

  useEffect(() => subscribeLocale(redraw), []);

  const [sourceText, setSourceText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saveError, setSaveError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const resetFlow = () => {
    setSourceText('');
    setError(null);
    setSaveError(null);
    setShowResult(false);
    setForm(EMPTY_FORM);
    setLoading(false);
  };

  const handleDetect = async () => {
    const text = sourceText.trim();
    if (!text || loading) return;
    /** Block before API call: free tier has exactly FREE_IMPORT_LIMIT runs (counts after success). */
    if (isFreeUser && importsUsed >= FREE_IMPORT_LIMIT) {
      router.push('/paywall');
      return;
    }
    setError(null);
    setSaveError(null);
    setLoading(true);
    try {
      if (__DEV__) {
        console.log('[Import] extractProductFromText: calling API', { inputLength: text.length });
      }
      const result = await extractProductFromText(text);
      if (__DEV__) {
        console.log('[Import] extractProductFromText: response', {
          ok: result.success,
          error: result.success ? undefined : result.error,
        });
      }
      if (!result.success) {
        setError(result.error);
        return;
      }
      const d = result.data;
      setForm({
        name: d.productName,
        brand: d.brand,
        category: resolveProductCategory(d.category),
        description: d.notes,
        userNotes: '',
        usagesText: d.usage.join('\n'),
        tagsText: d.tags.join(', '),
        inventory: 'full',
      });
      setShowResult(true);
      try {
        await incrementImport();
      } catch (inc) {
        if (__DEV__) console.warn('[Import] incrementImport failed', inc);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (__DEV__) console.warn('[Import] extractProductFromText: threw', e);
      setError(msg || t('import.retry'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    const name = form.name.trim();
    if (!name) {
      setSaveError(t('import.fieldProductName'));
      return;
    }
    try {
      const now = new Date().toISOString();
      const desc = form.description.trim();
      const savedProduct: Product = {
        id: newId(),
        name,
        brand: form.brand.trim(),
        category: form.category,
        description: desc,
        notes: form.userNotes.trim(),
        usages: parseList(form.usagesText),
        tags: parseList(form.tagsText),
        rating: 3,
        inventory: form.inventory,
        createdAt: now,
        updatedAt: now,
      };
      await saveProduct(savedProduct, { isPro: isPro || isLifetime, isLifetime });
      resetFlow();
      router.push('/product/' + savedProduct.id);
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
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.surface }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: palette.text }]}>{t('import.screenTitle')}</Text>
          <Text style={[styles.pasteTip, { color: colors.mid }]}>{t('import.pasteTip')}</Text>

          {/* Import progress bar for free users near limit */}
          {showImportProgress && (
            <View style={[styles.importProgressWrap, { backgroundColor: palette.isDark ? '#3D2E1A' : '#FFF3E0', borderColor: '#E6A817' }]}>
              <View style={styles.importProgressRow}>
                <Text style={[styles.importProgressText, { color: palette.isDark ? '#FFD580' : '#8A5A00' }]}>
                  {t('limits.importProgress', {
                    used: Math.min(importsUsed, FREE_IMPORT_DISPLAY_MAX),
                    max: FREE_IMPORT_DISPLAY_MAX,
                  }) as string}
                </Text>
                <Pressable onPress={() => router.push('/paywall')} hitSlop={8}>
                  <Text style={[styles.importProgressLink, { color: palette.isDark ? '#FFD580' : '#8A5A00' }]}>
                    {t('limits.upgradeLink') as string}
                  </Text>
                </Pressable>
              </View>
              <View style={[styles.importProgressBar, { backgroundColor: palette.isDark ? '#5A4020' : '#FFD9A0' }]}>
                <View
                  style={[
                    styles.importProgressFill,
                    {
                      backgroundColor: importsUsed >= FREE_IMPORT_LIMIT ? '#E65C00' : '#E6A817',
                      width: `${Math.min(
                        100,
                        (Math.min(importsUsed, FREE_IMPORT_DISPLAY_MAX) / FREE_IMPORT_DISPLAY_MAX) * 100,
                      )}%` as `${number}%`,
                    },
                  ]}
                />
              </View>
              {importsUsed >= FREE_IMPORT_DISPLAY_MAX - 1 ? (
                <Text style={[styles.importNearLimit, { color: palette.isDark ? '#FFD580' : '#8A5A00' }]}>
                  {t('limits.importNearLimit') as string}
                </Text>
              ) : null}
            </View>
          )}

          {!canImport && !showResult ? (
            <>
              <Pressable
                style={[
                  styles.upgradeBox,
                  {
                    backgroundColor: palette.isDark ? 'rgba(122,158,126,0.22)' : colors.sageLight,
                    borderColor: colors.sage,
                  },
                ]}
                onPress={() => router.push('/paywall')}
                accessibilityRole="button"
              >
                <Text style={[styles.upgradeText, { color: palette.isDark ? colors.sageLight : colors.sageDark }]}>
                  {t('import.upgradeMessage') as string}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/product/new')}
                style={styles.manualAddLinkWrap}
                hitSlop={{ top: 8, bottom: 8 }}
                accessibilityRole="link"
              >
                <Text style={[styles.manualAddLinkText, { color: colors.mid }]}>
                  {t('import.addProductManually')}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                value={sourceText}
                onChangeText={setSourceText}
                placeholder={t('import.pastePlaceholder')}
                placeholderTextColor={palette.placeholderColor}
                multiline
                editable={!loading && !showResult}
                style={[
                  styles.sourceInput,
                  {
                    minHeight: 220,
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
              />

              {error ? (
                <View style={styles.errorBanner} accessibilityRole="alert">
                  <Text style={styles.errorText} selectable>
                    {error}
                  </Text>
                </View>
              ) : null}

              {!showResult ? (
                <>
                  <Pressable
                    style={({ pressed }) => [
                      styles.detectBtn,
                      (pressed || loading || !sourceText.trim()) && styles.detectBtnDim,
                    ]}
                    onPress={() => void handleDetect()}
                    disabled={loading || !sourceText.trim()}
                  >
                    {loading ? (
                      <View style={styles.rowCenter}>
                        <ActivityIndicator color={colors.white} style={styles.spinner} />
                        <Text style={styles.detectBtnText}>{t('import.detecting')}</Text>
                      </View>
                    ) : (
                      <Text style={styles.detectBtnText}>{t('import.detect')}</Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => router.push('/product/new')}
                    style={styles.manualAddLinkWrap}
                    hitSlop={{ top: 8, bottom: 8 }}
                    accessibilityRole="link"
                  >
                    <Text style={[styles.manualAddLinkText, { color: colors.mid }]}>
                      {t('import.addProductManually')}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <View style={[styles.resultCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
                  <Text style={[styles.resultHeading, { color: palette.text }]}>{t('import.resultTitle')}</Text>

                  <FieldBlock
                    palette={palette}
                    labelKey="import.fieldProductName"
                    value={form.name}
                    onChangeText={(name) => setForm((f) => ({ ...f, name }))}
                    placeholder={t('import.fieldPlaceholderName')}
                  />
                  <FieldBlock
                    palette={palette}
                    labelKey="import.fieldBrand"
                    value={form.brand}
                    onChangeText={(brand) => setForm((f) => ({ ...f, brand }))}
                    placeholder="Wikipedia"
                  />
                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabel, { color: palette.muted }]}>
                      ✏️ {t('import.fieldCategory')}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoryChipRow}
                    >
                      {PRODUCT_CATEGORIES.map((cat) => {
                        const sel = form.category === cat;
                        return (
                          <Pressable
                            key={cat}
                            onPress={() => setForm((f) => ({ ...f, category: cat }))}
                            style={[
                              styles.categoryChip,
                              {
                                borderColor: sel ? colors.sageDark : palette.border,
                                backgroundColor: sel ? colors.sageDark : palette.inputBg,
                              },
                            ]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: sel }}
                          >
                            <Text
                              style={[
                                styles.categoryChipText,
                                { color: sel ? colors.white : palette.text },
                              ]}
                            >
                              {t(categoryLabelKey(cat)) as string}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                  <FieldBlock
                    palette={palette}
                    labelKey="import.fieldDescription"
                    value={form.description}
                    onChangeText={(description) => setForm((f) => ({ ...f, description }))}
                    multiline
                    minHeight={100}
                  />
                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabel, { color: palette.muted }]}>{t('import.fieldNotes')}</Text>
                    <TextInput
                      value={form.userNotes}
                      onChangeText={(userNotes) => setForm((f) => ({ ...f, userNotes }))}
                      multiline
                      placeholder={t('import.fieldNotesPlaceholder')}
                      placeholderTextColor={palette.placeholderColor}
                      style={[
                        styles.fieldInput,
                        styles.fieldInputMulti,
                        styles.notesInput,
                        {
                          backgroundColor: palette.inputBg,
                          borderColor: palette.border,
                          color: palette.text,
                        },
                      ]}
                    />
                  </View>
                  <FieldBlock
                    palette={palette}
                    labelKey="import.fieldUsages"
                    value={form.usagesText}
                    onChangeText={(usagesText) => setForm((f) => ({ ...f, usagesText }))}
                    multiline
                    minHeight={80}
                  />
                  <FieldBlock
                    palette={palette}
                    labelKey="import.fieldTags"
                    value={form.tagsText}
                    onChangeText={(tagsText) => setForm((f) => ({ ...f, tagsText }))}
                    multiline
                    minHeight={72}
                  />

                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabel, styles.inventorySectionLabel, { color: palette.muted }]}>
                      {t('import.fieldInventory')}
                    </Text>
                    <View style={styles.inventoryRow}>
                      {INVENTORY_OPTIONS.map(({ value, labelKey: invLabelKey }) => {
                        const selected = form.inventory === value;
                        return (
                          <Pressable
                            key={value}
                            style={[
                              styles.inventoryBtn,
                              {
                                backgroundColor: palette.inputBg,
                                borderColor: palette.border,
                              },
                              selected && styles.inventoryBtnSelected,
                            ]}
                            onPress={() =>
                              setForm((f) => ({
                                ...f,
                                inventory: value,
                              }))
                            }
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                          >
                            <Text
                              style={[
                                styles.inventoryBtnText,
                                selected && styles.inventoryBtnTextSelected,
                                { color: selected ? colors.white : palette.muted },
                              ]}
                              numberOfLines={2}
                              adjustsFontSizeToFit
                              minimumFontScale={0.75}
                              maxFontSizeMultiplier={1.1}
                            >
                              {t(invLabelKey)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}

                  <View style={styles.footerRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.secondaryBtn,
                        { borderColor: colors.sage },
                        pressed && styles.pressed,
                      ]}
                      onPress={resetFlow}
                    >
                      <Text style={[styles.secondaryBtnText, { color: palette.secondaryBtnLabel }]}>
                        {t('import.resetAgain')}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.primaryFooterBtn, pressed && styles.pressed]}
                      onPress={() => void handleSave()}
                    >
                      <Text style={styles.primaryFooterBtnText}>{t('import.saveEmoji')}</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  sourceInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  pasteTip: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
    marginBottom: 20,
  },
  errorBanner: {
    borderLeftWidth: 4,
    borderLeftColor: '#B00020',
    backgroundColor: 'rgba(176, 0, 32, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorText: {
    color: '#B00020',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  detectBtn: {
    backgroundColor: colors.sage,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  detectBtnDim: {
    opacity: 0.75,
  },
  manualAddLinkWrap: {
    alignSelf: 'center',
    paddingVertical: 10,
    marginBottom: 4,
  },
  manualAddLinkText: {
    fontSize: 13,
    fontWeight: '500',
  },
  detectBtnText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: { marginRight: 10 },
  resultCard: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  resultHeading: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  fieldBlock: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  fieldInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  fieldInputMulti: {
    textAlignVertical: 'top',
  },
  categoryChipRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    paddingVertical: 4,
    paddingRight: 4,
  },
  categoryChip: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notesInput: {
    minHeight: 80,
  },
  inventorySectionLabel: {
    marginBottom: 8,
  },
  inventoryRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    columnGap: 6,
    marginBottom: 2,
  },
  inventoryBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 3,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 44,
  },
  inventoryBtnSelected: {
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDark,
  },
  inventoryBtnText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  inventoryBtnTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.sage,
    alignItems: 'center',
    marginRight: 6,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryFooterBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.sage,
    alignItems: 'center',
    marginLeft: 6,
  },
  primaryFooterBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  pressed: {
    opacity: 0.9,
  },
  upgradeBox: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
  },
  upgradeText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '600',
  },
  importProgressWrap: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  importProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  importProgressText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  importProgressLink: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  importProgressBar: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  importProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  importNearLimit: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
