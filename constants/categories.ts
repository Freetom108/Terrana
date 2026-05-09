/**
 * Internal product category keys (stored in AsyncStorage & `Product.category`).
 * Display strings live in locales under `categories.<id>`.
 */
export const PRODUCT_CATEGORY_IDS = [
  'essentialOil',
  'carrierOil',
  'herbTea',
  'supplement',
  'bachFlower',
  'other',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORY_IDS)[number];

export const PRODUCT_CATEGORIES: readonly ProductCategory[] = PRODUCT_CATEGORY_IDS;

export function isProductCategory(raw: string): raw is ProductCategory {
  return (PRODUCT_CATEGORY_IDS as readonly string[]).includes(raw);
}

export function categoryLabelKey(cat: ProductCategory): string {
  return `categories.${cat}`;
}

function normCategoryLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Legacy stored German labels + English UI strings → current id */
const LEGACY_LABEL_TO_ID: Record<string, ProductCategory> = {
  'ätherisches öl': 'essentialOil',
  supplement: 'supplement',
  'kraut & tee': 'herbTea',
  pflege: 'other',
  mischung: 'other',
  sonstiges: 'other',
};

/**
 * Maps pasted text, AI output, legacy storage, and locale labels to `ProductCategory`.
 */
const CATEGORY_ALIASES: [string, ProductCategory][] = [
  // Internal ids (any case)
  ['essentialoil', 'essentialOil'],
  ['carrieroil', 'carrierOil'],
  ['herbtea', 'herbTea'],
  ['bachflower', 'bachFlower'],

  // English
  ['essential oil', 'essentialOil'],
  ['essential oils', 'essentialOil'],
  ['carrier oil', 'carrierOil'],
  ['base oil', 'carrierOil'],
  ['fixed oil', 'carrierOil'],
  ['herb & tea', 'herbTea'],
  ['herb and tea', 'herbTea'],
  ['dietary supplement', 'supplement'],
  ['food supplement', 'supplement'],
  ['bach flower', 'bachFlower'],
  ['bach flowers', 'bachFlower'],
  ['bach flower remedy', 'bachFlower'],
  ['bach remedies', 'bachFlower'],
  ['rescue remedy', 'bachFlower'],
  ['other', 'other'],
  ['misc', 'other'],
  ['miscellaneous', 'other'],

  // German (incl. new labels)
  ['trägeröl', 'carrierOil'],
  ['traegeröl', 'carrierOil'],
  ['nahrungsergänzung', 'supplement'],
  ['nahrungserganzung', 'supplement'],
  ['bachblüten', 'bachFlower'],
  ['bachblueten', 'bachFlower'],
  ['bach-blüten', 'bachFlower'],

  // French
  ['huile essentielle', 'essentialOil'],
  ['huile végétale', 'carrierOil'],
  ['huile de support', 'carrierOil'],
  ['herbe & thé', 'herbTea'],
  ['complément alimentaire', 'supplement'],
  ['complément', 'supplement'],
  ['fleurs de bach', 'bachFlower'],
  ['autre', 'other'],

  // Spanish
  ['aceite esencial', 'essentialOil'],
  ['aceite portador', 'carrierOil'],
  ['aceite base', 'carrierOil'],
  ['hierba & té', 'herbTea'],
  ['hierba y té', 'herbTea'],
  ['flores de bach', 'bachFlower'],
  ['otro', 'other'],

  // Legacy FR/ES care → other
  ['soin', 'other'],
  ['cuidado', 'other'],
  ['mélange', 'other'],
  ['mezcla', 'other'],
];

const RESOLVED_ALIAS_MAP = (() => {
  const m = new Map<string, ProductCategory>();
  for (const id of PRODUCT_CATEGORY_IDS) {
    m.set(normCategoryLabel(id), id);
  }
  for (const [legacyLabel, id] of Object.entries(LEGACY_LABEL_TO_ID)) {
    m.set(legacyLabel, id);
  }
  for (const [label, cat] of CATEGORY_ALIASES) {
    m.set(normCategoryLabel(label), cat);
  }
  return m;
})();

export function resolveProductCategory(raw: unknown): ProductCategory {
  if (typeof raw !== 'string') return 'other';
  const trimmed = raw.trim();
  if (!trimmed) return 'other';
  if (isProductCategory(trimmed)) return trimmed;
  return RESOLVED_ALIAS_MAP.get(normCategoryLabel(trimmed)) ?? 'other';
}
