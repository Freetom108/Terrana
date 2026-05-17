import { usePro } from './usePro';

/** Same subscription source as {@link usePro}; only exposes Lifetime access. */
export function useLifetime() {
  const { isLifetime, reload } = usePro();
  return { isLifetime, reload };
}
