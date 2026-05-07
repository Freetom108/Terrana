import AsyncStorage from '@react-native-async-storage/async-storage';
import { FREE_BLEND_LIMIT, LIFETIME_LIMIT, PRO_BLEND_LIMIT } from '../../constants/limits';
import { LimitExceededError } from './errors';
import type {
  Blend,
  BlendIngredient,
  CombinationSlot,
  MixOilBase,
  MixRecipe,
  ProtocolStepRecipe,
} from '../../types/blend';
import {
  deriveDropsFromQuantityLabel,
  normalizeBlendKind,
  normalizeProtocolTiming,
} from '../../types/blend';

const STORAGE_KEY = 'terrana_blends';

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function coerceIngredient(raw: unknown): BlendIngredient | null {
  const o = asRecord(raw);
  if (!o) return null;
  const productId = typeof o.productId === 'string' ? o.productId : '';
  const productName = typeof o.productName === 'string' ? o.productName : '';
  const amount = typeof o.amount === 'number' && Number.isFinite(o.amount) ? o.amount : 0;
  const unit = typeof o.unit === 'string' ? o.unit : '';
  if (!productName.trim() && !productId.trim()) return null;
  return { productId, productName, amount, unit };
}

function coerceIngredientsArray(raw: unknown): BlendIngredient[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => coerceIngredient(x)).filter(Boolean) as BlendIngredient[];
}

function legacyDropsFromIngredient(ing: BlendIngredient): number {
  const u = ing.unit.trim().toLowerCase();
  const n = Number(ing.amount);
  if (!Number.isFinite(n)) return 0;
  if (
    u.includes('tropf') ||
    u.includes('drop') ||
    u.includes('drp') ||
    u.includes('tro')
  ) {
    return Math.max(0, Math.round(n));
  }
  return Math.max(1, Math.round(n));
}

function dropletsFromLegacyIngredients(list: BlendIngredient[]): MixRecipe['droplets'] {
  return list.map((ing) => ({
    productId: ing.productId || undefined,
    productName: ing.productName,
    drops: legacyDropsFromIngredient(ing),
  }));
}

/** Parse persisted mixRecipe / mix blob only (migration from ingredients elsewhere). */
function parseMixRecipeOnly(
  input: unknown,
): Partial<Pick<MixRecipe, 'baseOil' | 'droplets' | 'totalVolumeAmount' | 'totalVolumeUnit'>> {
  const o = asRecord(input);
  if (!o) return {};

  let baseOil: MixOilBase | undefined;
  if (typeof o.baseOilName === 'string' || typeof o.baseOilAmount === 'number' || typeof o.baseOilUnit === 'string') {
    baseOil = {
      name: typeof o.baseOilName === 'string' ? o.baseOilName || undefined : undefined,
      amount: typeof o.baseOilAmount === 'number' ? o.baseOilAmount : undefined,
      unit: typeof o.baseOilUnit === 'string' ? o.baseOilUnit : undefined,
    };
  }

  const bo = asRecord(o.baseOil);
  if (bo) {
    const nm =
      typeof bo.name === 'string'
        ? bo.name
        : typeof bo.productName === 'string'
          ? bo.productName
          : '';
    baseOil = {
      name: nm || undefined,
      amount: typeof bo.amount === 'number' ? bo.amount : undefined,
      unit: typeof bo.unit === 'string' ? bo.unit : undefined,
    };
    if (!(baseOil.name || baseOil.amount !== undefined || baseOil.unit)) baseOil = undefined;
  }

  const dr = o.droplets ?? o.dropletLines ?? o.dropletItems;
  let droplets: MixRecipe['droplets'] | undefined;
  if (Array.isArray(dr)) {
    droplets = dr
      .map((line) => {
        const lr = asRecord(line);
        if (!lr) return null;
        const productName =
          typeof lr.productName === 'string'
            ? lr.productName
            : typeof lr.name === 'string'
              ? lr.name
              : '';
        if (!productName.trim()) return null;
        const quantityLabelRaw =
          typeof lr.quantityLabel === 'string' ? lr.quantityLabel.trim() : '';
        let drops =
          typeof lr.drops === 'number' && Number.isFinite(lr.drops)
            ? Math.max(0, Math.round(lr.drops))
            : legacyDropsFromIngredient({
                productId: typeof lr.productId === 'string' ? lr.productId : '',
                productName,
                amount: typeof lr.amount === 'number' ? lr.amount : 0,
                unit: typeof lr.unit === 'string' ? lr.unit : '',
              });
        if (quantityLabelRaw) {
          const fromLabel = deriveDropsFromQuantityLabel(quantityLabelRaw);
          if (fromLabel > 0) drops = fromLabel;
        }
        const out = {
          productId: typeof lr.productId === 'string' ? lr.productId : undefined,
          productName,
          drops,
        };
        return quantityLabelRaw
          ? { ...out, quantityLabel: quantityLabelRaw }
          : out;
      })
      .filter(Boolean) as MixRecipe['droplets'];
  }

  let totalVolumeAmount: number | undefined;
  let totalVolumeUnit: string | undefined;
  if (typeof o.totalVolumeAmount === 'number' && typeof o.totalVolumeUnit === 'string') {
    totalVolumeAmount = o.totalVolumeAmount;
    totalVolumeUnit = o.totalVolumeUnit;
  }
  const tv = asRecord(o.totalVolume);
  if (tv) {
    if (typeof tv.amount === 'number') totalVolumeAmount = tv.amount;
    if (typeof tv.unit === 'string') totalVolumeUnit = tv.unit;
  }

  const out: Partial<MixRecipe> = {};
  if (baseOil) out.baseOil = baseOil;
  if (droplets?.length) out.droplets = droplets;
  if (totalVolumeAmount !== undefined && totalVolumeUnit) {
    out.totalVolumeAmount = totalVolumeAmount;
    out.totalVolumeUnit = totalVolumeUnit;
  }

  return out;
}

