export type LimitKind = 'product' | 'blend';

/**
 * Thrown by saveProduct / saveBlend when a free-tier user tries to exceed
 * the internal FREE_PRODUCT_LIMIT / FREE_BLEND_LIMIT (see DISPLAY_MAX for UI copy).
 * a localized Alert.
 */
export class LimitExceededError extends Error {
  readonly kind: LimitKind;
  readonly limit: number;

  constructor(kind: LimitKind, limit: number) {
    super(`Free ${kind} limit of ${limit} reached`);
    this.name = 'LimitExceededError';
    this.kind = kind;
    this.limit = limit;
  }
}
