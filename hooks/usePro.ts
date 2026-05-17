import { useCallback, useEffect, useState } from 'react';

import {
  refreshCustomerInfoSync,
  subscribePurchasesMutation,
} from '../services/purchase/iap';
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
    let alive = true;
    const hydrate = async () => {
      await load();
      await refreshCustomerInfoSync();
      if (alive) await load();
    };
    void hydrate();

    const unsub = subscribePurchasesMutation(() => {
      void load();
    });

    return () => {
      alive = false;
      unsub();
    };
  }, [load]);

  const reload = useCallback(async () => {
    await load();
    await refreshCustomerInfoSync();
    await load();
  }, [load]);

  return { isPro, isLifetime, reload };
}
