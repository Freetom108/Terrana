import { useCallback, useEffect, useState } from 'react';
import {
  FREE_IMPORT_LIMIT,
  LIFETIME_IMPORT_LIMIT,
  PRO_IMPORT_LIMIT,
} from '../constants/limits';
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
    ? LIFETIME_IMPORT_LIMIT
    : isPro
      ? PRO_IMPORT_LIMIT
      : FREE_IMPORT_LIMIT;

  const importsRemaining = Math.max(0, effectiveLimit - importsUsed);

  /** True while fewer than the tier's cap has been counted; save flow elsewhere may keep result UI open via `showResult`. */
  const canImport = importsUsed < effectiveLimit;

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
    effectiveLimit,
  };
}
