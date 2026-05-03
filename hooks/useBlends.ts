import { useCallback, useEffect, useState } from 'react';
import type { Blend } from '../types/blend';
import { getAllBlends } from '../services/storage/blends';

export function useBlends() {
  const [blends, setBlends] = useState<Blend[]>([]);

  const refreshBlends = useCallback(async () => {
    const list = await getAllBlends();
    setBlends(list);
  }, []);

  useEffect(() => {
    void refreshBlends();
  }, [refreshBlends]);

  return { blends, refreshBlends };
}
