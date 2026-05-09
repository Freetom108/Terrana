import type { ProductCategory } from '../constants/categories';

export type InventoryLevel = 'full' | 'medium' | 'low' | 'empty';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  notes: string;
  usages: string[];
  tags: string[];
  /** 1–5 */
  rating: number;
  inventory: InventoryLevel;
  isFavorite?: boolean;
  /** ISO 8601, optional */
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}
