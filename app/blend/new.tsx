import { colors } from '../../constants/colors';
import { usePro } from '../../hooks/usePro';
import { useThemePalette } from '../../hooks/useThemePalette';
import { t } from '../../services/i18n/i18n';
import { saveBlend } from '../../services/storage/blends';
import { LimitExceededError } from '../../services/storage/errors';
import {
  blendKindLabelKey,
  createNewBlendId,
  deriveDropsFromQuantityLabel,
  type Blend,
  type BlendKind,
  type ProtocolTiming,
} from '../../types/blend';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type MixRow = { productName: string; quantityLabel: string };
type ComboRow = { productName: string; applicationSite: string };
type ProtoRow = { productName: string; timing: ProtocolTiming; stepNote: string };

const PROTO_TIMINGS: ProtocolTiming[] = ['morning', 'evening', 'as_needed', 'flexible'];

function timingTranslationKey(tim: ProtocolTiming): string {
  switch (tim) {
    case 'morning':
      return 'blends.timingMorning';
    case 'evening':
      return 'blends.timingEvening';
    case 'as_needed':
      return 'blends.timingAsNeeded';
    case 'flexible':
      return 'blends.timingFlexible';
    default:
      return 'blends.timingMorning';
  }
}

function parsePositiveNumber(raw: string): number | undefined {
  const n = Number(String(raw).replace(',', '.').trim());
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function uniqueTrimmedTags(tags: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tags) {
    const x = t.trim();
    if (!x) continue;
    const k = x.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

export default function NewBlendScreen() {
  const palette = useThemePalette();
  const p = palette;
  const insets = useSafeAreaInsets();
  const { isPro, isLifetime } = usePro();

  const [phase, setPhase] = useState<'pick' | 'form'>('pick');
  const [kind, setKind] = useState<BlendKind>('mix');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const [baseOilName, setBaseOilName] = useState('');
  const [baseOilAmount, setBaseOilAmount] = useState('');
  const [baseOilUnit, setBaseOilUnit] = useState('');
  const [mixRows, setMixRows] = useState<MixRow[]>([{ productName: '', quantityLabel: '' }]);
  const [totalVolAmt, setTotalVolAmt] = useState('');
  const [totalVolUnit, setTotalVolUnit] = useState('');

  const [comboRows, setComboRows] = useState<ComboRow[]>([
    { productName: '', applicationSite: '' },
  ]);

  const [protoRows, setProtoRows] = useState<ProtoRow[]>([
    { productName: '', timing: 'morning', stepNote: '' },
  ]);

  const resetAllFields = useCallback(() => {
    setName('');
    setDescription('');
    setNotes('');
    setTagInput('');
    setTags([]);
    setBaseOilName('');
    setBaseOilAmount('');
    setBaseOilUnit('');
    setMixRows([{ productName: '', quantityLabel: '' }]);
    setTotalVolAmt('');
    setTotalVolUnit('');
    setComboRows([{ productName: '', applicationSite: '' }]);
    setProtoRows([{ productName: '', timing: 'morning', stepNote: '' }]);
  }, []);

  const pickKind = useCallback(
    (k: BlendKind) => {
      resetAllFields();
      setKind(k);
      setPhase('form');
    },
    [resetAllFields],
  );

  const addTag = useCallback(() => {
    const x = tagInput.trim();
    setTagInput('');
    if (!x) return;
    setTags((prev) => uniqueTrimmedTags([...prev, x]));
  }, [tagInput]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((x) => x !== tag));
  }, []);

  const buildAndSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert(t('blendNew.validationTitle') as string, t('blendNew.validationName') as string);
      return;
    }

    const nowIso = new Date().toISOString();
    const id = createNewBlendId();
    const desc = description.trim();
    const noteBlock = notes.trim();
    const tagList = uniqueTrimmedTags(tags);

    let blend: Blend = {
      id,
      name: trimmedName,
      description: desc,
      notes: noteBlock,
      ingredients: [],
      tags: tagList,
      kind,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (kind === 'mix') {
      const droplets = mixRows
        .filter((row) => row.productName.trim().length > 0)
        .map((row) => {
          const qty = row.quantityLabel.trim();
          const drops = qty ? deriveDropsFromQuantityLabel(qty) : 0;
          return {
            productName: row.productName.trim(),
            drops,
            ...(qty.length > 0 ? { quantityLabel: qty } : {}),
          };
        });

      const baseAmt = parsePositiveNumber(baseOilAmount);
      const baseName = baseOilName.trim();
      const baseUnit = baseOilUnit.trim();
      const hasBase =
        baseName.length > 0 ||
        baseAmt !== undefined ||
        baseUnit.length > 0;

      const volAmt = parsePositiveNumber(totalVolAmt);
      const volUnit = totalVolUnit.trim();

      blend = {
        ...blend,
        kind: 'mix',
        mixRecipe: {
          ...(hasBase && {
            baseOil: {
              ...(baseName ? { name: baseName } : {}),
              ...(baseAmt !== undefined ? { amount: baseAmt } : {}),
              ...(baseUnit ? { unit: baseUnit } : {}),
            },
          }),
          droplets,
          ...(volAmt !== undefined && volUnit ? { totalVolumeAmount: volAmt, totalVolumeUnit: volUnit } : {}),
        },
        combinationSlots: undefined,
        protocolSteps: undefined,
      };
    } else if (kind === 'combination') {
      const slots = comboRows
        .filter((row) => row.productName.trim().length > 0)
        .map((row) => ({
          productId: row.productName.trim(),
          productName: row.productName.trim(),
          applicationSite: row.applicationSite.trim(),
        }));

      blend = {
        ...blend,
        kind: 'combination',
        mixRecipe: undefined,
        protocolSteps: undefined,
        combinationSlots: slots,
      };
    } else {
      const steps = protoRows
        .filter((row) => row.productName.trim().length > 0)
        .map((row) => ({
          productName: row.productName.trim(),
          timing: row.timing,
          ...(row.stepNote.trim() ? { stepNote: row.stepNote.trim() } : {}),
        }));

      blend = {
        ...blend,
        kind: 'protocol',
        mixRecipe: undefined,
        combinationSlots: undefined,
        protocolSteps: steps,
      };
    }

    try {
      await saveBlend(blend, { isPro: isPro || isLifetime });
    } catch (e) {
      if (e instanceof LimitExceededError) {
        router.push('/paywall');
        return;
      }
      throw e;
    }
    router.replace(`/blend/${id}`);
  }, [
    name,
    description,
    notes,
    tags,
    kind,
    mixRows,
    baseOilName,
    baseOilAmount,
    baseOilUnit,
    totalVolAmt,
    totalVolUnit,
    comboRows,
    protoRows,
    isPro,
    isLifetime,
  ]);

  const topPad = Math.max(insets.top, 12);

  return (
    <View style={[styles.root, { backgroundColor: p.surface }]}>
      <View style={[styles.topBar, { paddingTop: topPad }]}>
        <Pressable
          onPress={() => (phase === 'form' ? setPhase('pick') : router.back())}
          style={styles.backRow}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('blendNew.a11yBack') as string}
        >
          <Ionicons name="chevron-back" size={26} color={p.secondaryBtnLabel} />
          <Text style={[styles.backText, { color: p.secondaryBtnLabel }]}>{t('general.back')}</Text>
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>{t('blendNew.screenTitle')}</Text>
        {phase === 'form' ? (
          <Text style={[styles.kindPillText, { color: p.muted }]}>
            {t(blendKindLabelKey(kind))}
          </Text>
        ) : null}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollInner,
          { paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {phase === 'pick' ? (
          <>
            <Text style={[styles.subtitle, { color: p.muted }]}>{t('blendNew.pickSubtitle')}</Text>
            <View style={styles.cardStack}>
              <Pressable
                onPress={() => pickKind('mix')}
                style={({ pressed }) => [
                  styles.kindCard,
                  { backgroundColor: p.card, borderColor: p.border },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.kindEmoji}>🧪</Text>
                <Text style={[styles.kindTitle, { color: p.text }]}>{t('blendNew.cardMixTitle')}</Text>
                <Text style={[styles.kindBody, { color: p.muted }]}>{t('blendNew.cardMixBody')}</Text>
              </Pressable>
              <Pressable
                onPress={() => pickKind('combination')}
                style={({ pressed }) => [
                  styles.kindCard,
                  { backgroundColor: p.card, borderColor: p.border },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.kindEmoji}>🔀</Text>
                <Text style={[styles.kindTitle, { color: p.text }]}>{t('blendNew.cardComboTitle')}</Text>
                <Text style={[styles.kindBody, { color: p.muted }]}>{t('blendNew.cardComboBody')}</Text>
              </Pressable>
              <Pressable
                onPress={() => pickKind('protocol')}
                style={({ pressed }) => [
                  styles.kindCard,
                  { backgroundColor: p.card, borderColor: p.border },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.kindEmoji}>📋</Text>
                <Text style={[styles.kindTitle, { color: p.text }]}>{t('blendNew.cardProtoTitle')}</Text>
                <Text style={[styles.kindBody, { color: p.muted }]}>{t('blendNew.cardProtoBody')}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Pressable
              onPress={() => {
                resetAllFields();
                setPhase('pick');
              }}
              style={styles.changeType}
              accessibilityRole="button"
            >
              <Text style={[styles.changeTypeText, { color: p.secondaryBtnLabel }]}>
                {t('blendNew.changeType')}
              </Text>
            </Pressable>

            <FieldLabel text={t('blendNew.fieldName') as string} muted={p.muted} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('blendNew.fieldNamePlaceholder') as string}
              placeholderTextColor={p.placeholderColor}
              style={[styles.input, { backgroundColor: p.inputBg, borderColor: p.border, color: p.text }]}
              accessibilityLabel={t('blendNew.fieldName') as string}
            />

            <FieldLabel text={t('blendNew.fieldDescription') as string} muted={p.muted} />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('blendNew.fieldDescriptionPlaceholder') as string}
              placeholderTextColor={p.placeholderColor}
              style={[
                styles.inputMulti,
                { backgroundColor: p.inputBg, borderColor: p.border, color: p.text },
              ]}
              multiline
              textAlignVertical="top"
            />

            {kind === 'mix' ? (
              <>
                <FieldLabel text={t('blends.detailMixCarrierHeading') as string} muted={p.muted} />
                <TextInput
                  value={baseOilName}
                  onChangeText={setBaseOilName}
                  placeholder={t('blendNew.fieldBaseOilName') as string}
                  placeholderTextColor={p.placeholderColor}
                  style={[styles.input, { backgroundColor: p.inputBg, borderColor: p.border, color: p.text }]}
                />
                <View style={styles.rowTwo}>
                  <TextInput
                    value={baseOilAmount}
                    onChangeText={setBaseOilAmount}
                    placeholder={t('blendNew.fieldBaseOilAmount') as string}
                    placeholderTextColor={p.placeholderColor}
                    keyboardType="decimal-pad"
                    style={[styles.inputGrow, { backgroundColor: p.inputBg, borderColor: p.border, color: p.text }]}
                  />
                  <TextInput
                    value={baseOilUnit}
                    onChangeText={setBaseOilUnit}
                    placeholder={t('blendNew.fieldBaseOilUnit') as string}
                    placeholderTextColor={p.placeholderColor}
                    style={[styles.inputGrow, { backgroundColor: p.inputBg, borderColor: p.border, color: p.text }]}
                  />
                </View>

                <FieldLabel text={t('blends.detailMixDropletsHeading') as string} muted={p.muted} />
                {mixRows.map((row, idx) => (
                  <View key={idx} style={[styles.ingredientCard, { borderColor: p.border, backgroundColor: p.card }]}>
                    <TextInput
                      value={row.productName}
                      onChangeText={(txt) => {
                        setMixRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, productName: txt } : r)),
                        );
                      }}
                      placeholder={t('blendNew.fieldIngredientProduct') as string}
                      placeholderTextColor={p.placeholderColor}
                      style={[styles.inputInCard, { color: p.text }]}
                    />
                    <TextInput
                      value={row.quantityLabel}
                      onChangeText={(txt) => {
                        setMixRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, quantityLabel: txt } : r)),
                        );
                      }}
                      placeholder={t('blendNew.fieldIngredientQuantity') as string}
                      placeholderTextColor={p.placeholderColor}
                      style={[styles.inputInCard, { color: p.text }]}
                    />
                    {mixRows.length > 1 ? (
                      <Pressable
                        onPress={() => setMixRows((prev) => prev.filter((_, i) => i !== idx))}
                        accessibilityRole="button"
                        accessibilityLabel={t('blendNew.removeRow') as string}
                        style={styles.removeBtn}
                      >
                        <Text style={{ color: colors.earth, fontWeight: '600' }}>
                          {t('blendNew.removeRow')}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                <Pressable
                  onPress={() => setMixRows((prev) => [...prev, { productName: '', quantityLabel: '' }])}
                  style={[styles.addBtn, { borderColor: colors.sageDark }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.addBtnText, { color: palette.secondaryBtnLabel }]}>
                    {t('blendNew.addIngredient')}
                  </Text>
                </Pressable>

                <FieldLabel text={t('blends.detailMixTotalVolumeHeading') as string} muted={p.muted} />
                <View style={styles.rowTwo}>
                  <TextInput
                    value={totalVolAmt}
                    onChangeText={setTotalVolAmt}
                    placeholder={t('blendNew.fieldTotalVolumeAmt') as string}
                    placeholderTextColor={p.placeholderColor}
                    keyboardType="decimal-pad"
                    style={[styles.inputGrow, { backgroundColor: p.inputBg, borderColor: p.border, color: p.text }]}
                  />
                  <TextInput
                    value={totalVolUnit}
                    onChangeText={setTotalVolUnit}
                    placeholder={t('blendNew.fieldTotalVolumeUnit') as string}
                    placeholderTextColor={p.placeholderColor}
                    style={[styles.inputGrow, { backgroundColor: p.inputBg, borderColor: p.border, color: p.text }]}
                  />
                </View>
              </>
            ) : null}

            {kind === 'combination' ? (
              <>
                <FieldLabel text={t('blends.detailComboHeading') as string} muted={p.muted} />
                {comboRows.map((row, idx) => (
                  <View key={idx} style={[styles.ingredientCard, { borderColor: p.border, backgroundColor: p.card }]}>
                    <TextInput
                      value={row.productName}
                      onChangeText={(txt) => {
                        setComboRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, productName: txt } : r)),
                        );
                      }}
                      placeholder={t('blendNew.fieldComboProduct') as string}
                      placeholderTextColor={p.placeholderColor}
                      style={[styles.inputInCard, { color: p.text }]}
                    />
                    <TextInput
                      value={row.applicationSite}
                      onChangeText={(txt) => {
                        setComboRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, applicationSite: txt } : r)),
                        );
                      }}
                      placeholder={t('blendNew.fieldComboSite') as string}
                      placeholderTextColor={p.placeholderColor}
                      style={[styles.inputInCard, { color: p.text }]}
                    />
                    {comboRows.length > 1 ? (
                      <Pressable
                        onPress={() => setComboRows((prev) => prev.filter((_, i) => i !== idx))}
                        accessibilityRole="button"
                        accessibilityLabel={t('blendNew.removeRow') as string}
                        style={styles.removeBtn}
                      >
                        <Text style={{ color: colors.earth, fontWeight: '600' }}>
                          {t('blendNew.removeRow')}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                <Pressable
                  onPress={() =>
                    setComboRows((prev) => [...prev, { productName: '', applicationSite: '' }])
                  }
                  style={[styles.addBtn, { borderColor: colors.sageDark }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.addBtnText, { color: palette.secondaryBtnLabel }]}>
                    {t('blendNew.addProduct')}
                  </Text>
                </Pressable>
              </>
            ) : null}

            {kind === 'protocol' ? (
              <>
                <FieldLabel text={t('blends.detailProtocolHeading') as string} muted={p.muted} />
                {protoRows.map((row, idx) => (
                  <View key={idx} style={[styles.ingredientCard, { borderColor: p.border, backgroundColor: p.card }]}>
                    <TextInput
                      value={row.productName}
                      onChangeText={(txt) => {
                        setProtoRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, productName: txt } : r)),
                        );
                      }}
                      placeholder={t('blendNew.fieldStepProduct') as string}
                      placeholderTextColor={p.placeholderColor}
                      style={[styles.inputInCard, { color: p.text }]}
                    />
                    <Text style={[styles.timingLabel, { color: p.muted }]}>
                      {t('blendNew.fieldStepTiming')}
                    </Text>
                    <View style={styles.timingRow}>
                      {PROTO_TIMINGS.map((tim) => {
                        const sel = row.timing === tim;
                        return (
                          <Pressable
                            key={tim}
                            onPress={() => {
                              setProtoRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, timing: tim } : r)),
                              );
                            }}
                            style={[
                              styles.timingChip,
                              {
                                backgroundColor: sel ? colors.sageDark : p.inputBg,
                                borderColor: sel ? colors.sageDark : p.border,
                              },
                            ]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: sel }}
                          >
                            <Text
                              style={[
                                styles.timingChipText,
                                { color: sel ? colors.white : p.text },
                              ]}
                              numberOfLines={1}
                            >
                              {t(timingTranslationKey(tim))}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <TextInput
                      value={row.stepNote}
                      onChangeText={(txt) => {
                        setProtoRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, stepNote: txt } : r)),
                        );
                      }}
                      placeholder={t('blendNew.fieldStepNote') as string}
                      placeholderTextColor={p.placeholderColor}
                      style={[
                        styles.inputInCard,
                        { color: p.text, minHeight: 72, textAlignVertical: 'top' },
                      ]}
                      multiline
                    />
                    {protoRows.length > 1 ? (
                      <Pressable
                        onPress={() => setProtoRows((prev) => prev.filter((_, i) => i !== idx))}
                        accessibilityRole="button"
                        accessibilityLabel={t('blendNew.removeRow') as string}
                        style={styles.removeBtn}
                      >
                        <Text style={{ color: colors.earth, fontWeight: '600' }}>
                          {t('blendNew.removeRow')}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                <Pressable
                  onPress={() =>
                    setProtoRows((prev) => [
                      ...prev,
                      { productName: '', timing: 'morning', stepNote: '' },
                    ])
                  }
                  style={[styles.addBtn, { borderColor: colors.sageDark }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.addBtnText, { color: palette.secondaryBtnLabel }]}>
                    {t('blendNew.addStep')}
                  </Text>
                </Pressable>
              </>
            ) : null}

            <FieldLabel text={t('blendNew.fieldNotes') as string} muted={p.muted} />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={t('import.fieldNotesPlaceholder') as string}
              placeholderTextColor={p.placeholderColor}
              style={[
                styles.inputMulti,
                { backgroundColor: p.inputBg, borderColor: p.border, color: p.text },
              ]}
              multiline
              textAlignVertical="top"
            />

            <FieldLabel text={t('blendNew.fieldTags') as string} muted={p.muted} />
            <View style={styles.tagRow}>
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                placeholder={t('blendNew.tagPlaceholder') as string}
                placeholderTextColor={p.placeholderColor}
                style={[
                  styles.tagInput,
                  { backgroundColor: p.inputBg, borderColor: p.border, color: p.text },
                ]}
                onSubmitEditing={addTag}
              />
              <Pressable
                onPress={addTag}
                style={[styles.tagAdd, { borderColor: colors.sageDark }]}
                accessibilityRole="button"
              >
                <Text style={[styles.addBtnText, { color: palette.secondaryBtnLabel }]}>
                  {t('blendNew.addTag')}
                </Text>
              </Pressable>
            </View>
            <View style={styles.tagWrap}>
              {tags.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => removeTag(tag)}
                  style={[styles.tagPill, { backgroundColor: p.chipBg, borderColor: p.border }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('blendNew.removeTagA11y', { tag }) as string}
                >
                  <Text style={[styles.tagText, { color: p.text }]}>{tag}</Text>
                  <Ionicons name="close-circle" size={18} color={p.muted} style={{ marginLeft: 4 }} />
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => void buildAndSave()}
              style={[styles.savePill, { backgroundColor: colors.sageDark }]}
              accessibilityRole="button"
            >
              <Text style={styles.savePillText}>{t('blendNew.save')}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function FieldLabel({ text, muted }: { text: string; muted: string }) {
  return <Text style={[styles.fieldLabel, { color: muted }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 17, fontWeight: '600', marginLeft: 2 },
  title: { fontSize: 22, fontWeight: '700' },
  kindPillText: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  subtitle: { fontSize: 15, lineHeight: 22, fontWeight: '500', marginBottom: 16 },
  scroll: { flex: 1 },
  scrollInner: { paddingHorizontal: 20, paddingTop: 8 },
  cardStack: { gap: 12 },
  kindCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 18,
  },
  pressed: { opacity: 0.88 },
  kindEmoji: { fontSize: 32, marginBottom: 8 },
  kindTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  kindBody: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  changeType: { alignSelf: 'flex-start', marginBottom: 14 },
  changeTypeText: { fontSize: 15, fontWeight: '700' },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputMulti: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
  },
  rowTwo: { flexDirection: 'row', gap: 10, marginTop: 8 },
  inputGrow: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  ingredientCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  inputInCard: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.35)',
    paddingVertical: 8,
    fontSize: 16,
  },
  removeBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  addBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  addBtnText: { fontSize: 15, fontWeight: '700' },
  timingLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: 4,
  },
  timingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timingChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  timingChipText: { fontSize: 12, fontWeight: '700' },
  tagRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 },
  tagInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  tagAdd: { borderRadius: 12, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 14 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tagText: { fontSize: 14, fontWeight: '600' },
  savePill: {
    marginTop: 24,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  savePillText: { color: colors.white, fontSize: 17, fontWeight: '700' },
});
