import AsyncStorage from '@react-native-async-storage/async-storage';
import { FREE_PRODUCT_LIMIT, LIFETIME_LIMIT, PRO_PRODUCT_LIMIT } from '../../constants/limits';
import type { ProductCategory } from '../../constants/categories';
import { PRODUCT_CATEGORIES } from '../../constants/categories';
import { LimitExceededError } from './errors';
import type { Product } from '../../types/product';

const STORAGE_KEY = 'terrana_products';

function clampRating(n: unknown): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function normalizeCategory(raw: unknown): ProductCategory {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (PRODUCT_CATEGORIES.includes(s as ProductCategory)) {
    return s as ProductCategory;
  }
  const lower = s.toLowerCase();
  const hit = PRODUCT_CATEGORIES.find((c) => c.toLowerCase() === lower);
  return hit ?? 'Sonstiges';
}

function normalizeInventory(raw: unknown): Product['inventory'] {
  const v = typeof raw === 'string' ? raw : '';
  if (v === 'full' || v === 'medium' || v === 'low' || v === 'empty') return v;
  return 'full';
}

function normalizeProduct(raw: Record<string, unknown>): Product {
  const description =
    typeof raw.description === 'string'
      ? raw.description
      : typeof raw.notes === 'string'
        ? raw.notes
        : '';
  const notes = typeof raw.notes === 'string' ? raw.notes : description;

  let lastUsed: string | undefined;
  if (typeof raw.lastUsed === 'string' && raw.lastUsed.length > 0) {
    lastUsed = raw.lastUsed;
  }

  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    brand: String(raw.brand ?? ''),
    category: normalizeCategory(raw.category),
    description,
    notes,
    usages: Array.isArray(raw.usages)
      ? (raw.usages as unknown[]).filter((u): u is string => typeof u === 'string')
      : [],
    tags: Array.isArray(raw.tags)
      ? (raw.tags as unknown[]).filter((u): u is string => typeof u === 'string')
      : [],
    rating: clampRating(raw.rating),
    inventory: normalizeInventory(raw.inventory),
    isFavorite: raw.isFavorite === true,
    lastUsed,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

async function readProducts(): Promise<Product[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) =>
      normalizeProduct(
        typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {}
      )
    );
  } catch {
    return [];
  }
}

async function writeProducts(products: Product[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to persist products: ${msg}`, { cause: e });
  }
}

export async function getAllProducts(): Promise<Product[]> {
  return readProducts();
}

export async function getProductById(id: string): Promise<Product | null> {
  const products = await readProducts();
  return products.find((p) => p.id === id) ?? null;
}

export async function saveProduct(
  product: Product,
  options?: { isPro?: boolean; isLifetime?: boolean },
): Promise<void> {
  const products = await readProducts();
  const normalized: Product = {
    ...product,
    rating: clampRating(product.rating),
    category: normalizeCategory(product.category),
    inventory: normalizeInventory(product.inventory),
  };
  const idx = products.findIndex((p) => p.id === normalized.id);
  if (idx >= 0) {
    products[idx] = normalized;
  } else {
    const limit = options?.isLifetime
      ? LIFETIME_LIMIT
      : options?.isPro
        ? PRO_PRODUCT_LIMIT
        : FREE_PRODUCT_LIMIT;
    if (products.length >= limit) {
      throw new LimitExceededError('product', limit);
    }
    products.push(normalized);
  }
  await writeProducts(products);
}

export async function deleteProduct(id: string): Promise<void> {
  const products = await readProducts();
  await writeProducts(products.filter((p) => p.id !== id));
}

export async function toggleFavorite(id: string): Promise<boolean> {
  const products = await readProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  const next = !products[idx]!.isFavorite;
  products[idx] = { ...products[idx]!, isFavorite: next };
  await writeProducts(products);
  return next;
}
