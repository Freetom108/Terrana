import { useCallback, useEffect, useState } from 'react';
import { getIsLifetime, getIsPro } from '../services/storage/settings';

export function usePro() {
  const [isPro, setIsPro] = useState(false);
  const [isLifetime, setIsLifetime] = useState(false);

  const load = useCallback(async () => {
    const [pro, lifetime] = await Promise.all([getIsPro(), getIsLifetime()]);
    setIsPro(pro);
    setIsLifetime(lifetime);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { isPro, isLifetime, reload: load };
}