function buildMixRecipe(
  kindRaw: Blend['kind'],
  row: Record<string, unknown>,
  ingredients: BlendIngredient[],
): MixRecipe | undefined {
  if (kindRaw !== 'mix') return undefined;

  const partial =
    parseMixRecipeOnly(row.mixRecipe ?? row.mix ?? undefined);

  let droplets = partial.droplets ?? [];
  if (droplets.length === 0 && ingredients.length > 0) {
    droplets = dropletsFromLegacyIngredients(ingredients);
  }

  const bo = partial.baseOil;
  const usableBaseOil =
    bo &&
    ((typeof bo.name === 'string' && bo.name.trim() !== '') ||
      (typeof bo.amount === 'number' && Number.isFinite(bo.amount)) ||
      (typeof bo.unit === 'string' && bo.unit.trim() !== ''))
      ? {
          ...(typeof bo.name === 'string' && bo.name.trim() ? { name: bo.name.trim() } : {}),
          ...(typeof bo.amount === 'number' && Number.isFinite(bo.amount) ? { amount: bo.amount } : {}),
          ...(typeof bo.unit === 'string' && bo.unit.trim() ? { unit: bo.unit.trim() } : {}),
        }
      : undefined;

  const mr: MixRecipe = {
    ...(usableBaseOil && Object.keys(usableBaseOil).length > 0 ? { baseOil: usableBaseOil } : {}),
    droplets,
  };

  if (partial.totalVolumeAmount !== undefined && partial.totalVolumeUnit) {
    mr.totalVolumeAmount = partial.totalVolumeAmount;
    mr.totalVolumeUnit = partial.totalVolumeUnit;
  }

  return mr;
}

function sanitizeCombinationSlots(
  raw: unknown,
  fallbackIngredients: BlendIngredient[],
): CombinationSlot[] {
  if (!Array.isArray(raw)) {
    return fallbackIngredients.length === 0
      ? []
      : fallbackIngredients.map((ing) => ({
          productId: ing.productId || ing.productName,
          productName: ing.productName,
          applicationSite: '',
        }));
  }

  const slots = raw
    .map((item) => {
      const rec = asRecord(item);
      if (!rec) return null;
      const productId =
        typeof rec.productId === 'string'
          ? rec.productId
          : typeof rec.id === 'string'
            ? rec.id
            : '';
      const productName =
        typeof rec.productName === 'string'
          ? rec.productName
          : typeof rec.name === 'string'
            ? rec.name
            : '';
      const applicationSite =
        typeof rec.applicationSite === 'string'
          ? rec.applicationSite
          : typeof rec.application === 'string'
            ? rec.application
            : typeof rec.site === 'string'
              ? rec.site
              : '';
      if (!productName.trim() && !productId.trim()) return null;
      return {
        productId: productId || productName,
        productName: productName || productId,
        applicationSite,
      };
    })
    .filter(Boolean) as CombinationSlot[];

  return slots.length > 0
    ? slots
    : sanitizeCombinationSlots(null, fallbackIngredients);
}

function sanitizeProtocolSteps(raw: unknown): ProtocolStepRecipe[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const rec = asRecord(item);
      if (!rec) return null;
      const productName =
        typeof rec.productName === 'string'
          ? rec.productName
          : typeof rec.name === 'string'
            ? rec.name
            : '';
      if (!productName.trim()) return null;
      const timing = normalizeProtocolTiming(rec.timing);
      const productId = typeof rec.productId === 'string' ? rec.productId : undefined;
      const stepNote =
        typeof rec.stepNote === 'string'
          ? rec.stepNote
          : typeof rec.note === 'string'
            ? rec.note
            : undefined;
      return { productId, productName, timing, stepNote };
    })
    .filter(Boolean) as ProtocolStepRecipe[];
}

