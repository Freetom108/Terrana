import { colors } from '../../constants/colors';
import { PRODUCT_CATEGORIES } from '../../constants/categories';
import type { ProductCategory } from '../../constants/categories';
import { FREE_IMPORT_LIMIT } from '../../constants/limits';
import { useImportLimit } from '../../hooks/useImportLimit';
import { extractProductFromText } from '../../services/ai/extractor';
import { t } from '../../services/i18n/i18n';
import { saveProduct } from '../../services/storage/products';
import type { InventoryLevel, Product } from '../../types/product';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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

function toCategory(raw: string): ProductCategory {
  const s = raw.trim();
  if (PRODUCT_CATEGORIES.includes(s as ProductCategory)) {
    return s as ProductCategory;
  }
  const lower = s.toLowerCase();
  return PRODUCT_CATEGORIES.find((c) => c.toLowerCase() === lower) ?? 'Sonstiges';
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

type FormState = {
  name: string;
  brand: string;
  category: string;
  description: string;
  userNotes: string;
  usagesText: string;
  tagsText: string;
  inventory: InventoryLevel;
};

const EMPTY_FORM: FormState = {
  name: '',
  brand: '',
  category: '',
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
  labelKey,
  value,
  onChangeText,
  multiline,
  minHeight,
  placeholder,
}: {
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
      <Text style={styles.fieldLabel}>
        ✏️ {t(labelKey)}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={colors.mid}
        style={[
          styles.fieldInput,
          multiline && styles.fieldInputMulti,
          minHeight !== undefined ? { minHeight } : null,
        ]}
      />
    </View>
  );
}

export default function ImportTab() {
  const router = useRouter();
  const { canImport, incrementImport, refresh } = useImportLimit();

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
    setError(null);
    setSaveError(null);
    setLoading(true);
    try {
      console.log('[Import] extractProductFromText: calling API', {
        inputLength: text.length,
      });
      const result = await extractProductFromText(text);
      console.log('[Import] extractProductFromText: response', {
        ok: result.success,
        error: result.success ? undefined : result.error,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      const d = result.data;
      setForm({
        name: d.productName,
        brand: '',
        category: d.category,
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
        console.warn('[Import] incrementImport failed', inc);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[Import] extractProductFromText: threw', e);
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
        category: toCategory(form.category),
        description: desc,
        notes: form.userNotes.trim(),
        usages: parseList(form.usagesText),
        tags: parseList(form.tagsText),
        rating: 3,
        inventory: form.inventory,
        createdAt: now,
        updatedAt: now,
      };
      await saveProduct(savedProduct);
      resetFlow();
      router.push('/product/' + savedProduct.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSaveError(msg);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{t('import.screenTitle')}</Text>
          <Text style={styles.subtitle}>{t('import.screenSubtitle')}</Text>

          {!canImport ? (
            <View style={styles.upgradeBox}>
              <Text style={styles.upgradeText}>
                {t('import.upgradeMessage', { limit: FREE_IMPORT_LIMIT })}
              </Text>
            </View>
          ) : (
            <>
              <TextInput
                value={sourceText}
                onChangeText={setSourceText}
                placeholder={t('import.pastePlaceholder')}
                placeholderTextColor={colors.mid}
                multiline
                editable={!loading && !showResult}
                style={[styles.sourceInput, { minHeight: 150 }]}
              />
              <Text style={styles.pasteTip}>{t('import.pasteTip')}</Text>

              {error ? (
                <View style={styles.errorBanner} accessibilityRole="alert">
                  <Text style={styles.errorText} selectable>
                    {error}
                  </Text>
                </View>
              ) : null}

              {!showResult ? (
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
              ) : (
                <View style={styles.resultCard}>
                  <Text style={styles.resultHeading}>{t('import.resultTitle')}</Text>

                  <FieldBlock
                    labelKey="import.fieldProductName"
                    value={form.name}
                    onChangeText={(name) => setForm((f) => ({ ...f, name }))}
                    placeholder={t('import.fieldPlaceholderName')}
                  />
                  <FieldBlock
                    labelKey="import.fieldBrand"
                    value={form.brand}
                    onChangeText={(brand) => setForm((f) => ({ ...f, brand }))}
                  />
                  <FieldBlock
                    labelKey="import.fieldCategory"
                    value={form.category}
                    onChangeText={(category) => setForm((f) => ({ ...f, category }))}
                  />
                  <FieldBlock
                    labelKey="import.fieldDescription"
                    value={form.description}
                    onChangeText={(description) => setForm((f) => ({ ...f, description }))}
                    multiline
                    minHeight={100}
                  />
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>{t('import.fieldNotes')}</Text>
                    <TextInput
                      value={form.userNotes}
                      onChangeText={(userNotes) => setForm((f) => ({ ...f, userNotes }))}
                      multiline
                      placeholder={t('import.fieldNotesPlaceholder')}
                      placeholderTextColor={colors.mid}
                      style={[
                        styles.fieldInput,
                        styles.fieldInputMulti,
                        styles.notesInput,
                      ]}
                    />
                  </View>
                  <FieldBlock
                    labelKey="import.fieldUsages"
                    value={form.usagesText}
                    onChangeText={(usagesText) => setForm((f) => ({ ...f, usagesText }))}
                    multiline
                    minHeight={80}
                  />
                  <FieldBlock
                    labelKey="import.fieldTags"
                    value={form.tagsText}
                    onChangeText={(tagsText) => setForm((f) => ({ ...f, tagsText }))}
                    multiline
                    minHeight={72}
                  />

                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabel, styles.inventorySectionLabel]}>
                      {t('import.fieldInventory')}
                    </Text>
                    <View style={styles.inventoryRow}>
                      {INVENTORY_OPTIONS.map(({ value, labelKey }) => {
                        const selected = form.inventory === value;
                        return (
                          <Pressable
                            key={value}
                            style={[
                              styles.inventoryBtn,
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
                              ]}
                              numberOfLines={2}
                              adjustsFontSizeToFit
                              minimumFontScale={0.75}
                              maxFontSizeMultiplier={1.1}
                            >
                              {t(labelKey)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}

                  <View style={styles.footerRow}>
                    <Pressable
                      style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                      onPress={resetFlow}
                    >
                      <Text style={styles.secondaryBtnText}>{t('import.resetAgain')}</Text>
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
    backgroundColor: colors.cream,
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
    color: colors.dark,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: colors.mid,
    marginBottom: 20,
    lineHeight: 22,
  },
  sourceInput: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.sageLight,
    padding: 14,
    fontSize: 16,
    color: colors.dark,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  pasteTip: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.mid,
    marginBottom: 14,
    opacity: 0.9,
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
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.sageLight,
    padding: 16,
  },
  resultHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: 14,
  },
  fieldBlock: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mid,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: colors.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sageLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.dark,
  },
  fieldInputMulti: {
    textAlignVertical: 'top',
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
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.sageLight,
    minHeight: 44,
  },
  inventoryBtnSelected: {
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDark,
  },
  inventoryBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mid,
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
    color: colors.sageDark,
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
    backgroundColor: colors.sageLight,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.sage,
  },
  upgradeText: {
    fontSize: 15,
    color: colors.sageDark,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '600',
  },
});
