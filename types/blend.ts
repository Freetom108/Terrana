export const BLEND_KINDS = ['mix', 'combination', 'protocol'] as const;

export type BlendKind = (typeof BLEND_KINDS)[number];

export interface BlendIngredient {
  productId: string;
  productName: string;
  amount: number;
  unit: string;
}

/** Mix: physical bottle — optional carrier oil + droplets + optional total volume. */
export interface MixOilBase {
  name?: string;
  amount?: number;
  unit?: string;
}

export interface MixDropletLine {
  productId?: string;
  productName: string;
  drops: number;
  /** Free-form quantity, e.g. "5 Tropfen" (preferred for display when set). */
  quantityLabel?: string;
}

export interface MixRecipe {
  baseOil?: MixOilBase;
  droplets: MixDropletLine[];
  totalVolumeAmount?: number;
  totalVolumeUnit?: string;
}

/** Combination: products used in parallel — application site, no doses. */
export interface CombinationSlot {
  productId: string;
  productName: string;
  applicationSite: string;
}

export type ProtocolTiming = 'morning' | 'evening' | 'as_needed' | 'flexible';

export interface ProtocolStepRecipe {
  productId?: string;
  productName: string;
  timing: ProtocolTiming;
  stepNote?: string;
}

export interface Blend {
  id: string;
  name: string;
  /** Short overview / intent (optional). */
  description: string;
  notes: string;
  ingredients: BlendIngredient[];
  tags: string[];
  kind: BlendKind;
  createdAt: string;
  updatedAt: string;
  /** kind === mix */
  mixRecipe?: MixRecipe;
  /** kind === combination */
  combinationSlots?: CombinationSlot[];
  /** kind === protocol */
  protocolSteps?: ProtocolStepRecipe[];
}

/** Used in list cards etc. — count type-specific rows. */
export function blendStructuredItemCount(blend: Blend): number {
  switch (blend.kind) {
    case 'mix':
      return blend.mixRecipe?.droplets?.length ?? blend.ingredients.length ?? 0;
    case 'combination':
      return blend.combinationSlots?.length ?? blend.ingredients.length ?? 0;
    case 'protocol':
    default:
      return blend.protocolSteps?.length ?? 0;
  }
}

/** Normalize timing from storage or corrupted values */
export function normalizeProtocolTiming(value: unknown): ProtocolTiming {
  if (value === 'morning' || value === 'evening' || value === 'as_needed' || value === 'flexible')
    return value;
  if (value === 'asNeeded' || value === 'as-needed') return 'as_needed';
  if (value === 'choice' || value === 'wahl' || value === 'wahlfrei') return 'flexible';
  return 'morning';
}

/** Storage / upgrades: coerce unknown persisted value to BlendKind */
export function normalizeBlendKind(value: unknown): BlendKind {
  if (value === 'mix' || value === 'combination' || value === 'protocol') return value;
  return 'mix';
}

/** i18n key passed to `t(...)` — lives under locales `blends.*` */
export function blendKindLabelKey(kind: BlendKind): string {
  switch (kind) {
    case 'mix':
      return 'blends.kindMix';
    case 'combination':
      return 'blends.kindCombination';
    case 'protocol':
    default:
      return 'blends.kindProtocol';
  }
}

/** Derive a numeric drop count hint from a human quantity string (fallback 0). */
export function deriveDropsFromQuantityLabel(label: string | undefined): number {
  if (!label || typeof label !== 'string') return 0;
  const m = label.trim().replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

export function createNewBlendId(): string {
  return `bl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Deep clone for editing. */
export function cloneBlend(b: Blend): Blend {
  return {
    ...b,
    ingredients: b.ingredients.map((i) => ({ ...i })),
    tags: [...b.tags],
    mixRecipe: b.mixRecipe
      ? {
          baseOil: b.mixRecipe.baseOil ? { ...b.mixRecipe.baseOil } : undefined,
          droplets: b.mixRecipe.droplets.map((d) => ({ ...d })),
          totalVolumeAmount: b.mixRecipe.totalVolumeAmount,
          totalVolumeUnit: b.mixRecipe.totalVolumeUnit,
        }
      : undefined,
    combinationSlots: b.combinationSlots?.map((s) => ({ ...s })),
    protocolSteps: b.protocolSteps?.map((s) => ({ ...s })),
  };
}
