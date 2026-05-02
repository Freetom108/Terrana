import { useCallback, useEffect, useState } from 'react';
import type { Product } from '../types/product';
import { getAllProducts } from '../services/storage/products';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  const refreshProducts = useCallback(async () => {
    const list = await getAllProducts();
    setProducts(list);
  }, []);

  useEffect(() => {
    void refreshProducts();
  }, [refreshProducts]);

  return { products, refreshProducts };
}
