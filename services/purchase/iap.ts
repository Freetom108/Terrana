/**
 * RevenueCat purchase flows — store product identifiers (Play / App Store)
 * must match the RevenueCat dashboard.
 */
import { DeviceEventEmitter } from 'react-native';
import Purchases from 'react-native-purchases';
import type {
  CustomerInfo,
  PurchasesPackage,
  PurchasesStoreProduct,
  PurchasesError,
} from 'react-native-purchases';
import { PRODUCT_CATEGORY, PURCHASES_ERROR_CODE } from 'react-native-purchases';

import { setIsLifetime, setIsPro } from '../storage/settings';

export const PRODUCT_ID_PRO = 'terrana_pro';
export const PRODUCT_ID_LIFETIME = 'terrana_lifetime';

/** Must match RevenueCat entitlement identifiers. */
export const ENTITLEMENT_PRO = 'pro';
export const ENTITLEMENT_LIFETIME = 'lifetime';

const SUBSCRIPTION_CHANGED = 'terrana_subscription_changed';

export function subscribePurchasesMutation(listener: () => void): () => void {
  const sub = DeviceEventEmitter.addListener(SUBSCRIPTION_CHANGED, listener);
  return () => sub.remove();
}

function notifyPurchasesMutation(): void {
  DeviceEventEmitter.emit(SUBSCRIPTION_CHANGED);
}

/** Derive Pro/Lifetime flags from CustomerInfo (entitlements + purchased product fallback). */
export function deriveSubscriptionFlags(ci: CustomerInfo): { isLifetime: boolean; isPro: boolean } {
  const active = ci.entitlements.active;
  const ltEnt = active[ENTITLEMENT_LIFETIME];
  const proEnt = active[ENTITLEMENT_PRO];
  let isLifetime = !!ltEnt?.isActive;
  let isPro = !!proEnt?.isActive || isLifetime;

  const purchased = ci.allPurchasedProductIdentifiers ?? [];
  if (!isLifetime && purchased.includes(PRODUCT_ID_LIFETIME)) {
    isLifetime = true;
    isPro = true;
  }
  if (!isPro && purchased.includes(PRODUCT_ID_PRO)) {
    isPro = true;
  }

  return { isLifetime, isPro };
}

export async function applyCustomerInfoToStorage(ci: CustomerInfo): Promise<void> {
  const { isLifetime, isPro } = deriveSubscriptionFlags(ci);
  await setIsLifetime(isLifetime);
  await setIsPro(isPro);
  notifyPurchasesMutation();
}

async function findPackage(productId: string): Promise<PurchasesPackage | null> {
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  const pools: PurchasesPackage[] = [];
  if (current?.availablePackages) pools.push(...current.availablePackages);
  if (offerings.all) {
    for (const off of Object.values(offerings.all)) {
      if (off.availablePackages?.length) pools.push(...off.availablePackages);
    }
  }
  return pools.find((p) => p.product.identifier === productId) ?? null;
}

async function getStoreProduct(productId: string): Promise<PurchasesStoreProduct | null> {
  const list = await Purchases.getProducts([productId], PRODUCT_CATEGORY.NON_SUBSCRIPTION);
  return list[0] ?? null;
}

export async function purchaseProductById(productId: string): Promise<CustomerInfo> {
  const pkg = await findPackage(productId);
  if (pkg) {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    await applyCustomerInfoToStorage(customerInfo);
    return customerInfo;
  }
  const storeProduct = await getStoreProduct(productId);
  if (!storeProduct) {
    throw new Error('PRODUCT_NOT_CONFIGURED');
  }
  const { customerInfo } = await Purchases.purchaseStoreProduct(storeProduct);
  await applyCustomerInfoToStorage(customerInfo);
  return customerInfo;
}

export async function purchaseTerranaPro(): Promise<CustomerInfo> {
  return purchaseProductById(PRODUCT_ID_PRO);
}

export async function purchaseTerranaLifetime(): Promise<CustomerInfo> {
  return purchaseProductById(PRODUCT_ID_LIFETIME);
}

export async function restorePurchasesSync(): Promise<CustomerInfo> {
  const ci = await Purchases.restorePurchases();
  await applyCustomerInfoToStorage(ci);
  return ci;
}

/** Loads latest CustomerInfo from RevenueCat without buying; updates AsyncStorage when entitlements changed. */
export async function refreshCustomerInfoSync(): Promise<CustomerInfo | null> {
  try {
    const ci = await Purchases.getCustomerInfo();
    await applyCustomerInfoToStorage(ci);
    return ci;
  } catch {
    return null;
  }
}

export function isPurchasesCancelError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as Partial<PurchasesError> & { userCancelled?: boolean | null };
  if (e.userCancelled === true) return true;
  return e.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

export function isPurchasesNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as Partial<PurchasesError>;
  return (
    e.code === PURCHASES_ERROR_CODE.NETWORK_ERROR ||
    e.code === PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR ||
    e.code === PURCHASES_ERROR_CODE.PRODUCT_REQUEST_TIMED_OUT_ERROR
  );
}

export function formatPurchasesUserMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const e = error as Partial<PurchasesError>;
  const m = typeof e.message === 'string' ? e.message.trim() : '';
  return m.length > 0 ? m : null;
}
