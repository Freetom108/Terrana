export const PRODUCT_CATEGORIES = [
  'Ätherisches Öl',
  'Supplement',
  'Kraut & Tee',
  'Pflege',
  'Mischung',
  'Sonstiges',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const CATEGORY_LABEL_KEYS: Record<ProductCategory, string> = {
  'Ätherisches Öl': 'categories.essentialOil',
  'Supplement':     'categories.supplement',
  'Kraut & Tee':    'categories.herbTea',
  'Pflege':         'categories.care',
  'Mischung':       'categories.blend',
  'Sonstiges':      'categories.other',
};

export function categoryLabelKey(cat: ProductCategory): string {
  return CATEGORY_LABEL_KEYS[cat] ?? 'categories.other';
}
