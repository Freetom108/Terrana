import { categoryLabelKey } from '../../constants/categories';
import { colors } from '../../constants/colors';
import { usePro } from '../../hooks/usePro';
import { useProducts } from '../../hooks/useProducts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { subscribeLocale, t } from '../../services/i18n/i18n';
import { exportBlendAsPDF, printBlend } from '../../services/export/pdfExport';
import { shareBlend } from '../../services/export/shareService';
import { deleteBlend, getBlendById, updateBlend } from '../../services/storage/blends';
import {
  blendKindLabelKey,
  blendStructuredItemCount,
  cloneBlend,
  deriveDropsFromQuantityLabel,
  type Blend,
  type MixDropletLine,
  type ProtocolTiming,
} from '../../types/blend';
import type { Product } from '../../types/product';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PROTO_TIMINGS: ProtocolTiming[] = ['morning', 'evening', 'as_needed', 'flexible'];

function formatLocalizedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

function protocolTimingKey(timing: ProtocolTiming): string {
  switch (timing) {
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

function mixLineText(row: MixDropletLine): string {
  const q = row.quantityLabel?.trim();
  if (q) return `${row.productName}: ${q}`;
  return t('blends.detailMixDropRow', { product: row.productName, drops: row.drops }) as string;
}

function mixBaseOilText(blend: Blend): string | null {
  const oil = blend.mixRecipe?.baseOil;
  if (!oil) return null;
  const name = typeof oil.name === 'string' ? oil.name.trim() : '';
  const hasAmt = typeof oil.amount === 'number' && Number.isFinite(oil.amount);
  const unit = typeof oil.unit === 'string' ? oil.unit.trim() : '';
  if (name && hasAmt && unit) {
    return t('blends.detailMixCarrierLineFull', {
      name,
      amount: oil.amount as number,
      unit,
    }) as string;
  }
  if (name && hasAmt) {
    return t('blends.detailMixCarrierNameAmount', { name, amount: oil.amount as number }) as string;
  }
  if (hasAmt && unit) {
    return t('blends.detailMixCarrierAmountUnit', {
      amount: oil.amount as number,
      unit,
    }) as string;
  }
  if (name) return (t('blends.detailMixCarrierNameOnly', { name }) as string).trim();
  return null;
}

function heroSubtitleForBlend(blend: Blend): string {
  switch (blend.kind) {
    case 'mix': {
      const c = blendStructuredItemCount(blend);
      return t(c === 1 ? 'blends.heroSubtitleMixOne' : 'blends.heroSubtitleMixOther', {
        count: c,
      }) as string;
    }
    case 'combination':
      return t('blends.heroSubtitleCombo', {
        count: blend.combinationSlots?.length ?? 0,
      }) as string;
    case 'protocol':
    default:
      return t('blends.heroSubtitleProtocol', {
        count: blend.protocolSteps?.length ?? 0,
      }) as string;
  }
}

function uniqueTrimmedTags(tags: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of tags) {
    const s = x.trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function parsePositiveNumber(raw: string): number | undefined {
  const n = Number(String(raw).replace(',', '.').trim());
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function pickerProductMatchesQuery(product: Product, q: string): boolean {
  if (product.name.toLowerCase().includes(q)) return true;
  if (product.brand.toLowerCase().includes(q)) return true;
  const catLabel = String(t(categoryLabelKey(product.category))).toLowerCase();
  if (catLabel.includes(q)) return true;
  if (product.category.toLowerCase().includes(q)) return true;
  return false;
}

/** Working copy for the editor with non-empty list rows where needed. */
function ensureDraftForEdit(b: Blend): Blend {
  const c = cloneBlend(b);
  if (c.kind === 'mix') {
    const mr = c.mixRecipe ?? { droplets: [] };
    const droplets = [...(mr.droplets ?? [])];
    if (droplets.length === 0) droplets.push({ productName: '', drops: 0 });
    c.mixRecipe = {
      baseOil: mr.baseOil ? { ...mr.baseOil } : undefined,
      droplets,
      totalVolumeAmount: mr.totalVolumeAmount,
      totalVolumeUnit: mr.totalVolumeUnit,
    };
  }
  if (c.kind === 'combination') {
    const slots = [...(c.combinationSlots ?? [])];
    if (slots.length === 0) {
      slots.push({ productId: '', productName: '', applicationSite: '' });
    }
    c.combinationSlots = slots;
  }
  if (c.kind === 'protocol') {
    const steps = [...(c.protocolSteps ?? [])];
    if (steps.length === 0) {
      steps.push({ productName: '', timing: 'morning' });
    }
    c.protocolSteps = steps;
  }
  return c;
}

export default function BlendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const blendId = typeof id === 'string' ? id : '';
  const insets = useSafeAreaInsets();
  const palette = useThemePalette();
  const p = palette;
  const { isPro, isLifetime } = usePro();
  const { products } = useProducts();

  const [, redrawLocale] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeLocale(redrawLocale), []);

  const [blend, setBlend] = useState<Blend | null | undefined>(undefined);

  const [carrierPickerOpen, setCarrierPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Blend | null>(null);
  const [tagInput, setTagInput] = useState('');

  const [baseOilAmountStr, setBaseOilAmountStr] = useState('');
  const [totalVolAmtStr, setTotalVolAmtStr] = useState('');

  useEffect(() => {
    setEditing(false);
    setDraft(null);
    setTagInput('');
    setBaseOilAmountStr('');
    setTotalVolAmtStr('');
    setCarrierPickerOpen(false);
    setPickerSearch('');
  }, [blendId]);

  useFocusEffect(
    useCallback(() => {
      if (editing) {
        return () => {};
      }
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
    }, [blendId, editing]),
  );

  const enterEdit = useCallback(() => {
    if (!blend) return;
    const d = ensureDraftForEdit(blend);
    setDraft(d);
    const amt = d.mixRecipe?.baseOil?.amount;
    setBaseOilAmountStr(
      amt !== undefined && Number.isFinite(amt) ? String(amt) : '',
    );
    const tv = d.mixRecipe?.totalVolumeAmount;
    setTotalVolAmtStr(tv !== undefined && Number.isFinite(tv) ? String(tv) : '');
    setTagInput('');
    setCarrierPickerOpen(false);
    setPickerSearch('');
    setEditing(true);
  }, [blend]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setDraft(null);
    setTagInput('');
    setBaseOilAmountStr('');
    setTotalVolAmtStr('');
    setCarrierPickerOpen(false);
    setPickerSearch('');
  }, []);

  const carrierOilCount = useMemo(
    () => products.filter((x) => x.category === 'carrierOil').length,
    [products],
  );

  const carrierPickerPool = useMemo(
    () => (carrierPickerOpen ? products.filter((x) => x.category === 'carrierOil') : []),
    [carrierPickerOpen, products],
  );

  const filteredCarrierPickerProducts = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return carrierPickerPool;
    return carrierPickerPool.filter((prod) => pickerProductMatchesQuery(prod, q));
  }, [carrierPickerPool, pickerSearch, redrawLocale]);

  const carrierPickerEmptyMessage = useMemo(() => {
    if (!carrierPickerOpen) return '';
    if (carrierPickerPool.length === 0) return String(t('blendNew.pickerEmptyCarrier'));
    return String(t('blendNew.pickerNoResults'));
  }, [carrierPickerOpen, carrierPickerPool.length]);

  const openCarrierPicker = useCallback(() => {
    setPickerSearch('');
    setCarrierPickerOpen(true);
  }, []);

  const selectCarrierProduct = useCallback((picked: Product) => {
    setDraft((prev) => {
      if (!prev || prev.kind !== 'mix' || !prev.mixRecipe) return prev;
      return {
        ...prev,
        mixRecipe: {
          ...prev.mixRecipe,
          baseOil: { ...(prev.mixRecipe.baseOil ?? {}), name: picked.name },
        },
      };
    });
    setCarrierPickerOpen(false);
    setPickerSearch('');
  }, []);

  const closeCarrierPicker = useCallback(() => {
    setCarrierPickerOpen(false);
    setPickerSearch('');
  }, []);

  const commitSave = useCallback(async () => {
    if (!draft) return;
    const nameTrim = draft.name.trim();
    if (!nameTrim) {
      Alert.alert(t('blendNew.validationTitle') as string, t('blendNew.validationName') as string);
      return;
    }

    let next = cloneBlend({
      ...draft,
      name: nameTrim,
      description: draft.description.trim(),
      notes: draft.notes.trim(),
      tags: uniqueTrimmedTags(draft.tags),
      updatedAt: new Date().toISOString(),
    });

    if (next.kind === 'mix') {
      const mr = next.mixRecipe ?? { droplets: [] };
      const baseAmt = parsePositiveNumber(baseOilAmountStr);
      const bo = mr.baseOil;
      const baseName = (bo?.name ?? '').trim();
      const baseUnit = (bo?.unit ?? '').trim();
      const hasBase = baseName.length > 0 || baseAmt !== undefined || baseUnit.length > 0;
      const droplets = (mr.droplets ?? [])
        .filter((row) => row.productName.trim().length > 0)
        .map((row) => {
          const q = row.quantityLabel?.trim() ?? '';
          const drops =
            q.length > 0 ? deriveDropsFromQuantityLabel(q) || row.drops : row.drops;
          return {
            productId: row.productId,
            productName: row.productName.trim(),
            drops,
            ...(q.length > 0 ? { quantityLabel: q } : {}),
          };
        });

      const volAmt = parsePositiveNumber(totalVolAmtStr);
      const volUnit = (mr.totalVolumeUnit ?? '').trim();

      next = {
        ...next,
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
          ...(volAmt !== undefined && volUnit
            ? { totalVolumeAmount: volAmt, totalVolumeUnit: volUnit }
            : { totalVolumeAmount: undefined, totalVolumeUnit: undefined }),
        },
        combinationSlots: undefined,
        protocolSteps: undefined,
      };
    } else if (next.kind === 'combination') {
      const slots = (next.combinationSlots ?? [])
        .filter((s) => s.productName.trim().length > 0)
        .map((s) => {
          const pn = s.productName.trim();
          return {
            productId: s.productId?.trim() || pn,
            productName: pn,
            applicationSite: s.applicationSite.trim(),
          };
        });
      next = {
        ...next,
        kind: 'combination',
        combinationSlots: slots,
        mixRecipe: undefined,
        protocolSteps: undefined,
        ingredients: [],
      };
    } else {
      const steps = (next.protocolSteps ?? [])
        .filter((st) => st.productName.trim().length > 0)
        .map((st) => ({
          productId: st.productId,
          productName: st.productName.trim(),
          timing: st.timing,
          ...(st.stepNote?.trim() ? { stepNote: st.stepNote.trim() } : {}),
        }));
      next = {
        ...next,
        kind: 'protocol',
        protocolSteps: steps,
        mixRecipe: undefined,
        combinationSlots: undefined,
        ingredients: [],
      };
    }

    await updateBlend(next);
    setBlend(next);
    setEditing(false);
    setDraft(null);
    setTagInput('');
    setBaseOilAmountStr('');
    setTotalVolAmtStr('');
    setCarrierPickerOpen(false);
    setPickerSearch('');
  }, [draft, baseOilAmountStr, totalVolAmtStr]);

  const addTagToDraft = useCallback(() => {
    const x = tagInput.trim();
    setTagInput('');
    if (!x || !draft) return;
    setDraft({ ...draft, tags: uniqueTrimmedTags([...draft.tags, x]) });
  }, [draft, tagInput]);

  const handleDelete = useCallback(() => {
    if (!blend) return;
    Alert.alert(
      t('blend.deleteTitle') as string,
      t('blend.deleteMessage', { name: blend.name }) as string,
      [
        { text: t('general.cancel') as string, style: 'cancel' },
        {
          text: t('blend.deleteConfirm') as string,
          style: 'destructive',
          onPress: () => {
            void deleteBlend(blend.id).then(() => {
              router.replace('/(tabs)');
            });
          },
        },
      ],
    );
  }, [blend]);

  const handleShare = useCallback(() => {
    if (!blend) return;
    if (!isPro && !isLifetime) {
      router.push('/paywall');
      return;
    }
    void shareBlend(blend).catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Share', msg);
    });
  }, [blend, isPro, isLifetime]);

  const handlePdfPrint = useCallback(() => {
    if (!blend) return;
    if (!isPro && !isLifetime) {
      router.push('/paywall');
      return;
    }
    const actions: Parameters<typeof Alert.alert>[2] = [
      {
        text: 'PDF',
        onPress: () => void exportBlendAsPDF(blend).catch((e) => {
          const msg = e instanceof Error ? e.message : String(e);
          Alert.alert('PDF', msg);
        }),
      },
    ];
    if (isLifetime) {
      actions.push({
        text: t('pdf.print') as string,
        onPress: () => void printBlend(blend).catch((e) => {
          const msg = e instanceof Error ? e.message : String(e);
          Alert.alert('Print', msg);
        }),
      });
    }
    actions.push({ text: t('general.cancel') as string, style: 'cancel' });
    Alert.alert(blend.name, undefined, actions);
  }, [blend, isPro, isLifetime]);

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

  const display: Blend = draft ?? blend;

  const notes = display.notes.trim();
  const description = display.description.trim();
  const kindLabel = t(blendKindLabelKey(display.kind)) as string;
  const heroSubtitle = heroSubtitleForBlend(display);

  const baseOilLine = display.kind === 'mix' ? mixBaseOilText(display) : null;

  const mixDroplets = display.kind === 'mix' ? (display.mixRecipe?.droplets ?? []) : [];
  const comboSlots = display.kind === 'combination' ? (display.combinationSlots ?? []) : [];
  const protoSteps = display.kind === 'protocol' ? (display.protocolSteps ?? []) : [];
  const totalVol =
    display.kind === 'mix' &&
    display.mixRecipe?.totalVolumeAmount !== undefined &&
    display.mixRecipe?.totalVolumeUnit
      ? {
          amt: display.mixRecipe!.totalVolumeAmount!,
          u: display.mixRecipe!.totalVolumeUnit!,
        }
      : null;

  return (
    <>
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
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel="Share"
                style={styles.iconBtn}
                hitSlop={12}
              >
                <Ionicons name="share-outline" size={24} color={colors.white} />
              </Pressable>
              <Pressable
                onPress={handlePdfPrint}
                accessibilityRole="button"
                accessibilityLabel="PDF / Print"
                style={styles.iconBtn}
                hitSlop={12}
              >
                <Ionicons name="document-text-outline" size={24} color={colors.white} />
              </Pressable>
              <Pressable
                onPress={handleDelete}
                accessibilityRole="button"
                accessibilityLabel={t('blend.deleteTitle') as string}
                style={styles.iconBtn}
                hitSlop={12}
              >
                <Ionicons name="trash-outline" size={24} color={colors.white} />
              </Pressable>
              <Pressable
                onPress={enterEdit}
                accessibilityRole="button"
                accessibilityLabel={t('blend.edit')}
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
              placeholder={t('blendNew.fieldNamePlaceholder') as string}
              placeholderTextColor="rgba(255,255,255,0.55)"
              style={styles.heroNameInput}
              maxLength={200}
            />
            <View style={styles.heroKindBadge}>
              <Text style={styles.heroKindBadgeText}>{kindLabel}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.heroTitle} numberOfLines={3}>
              {display.name}
            </Text>
            <View style={styles.heroKindWrap}>
              <Text style={styles.heroKind}>{kindLabel}</Text>
            </View>
            <Text style={styles.heroCategory}>{heroSubtitle}</Text>
          </>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollInner, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!editing ? (
          <Text style={[styles.editHint, { color: p.muted }]}>{t('blendEdit.readOnlyHint')}</Text>
        ) : null}

        <Section palette={palette} title={t('blendNew.fieldDescription')}>
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
            />
          ) : (
            <Text style={[styles.body, { color: p.text }]}>{description.length > 0 ? description : '—'}</Text>
          )}
        </Section>

        {display.kind === 'mix' ? (
          <>
            <Section palette={palette} title={t('blends.detailMixCarrierHeading')}>
              {editing && draft && draft.kind === 'mix' && draft.mixRecipe ? (
                <>
                  <View style={[styles.editCard, { borderColor: p.border, backgroundColor: p.card }]}>
                    <View style={styles.pickRow}>
                      <TextInput
                        value={draft.mixRecipe.baseOil?.name ?? ''}
                        onChangeText={(txt) =>
                          setDraft({
                            ...draft,
                            mixRecipe: {
                              ...draft.mixRecipe!,
                              baseOil: { ...(draft.mixRecipe!.baseOil ?? {}), name: txt },
                            },
                          })
                        }
                        placeholder={t('blendNew.fieldBaseOilName') as string}
                        placeholderTextColor={p.placeholderColor}
                        style={[styles.inputInCard, styles.pickInput, { color: p.text }]}
                      />
                      {carrierOilCount > 0 ? (
                        <Pressable
                          onPress={openCarrierPicker}
                          style={styles.pickBtn}
                          accessibilityRole="button"
                          accessibilityLabel={t('blendNew.pickFromCollection') as string}
                          hitSlop={8}
                        >
                          <Ionicons name="add-circle-outline" size={24} color={colors.sage} />
                        </Pressable>
                      ) : null}
                    </View>
                    {carrierOilCount > 0 ? (
                      <Text style={[styles.pickHint, { color: p.muted }]}>
                        {t('blendNew.pickCarrierOilHint')}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.rowTwo}>
                    <TextInput
                      value={baseOilAmountStr}
                      onChangeText={setBaseOilAmountStr}
                      placeholder={t('blendNew.fieldBaseOilAmount') as string}
                      placeholderTextColor={p.placeholderColor}
                      keyboardType="decimal-pad"
                      style={[
                        styles.inputGrow,
                        { backgroundColor: p.inputBg, borderColor: p.border, color: p.text },
                      ]}
                    />
                    <TextInput
                      value={draft.mixRecipe.baseOil?.unit ?? ''}
                      onChangeText={(txt) =>
                        setDraft({
                          ...draft,
                          mixRecipe: {
                            ...draft.mixRecipe!,
                            baseOil: { ...(draft.mixRecipe!.baseOil ?? {}), unit: txt },
                          },
                        })
                      }
                      placeholder={t('blendNew.fieldBaseOilUnit') as string}
                      placeholderTextColor={p.placeholderColor}
                      style={[
                        styles.inputGrow,
                        { backgroundColor: p.inputBg, borderColor: p.border, color: p.text },
                      ]}
                    />
                  </View>
                </>
              ) : baseOilLine ? (
                <Text style={[styles.body, { color: p.text }]}>{baseOilLine}</Text>
              ) : (
                <Text style={[styles.body, { color: p.muted }]}>—</Text>
              )}
            </Section>

            <Section palette={palette} title={t('blends.detailMixDropletsHeading')}>
              {editing && draft && draft.kind === 'mix' && draft.mixRecipe ? (
                <>
                  {draft.mixRecipe.droplets.map((row, idx) => (
                    <View
                      key={`m-${idx}`}
                      style={[styles.editCard, { borderColor: p.border, backgroundColor: p.card }]}
                    >
                      <TextInput
                        value={row.productName}
                        onChangeText={(txt) => {
                          const droplets = [...draft.mixRecipe!.droplets];
                          droplets[idx] = { ...row, productName: txt };
                          setDraft({
                            ...draft,
                            mixRecipe: { ...draft.mixRecipe!, droplets },
                          });
                        }}
                        placeholder={t('blendNew.fieldIngredientProduct') as string}
                        placeholderTextColor={p.placeholderColor}
                        style={[styles.inputInCard, { color: p.text }]}
                      />
                      <TextInput
                        value={row.quantityLabel ?? ''}
                        onChangeText={(txt) => {
                          const droplets = [...draft.mixRecipe!.droplets];
                          const drops = deriveDropsFromQuantityLabel(txt) || row.drops;
                          droplets[idx] = {
                            ...row,
                            quantityLabel: txt,
                            drops,
                          };
                          setDraft({
                            ...draft,
                            mixRecipe: { ...draft.mixRecipe!, droplets },
                          });
                        }}
                        placeholder={t('blendNew.fieldIngredientQuantity') as string}
                        placeholderTextColor={p.placeholderColor}
                        style={[styles.inputInCard, { color: p.text }]}
                      />
                      {(draft.mixRecipe?.droplets.length ?? 0) > 1 ? (
                        <Pressable
                          onPress={() => {
                            const droplets = draft.mixRecipe!.droplets.filter((_, i) => i !== idx);
                            setDraft({
                              ...draft,
                              mixRecipe: { ...draft.mixRecipe!, droplets },
                            });
                          }}
                          accessibilityRole="button"
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
                      setDraft({
                        ...draft,
                        mixRecipe: {
                          ...draft.mixRecipe!,
                          droplets: [
                            ...draft.mixRecipe!.droplets,
                            { productName: '', drops: 0, quantityLabel: '' },
                          ],
                        },
                      })
                    }
                    style={[styles.addOutline, { borderColor: colors.sageDark }]}
                  >
                    <Text style={[styles.addOutlineText, { color: p.secondaryBtnLabel }]}>
                      {t('blendNew.addIngredient')}
                    </Text>
                  </Pressable>
                </>
              ) : mixDroplets.length === 0 ? (
                <Text style={[styles.body, { color: p.muted }]}>—</Text>
              ) : (
                <View style={styles.usageList}>
                  {mixDroplets.map((row) => (
                    <Text
                      key={`${row.productName}-${row.drops}-${row.productId ?? ''}-${row.quantityLabel ?? ''}`}
                      style={[styles.usageRow, { color: p.text }]}
                    >
                      {mixLineText(row)}
                    </Text>
                  ))}
                </View>
              )}
            </Section>

            <Section palette={palette} title={t('blends.detailMixTotalVolumeHeading')}>
              {editing && draft && draft.kind === 'mix' && draft.mixRecipe ? (
                <View style={styles.rowTwo}>
                  <TextInput
                    value={totalVolAmtStr}
                    onChangeText={setTotalVolAmtStr}
                    placeholder={t('blendNew.fieldTotalVolumeAmt') as string}
                    placeholderTextColor={p.placeholderColor}
                    keyboardType="decimal-pad"
                    style={[
                      styles.inputGrow,
                      { backgroundColor: p.inputBg, borderColor: p.border, color: p.text },
                    ]}
                  />
                  <TextInput
                    value={draft.mixRecipe.totalVolumeUnit ?? ''}
                    onChangeText={(txt) =>
                      setDraft({
                        ...draft,
                        mixRecipe: { ...draft.mixRecipe!, totalVolumeUnit: txt },
                      })
                    }
                    placeholder={t('blendNew.fieldTotalVolumeUnit') as string}
                    placeholderTextColor={p.placeholderColor}
                    style={[
                      styles.inputGrow,
                      { backgroundColor: p.inputBg, borderColor: p.border, color: p.text },
                    ]}
                  />
                </View>
              ) : totalVol ? (
                <View style={[styles.infoBand, { backgroundColor: p.card, borderColor: p.border }]}>
                  <Text style={[styles.bodyEmph, { color: p.text }]}>
                    {t('blends.detailMixTotalVolumeBody', {
                      amount: totalVol.amt,
                      unit: totalVol.u,
                    })}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.body, { color: p.muted }]}>—</Text>
              )}
            </Section>
          </>
        ) : null}

        {display.kind === 'combination' ? (
          <Section palette={palette} title={t('blends.detailComboHeading')}>
            {editing && draft && draft.kind === 'combination' ? (
              <>
                {(draft.combinationSlots ?? []).map((slot, idx) => (
                  <View
                    key={`c-${idx}`}
                    style={[styles.editCard, { borderColor: p.border, backgroundColor: p.card }]}
                  >
                    <TextInput
                      value={slot.productName}
                      onChangeText={(txt) => {
                        const slots = [...(draft.combinationSlots ?? [])];
                        slots[idx] = { ...slot, productName: txt };
                        setDraft({ ...draft, combinationSlots: slots });
                      }}
                      placeholder={t('blendNew.fieldComboProduct') as string}
                      placeholderTextColor={p.placeholderColor}
                      style={[styles.inputInCard, { color: p.text }]}
                    />
                    <TextInput
                      value={slot.applicationSite}
                      onChangeText={(txt) => {
                        const slots = [...(draft.combinationSlots ?? [])];
                        slots[idx] = { ...slot, applicationSite: txt };
                        setDraft({ ...draft, combinationSlots: slots });
                      }}
                      placeholder={t('blendNew.fieldComboSite') as string}
                      placeholderTextColor={p.placeholderColor}
                      style={[styles.inputInCard, { color: p.text }]}
                    />
                    {(draft.combinationSlots ?? []).length > 1 ? (
                      <Pressable
                        onPress={() => {
                          const slots = (draft.combinationSlots ?? []).filter((_, i) => i !== idx);
                          setDraft({ ...draft, combinationSlots: slots });
                        }}
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
                    setDraft({
                      ...draft,
                      combinationSlots: [
                        ...(draft.combinationSlots ?? []),
                        { productId: '', productName: '', applicationSite: '' },
                      ],
                    })
                  }
                  style={[styles.addOutline, { borderColor: colors.sageDark }]}
                >
                  <Text style={[styles.addOutlineText, { color: p.secondaryBtnLabel }]}>
                    {t('blendNew.addProduct')}
                  </Text>
                </Pressable>
              </>
            ) : comboSlots.length === 0 ? (
              <Text style={[styles.body, { color: p.muted }]}>—</Text>
            ) : (
              <View style={styles.usageList}>
                {comboSlots.map((slot, idx) => (
                  <View
                    key={`${slot.productId}-${slot.productName}-${idx}`}
                    style={[styles.comboCard, { backgroundColor: p.card, borderColor: p.border }]}
                  >
                    <Text style={[styles.comboProduct, { color: p.text }]}>{slot.productName}</Text>
                    <Text style={[styles.comboSiteLabel, { color: p.muted }]}>
                      {t('blends.detailComboSiteLabel')}
                    </Text>
                    <Text style={[styles.comboSiteValue, { color: p.text }]}>
                      {slot.applicationSite.trim() ? slot.applicationSite : '—'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Section>
        ) : null}

        {display.kind === 'protocol' ? (
          <Section palette={palette} title={t('blends.detailProtocolHeading')}>
            {editing && draft && draft.kind === 'protocol' ? (
              <>
                {(draft.protocolSteps ?? []).map((step, idx) => (
                  <View
                    key={`p-${idx}`}
                    style={[styles.editCard, { borderColor: p.border, backgroundColor: p.card }]}
                  >
                    <TextInput
                      value={step.productName}
                      onChangeText={(txt) => {
                        const steps = [...(draft.protocolSteps ?? [])];
                        steps[idx] = { ...step, productName: txt };
                        setDraft({ ...draft, protocolSteps: steps });
                      }}
                      placeholder={t('blendNew.fieldStepProduct') as string}
                      placeholderTextColor={p.placeholderColor}
                      style={[styles.inputInCard, { color: p.text }]}
                    />
                    <Text style={[styles.timingSectionLabel, { color: p.muted }]}>
                      {t('blendNew.fieldStepTiming')}
                    </Text>
                    <View style={styles.timingRow}>
                      {PROTO_TIMINGS.map((tim) => {
                        const sel = step.timing === tim;
                        return (
                          <Pressable
                            key={tim}
                            onPress={() => {
                              const steps = [...(draft.protocolSteps ?? [])];
                              steps[idx] = { ...step, timing: tim };
                              setDraft({ ...draft, protocolSteps: steps });
                            }}
                            style={[
                              styles.timingChip,
                              {
                                backgroundColor: sel ? colors.sageDark : p.inputBg,
                                borderColor: sel ? colors.sageDark : p.border,
                              },
                            ]}
                            accessibilityState={{ selected: sel }}
                          >
                            <Text
                              style={[styles.timingChipText, { color: sel ? colors.white : p.text }]}
                              numberOfLines={1}
                            >
                              {t(protocolTimingKey(tim))}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <TextInput
                      value={step.stepNote ?? ''}
                      onChangeText={(txt) => {
                        const steps = [...(draft.protocolSteps ?? [])];
                        steps[idx] = { ...step, stepNote: txt };
                        setDraft({ ...draft, protocolSteps: steps });
                      }}
                      placeholder={t('blendNew.fieldStepNote') as string}
                      placeholderTextColor={p.placeholderColor}
                      style={[styles.inputInCard, { color: p.text, minHeight: 72 }]}
                      multiline
                      textAlignVertical="top"
                    />
                    {(draft.protocolSteps ?? []).length > 1 ? (
                      <Pressable
                        onPress={() => {
                          const steps = (draft.protocolSteps ?? []).filter((_, i) => i !== idx);
                          setDraft({ ...draft, protocolSteps: steps });
                        }}
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
                    setDraft({
                      ...draft,
                      protocolSteps: [
                        ...(draft.protocolSteps ?? []),
                        { productName: '', timing: 'morning' },
                      ],
                    })
                  }
                  style={[styles.addOutline, { borderColor: colors.sageDark }]}
                >
                  <Text style={[styles.addOutlineText, { color: p.secondaryBtnLabel }]}>
                    {t('blendNew.addStep')}
                  </Text>
                </Pressable>
              </>
            ) : protoSteps.length === 0 ? (
              <Text style={[styles.body, { color: p.muted }]}>—</Text>
            ) : (
              <View style={styles.usageList}>
                {protoSteps.map((step, idx) => (
                  <View
                    key={`${step.productName}-${idx}`}
                    style={[styles.protocolCard, { backgroundColor: p.card, borderColor: p.border }]}
                  >
                    <Text style={[styles.stepTitle, { color: p.text }]}>
                      {t('blends.detailProtocolStepLine', {
                        step: idx + 1,
                        product: step.productName,
                      })}
                    </Text>
                    <Text style={[styles.timingTag, { color: p.secondaryBtnLabel }]}>
                      {t(protocolTimingKey(step.timing))}
                    </Text>
                    {step.stepNote?.trim() ? (
                      <Text style={[styles.stepNote, { color: p.muted }]}>{step.stepNote.trim()}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </Section>
        ) : null}

        <Section palette={palette} title={t('import.fieldNotes')}>
          {editing && draft ? (
            <TextInput
              value={draft.notes}
              onChangeText={(txt) => setDraft({ ...draft, notes: txt })}
              style={[
                styles.inputMulti,
                { backgroundColor: p.inputBg, borderColor: p.border, color: p.text },
              ]}
              placeholder={t('import.fieldNotesPlaceholder') as string}
              placeholderTextColor={p.placeholderColor}
              multiline
              textAlignVertical="top"
            />
          ) : (
            <Text style={[styles.body, { color: p.text }]}>{notes.length > 0 ? notes : '—'}</Text>
          )}
        </Section>

        <Section palette={palette} title={t('import.fieldTags')}>
          {editing && draft ? (
            <>
              <View style={styles.tagRow}>
                <TextInput
                  value={tagInput}
                  onChangeText={setTagInput}
                  placeholder={t('blendNew.tagPlaceholder') as string}
                  placeholderTextColor={p.placeholderColor}
                  style={[
                    styles.tagInputField,
                    { backgroundColor: p.inputBg, borderColor: p.border, color: p.text },
                  ]}
                  onSubmitEditing={addTagToDraft}
                />
                <Pressable
                  onPress={addTagToDraft}
                  style={[styles.tagAddBtn, { borderColor: colors.sageDark }]}
                >
                  <Text style={{ color: p.secondaryBtnLabel, fontWeight: '700' }}>
                    {t('blendNew.addTag')}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.tagWrap}>
                {draft.tags.map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() =>
                      setDraft({ ...draft, tags: draft.tags.filter((x) => x !== tag) })
                    }
                    style={[styles.tagPill, { backgroundColor: p.chipBg, borderColor: p.border }]}
                    accessibilityLabel={t('blendNew.removeTagA11y', { tag }) as string}
                  >
                    <Text style={[styles.tagText, { color: p.text }]}>{tag}</Text>
                    <Ionicons name="close-circle" size={18} color={p.muted} style={{ marginLeft: 4 }} />
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.tagWrap}>
              {display.tags.length === 0 ? (
                <Text style={[styles.body, { color: p.muted }]}>—</Text>
              ) : (
                display.tags.map((tag) => (
                  <View
                    key={tag}
                    style={[styles.tagPill, { backgroundColor: p.chipBg, borderColor: p.border }]}
                  >
                    <Text style={[styles.tagText, { color: p.text }]}>{tag}</Text>
                  </View>
                ))
              )}
            </View>
          )}
        </Section>

        <Section palette={palette} title={t('blends.detailCreatedHeading')}>
          <Text style={[styles.body, { color: p.text }]}>{formatLocalizedDate(display.createdAt)}</Text>
        </Section>

      </ScrollView>
    </View>

      <Modal
        visible={carrierPickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeCarrierPicker}
      >
        <View style={[styles.pickerRoot, { backgroundColor: p.surface }]}>
          <View style={[styles.pickerHeader, { borderBottomColor: p.border }]}>
            <Text style={[styles.pickerTitle, { color: p.text }]}>
              {t('blendNew.pickerTitleCarrierOil') as string}
            </Text>
            <Pressable onPress={closeCarrierPicker} hitSlop={12} accessibilityRole="button">
              <Ionicons name="close" size={24} color={p.secondaryBtnLabel} />
            </Pressable>
          </View>

          <View style={[styles.pickerSearchWrap, { borderBottomColor: p.border }]}>
            <Ionicons name="search-outline" size={18} color={p.muted} style={{ marginRight: 8 }} />
            <TextInput
              value={pickerSearch}
              onChangeText={setPickerSearch}
              placeholder={t('blendNew.pickerSearch') as string}
              placeholderTextColor={p.placeholderColor}
              style={[styles.pickerSearchInput, { color: p.text }]}
              autoFocus
              clearButtonMode="while-editing"
            />
          </View>

          {filteredCarrierPickerProducts.length === 0 ? (
            <View style={styles.pickerEmpty}>
              <Text style={[styles.pickerEmptyText, { color: p.muted }]}>{carrierPickerEmptyMessage}</Text>
            </View>
          ) : (
            <FlatList
              data={filteredCarrierPickerProducts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => selectCarrierProduct(item)}
                  style={({ pressed }) => [
                    styles.pickerItem,
                    { borderBottomColor: p.border },
                    pressed && { backgroundColor: p.card },
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.pickerItemName, { color: p.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.brand ? (
                    <Text style={[styles.pickerItemSub, { color: p.muted }]} numberOfLines={1}>
                      {item.brand}
                    </Text>
                  ) : null}
                </Pressable>
              )}
            />
          )}
        </View>
      </Modal>
    </>
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
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroTextBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  heroTextBtnStrong: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  heroActionText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  heroActionTextStrong: {
    color: colors.sageLight,
    fontSize: 16,
    fontWeight: '800',
  },
  iconBtn: {
    padding: 4,
  },
  heroNameInput: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 10,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.35)',
  },
  heroKindBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  heroKindBadgeText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  editHint: {
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
  },
  inputMulti: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
  },
  rowTwo: { flexDirection: 'row', gap: 10, marginTop: 10 },
  inputGrow: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  editCard: {
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
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickInput: { flex: 1 },
  pickBtn: { padding: 4 },
  pickHint: { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  addOutline: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  addOutlineText: { fontSize: 15, fontWeight: '700' },
  timingSectionLabel: {
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
    paddingHorizontal: 10,
  },
  timingChipText: { fontSize: 11, fontWeight: '700' },
  tagRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 },
  tagInputField: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  tagAddBtn: { borderRadius: 12, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 14 },
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
    marginBottom: 12,
    lineHeight: 34,
  },
  heroKindWrap: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  heroKind: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
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
  bodyEmph: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
  },
  usageList: {
    gap: 12,
  },
  usageRow: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  infoBand: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  comboCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  comboProduct: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  comboSiteLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  comboSiteValue: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
  },
  protocolCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 6,
  },
  timingTag: {
    alignSelf: 'flex-start',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.35,
    marginBottom: 4,
  },
  stepNote: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pickerRoot: { flex: 1 },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerTitle: { fontSize: 18, fontWeight: '700' },
  pickerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerSearchInput: { flex: 1, fontSize: 16 },
  pickerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  pickerEmptyText: { fontSize: 15, textAlign: 'center' },
  pickerItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerItemName: { fontSize: 16, fontWeight: '600' },
  pickerItemSub: { fontSize: 13, marginTop: 2 },
});
