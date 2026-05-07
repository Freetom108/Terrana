import { useCallback, useEffect, useState } from 'react';
import { FREE_IMPORT_LIMIT, PRO_IMPORT_LIMIT } from '../constants/limits';
import { getImportCount, incrementImportCount } from '../services/storage/settings';

interface ImportLimitOptions {
  /** Pass isPro / isLifetime from usePro() so test-mode overrides are respected. */
  isPro?: boolean;
  isLifetime?: boolean;
}

export function useImportLimit({ isPro = false, isLifetime = false }: ImportLimitOptions = {}) {
  const [importsUsed, setImportsUsed] = useState(0);

  const refresh = useCallback(async () => {
    const count = await getImportCount();
    setImportsUsed(count);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const effectiveLimit = isLifetime
    ? Number.POSITIVE_INFINITY
    : isPro
      ? PRO_IMPORT_LIMIT
      : FREE_IMPORT_LIMIT;

  const importsRemaining = Number.isFinite(effectiveLimit)
    ? Math.max(0, (effectiveLimit as number) - importsUsed)
    : Number.POSITIVE_INFINITY;

  const canImport = isLifetime || isPro || importsUsed < FREE_IMPORT_LIMIT;

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
