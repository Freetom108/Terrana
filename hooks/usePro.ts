import { useCallback, useEffect, useState } from 'react';
import { getIsLifetime, getIsPro } from '../services/storage/settings';

export function usePro() {
  // TODO: REMOVE BEFORE RELEASE - Test mode only
  const [isPro, setIsPro] = useState(true);
  const [isLifetime, setIsLifetime] = useState(true);

  const load = useCallback(async () => {
    // TODO: REMOVE BEFORE RELEASE - Test mode only (restore lines below)
    setIsPro(true);
    setIsLifetime(true);
    // const [pro, lifetime] = await Promise.all([getIsPro(), getIsLifetime()]);
    // setIsPro(pro);
    // setIsLifetime(lifetime);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { isPro, isLifetime, reload: load };
}
