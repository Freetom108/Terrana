import { useCallback, useEffect, useState } from 'react';
import { FREE_IMPORT_LIMIT } from '../constants/limits';
import { getImportCount, getIsPro, incrementImportCount } from '../services/storage/settings';

export function useImportLimit() {
  const [importsUsed, setImportsUsed] = useState(0);
  const [isPro, setIsPro] = useState(false);

  const refresh = useCallback(async () => {
    const [count, pro] = await Promise.all([getImportCount(), getIsPro()]);
    setImportsUsed(count);
    setIsPro(pro);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const importsRemaining = isPro
    ? Number.POSITIVE_INFINITY
    : Math.max(0, FREE_IMPORT_LIMIT - importsUsed);

  const canImport = isPro || importsUsed < FREE_IMPORT_LIMIT;

  const incrementImport = useCallback(async () => {
    await incrementImportCount();
    await refresh();
  }, [refresh]);

  return {
    importsUsed,
    importsRemaining,
    canImport,
    incrementImport,
    refresh,
  };
}
