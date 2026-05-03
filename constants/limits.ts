export const FREE_PRODUCT_LIMIT = 10;
export const FREE_BLEND_LIMIT = 5;
export const FREE_IMPORT_LIMIT = 20;

export const PRICE_PRO = 9.99;
export const PRICE_LIFETIME = 19.99;

export const PRO_FEATURES = [
  'unlimited_products',
  'unlimited_blends',
  'importer',
  'share_whatsapp_mail',
] as const;

export const LIFETIME_FEATURES = [
  ...PRO_FEATURES,
  'pdf_export',
  'printing',
  'inventory',
  'future_features',
] as const;

export type ProFeature = (typeof PRO_FEATURES)[number];
export type LifetimeFeature = (typeof LIFETIME_FEATURES)[number];
