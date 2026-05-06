export type LimitKind = 'product' | 'blend';

/**
 * Thrown by saveProduct / saveBlend when a free-tier user tries to exceed
 * the FREE_PRODUCT_LIMIT or FREE_BLEND_LIMIT. Screens catch this and show
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