function finalizeBlend(row: Blend): Blend {
  const next: Blend = {
    ...row,
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    tags: Array.isArray(row.tags) ? row.tags.filter((t): t is string => typeof t === 'string') : [],
    notes: typeof row.notes === 'string' ? row.notes : '',
    description: typeof row.description === 'string' ? row.description : '',
    name: typeof row.name === 'string' ? row.name : '',
    id: typeof row.id === 'string' ? row.id : '',
    kind: normalizeBlendKind(row.kind),
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date(0).toISOString(),
    updatedAt:
      typeof row.updatedAt === 'string'
        ? row.updatedAt
        : typeof row.createdAt === 'string'
          ? row.createdAt
          : new Date(0).toISOString(),
  };

  /* Keep ingredients as legacy mirror only for MIX with droplets (optional). */
  if (next.kind === 'mix') {
    if (next.mixRecipe?.droplets?.length) {
      next.ingredients = next.mixRecipe.droplets.map((d) => {
        const ql = d.quantityLabel?.trim();
        const derived = deriveDropsFromQuantityLabel(ql);
        return {
          productId: d.productId ?? '',
          productName: d.productName,
          amount: derived > 0 ? derived : d.drops,
          unit: ql || 'drops',
        };
      });
    }
  }

  return next;
}

export function normalizeStoredBlend(raw: unknown): Blend {
  const row = asRecord(raw) ?? {};

  let ingredients = coerceIngredientsArray(row.ingredients);
  const kind = normalizeBlendKind(row.kind);

  const baseBlend: Blend = {
    id: typeof row.id === 'string' ? row.id : '',
    name: typeof row.name === 'string' ? row.name : '',
    description: typeof row.description === 'string' ? row.description : '',
    notes: typeof row.notes === 'string' ? row.notes : '',
    ingredients,
    tags: Array.isArray(row.tags)
      ? (row.tags as unknown[]).filter((t): t is string => typeof t === 'string')
      : [],
    kind,
    createdAt:
      typeof row.createdAt === 'string' ? row.createdAt : new Date(0).toISOString(),
    updatedAt:
      typeof row.updatedAt === 'string'
        ? row.updatedAt
        : typeof row.createdAt === 'string'
          ? row.createdAt
          : new Date(0).toISOString(),
  };

  if (kind === 'mix') {
    baseBlend.mixRecipe = buildMixRecipe('mix', row, ingredients);
    baseBlend.combinationSlots = undefined;
    baseBlend.protocolSteps = undefined;
    return finalizeBlend(baseBlend);
  }

  if (kind === 'combination') {
    const slots =
      sanitizeCombinationSlots(
        row.combinationSlots ?? row.combinationEntries ?? row.combination ?? null,
        ingredients,
      ) ?? [];
    baseBlend.combinationSlots = slots;
    baseBlend.mixRecipe = undefined;
    baseBlend.protocolSteps = undefined;
    baseBlend.ingredients = [];
    return finalizeBlend(baseBlend);
  }

  const stepsRaw = sanitizeProtocolSteps(row.protocolSteps ?? row.protocol);
  baseBlend.protocolSteps = stepsRaw;
  baseBlend.mixRecipe = undefined;
  baseBlend.combinationSlots = undefined;
  baseBlend.ingredients = [];
  return finalizeBlend(baseBlend);
}

async function readBlends(): Promise<Blend[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).map((b) => normalizeStoredBlend(b));
  } catch {
    return [];
  }
}

async function writeBlends(blends: Blend[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(blends));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to persist blends: ${msg}`, { cause: e });
  }
}

export async function getAllBlends(): Promise<Blend[]> {
  return readBlends();
}

export async function getBlendById(id: string): Promise<Blend | null> {
  const blends = await readBlends();
  return blends.find((b) => b.id === id) ?? null;
}

export async function saveBlend(
  blend: Blend,
  options?: { isPro?: boolean; isLifetime?: boolean },
): Promise<void> {
  const normalized = normalizeStoredBlend(blend);
  const blends = await readBlends();
  const idx = blends.findIndex((b) => b.id === normalized.id);
  if (idx >= 0) {
    blends[idx] = normalized;
  } else {
    const limit = options?.isLifetime
      ? LIFETIME_LIMIT
      : options?.isPro
        ? PRO_BLEND_LIMIT
        : FREE_BLEND_LIMIT;
    if (blends.length >= limit) {
      throw new LimitExceededError('blend', limit);
    }
    blends.push(normalized);
  }
  await writeBlends(blends);
}

/** Persist changes to an existing blend (same as saveBlend, no limit check). */
export async function updateBlend(blend: Blend): Promise<void> {
  return saveBlend(blend, { isPro: true });
}

export async function deleteBlend(id: string): Promise<void> {
  const blends = await readBlends();
  await writeBlends(blends.filter((b) => b.id !== id));
}
