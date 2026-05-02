import type { ProductCategory } from '../constants/categories';

export type InventoryLevel = 'full' | 'medium' | 'low' | 'empty';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  notes: string;
  usages: string[];
  tags: string[];
  inventory: InventoryLevel;
  createdAt: string;
  updatedAt: string;
}
