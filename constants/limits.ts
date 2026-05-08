export const FREE_PRODUCT_LIMIT = 10;
export const FREE_BLEND_LIMIT = 10;
export const FREE_IMPORT_LIMIT = 10;

export const PRO_PRODUCT_LIMIT = 100;
export const PRO_BLEND_LIMIT = 100;
export const PRO_IMPORT_LIMIT = 100;

/** Cap for Lifetime users (products, blends, AI imports). */
export const LIFETIME_LIMIT = 1_000;

/** Show limit-warning banner when count reaches these thresholds. */
export const FREE_PRODUCT_WARN = FREE_PRODUCT_LIMIT - 2;  // 8
export const FREE_BLEND_WARN   = FREE_BLEND_LIMIT - 1;    // 4
export const FREE_IMPORT_WARN  = FREE_IMPORT_LIMIT - 2;   // 8

export const PRICE_PRO = 14.99;
export const PRICE_LIFETIME = 24.99;

export const PRO_FEATURES = [
  'unlimited_products',
  'unlimited_blends',
  'importer',
  'share_whatsapp_mail',
  'pdf_export',
] as const;

export const LIFETIME_FEATURES = [
  ...PRO_FEATURES,
  'printing',
  'inventory',
  'future_features',
] as const;

export type ProFeature = (typeof PRO_FEATURES)[number];
export type LifetimeFeature = (typeof LIFETIME_FEATURES)[number];
