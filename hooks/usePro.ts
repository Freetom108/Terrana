import { useCallback, useState } from 'react';
import { getIsLifetime, getIsPro } from '../services/storage/settings';

export function usePro() {
  const [isPro, setIsPro] = useState(true);
  const [isLifetime, setIsLifetime] = useState(true);

  const load = useCallback(async () => {
    const [pro, lifetime] = await Promise.all([getIsPro(), getIsLifetime()]);
    setIsPro(pro);
    setIsLifetime(lifetime);
  }, []);

  // TEMP TEST: re-enable after testing — restore `useEffect` import above and uncomment below.
  // useEffect(() => {
  //   void load();
  // }, [load]);

  return { isPro, isLifetime, reload: load };
}
