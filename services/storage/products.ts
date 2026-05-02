import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '../../types/product';

const STORAGE_KEY = 'products';

async function readProducts(): Promise<Product[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as Product[];
  } catch {
    return [];
  }
}

async function writeProducts(products: Product[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export async function getAllProducts(): Promise<Product[]> {
  return readProducts();
}

export async function getProductById(id: string): Promise<Product | null> {
  const products = await readProducts();
  return products.find((p) => p.id === id) ?? null;
}

export async function saveProduct(product: Product): Promise<void> {
  const products = await readProducts();
  const idx = products.findIndex((p) => p.id === product.id);
  if (idx >= 0) {
    products[idx] = product;
  } else {
    products.push(product);
  }
  await writeProducts(products);
}

export async function deleteProduct(id: string): Promise<void> {
  const products = await readProducts();
  await writeProducts(products.filter((p) => p.id !== id));
}
