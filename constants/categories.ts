export const PRODUCT_CATEGORIES = [
  'Ätherisches Öl',
  'Supplement',
  'Kraut & Tee',
  'Pflege',
  'Mischung',
  'Sonstiges',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
