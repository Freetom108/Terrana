import AsyncStorage from '@react-native-async-storage/async-storage';

/** Mapping: old key → new namespaced key */
const KEY_MIGRATIONS: ReadonlyArray<readonly [string, string]> = [
  ['products', 'terrana_products'],
  ['blends', 'terrana_blends'],
  ['isPro', 'terrana_isPro'],
  ['isLifetime', 'terrana_isLifetime'],
  ['importCount', 'terrana_importCount'],
  ['theme', 'terrana_theme'],
  ['language', 'terrana_language'],
];

const MIGRATION_DONE_KEY = 'terrana_migration_v1';

/**
 * Runs once per install: copies data from legacy un-namespaced keys to the
 * terrana_* namespace, then removes the old keys. Safe to call on every
 * app start — bails out immediately once the migration flag is set.
 */
export async function runStorageMigration(): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(MIGRATION_DONE_KEY);
    if (done === 'true') return;

    const oldKeys = KEY_MIGRATIONS.map(([old]) => old);
    const pairs = await AsyncStorage.multiGet(oldKeys);

    const toSet: Array<[string, string]> = [];
    const toRemove: string[] = [];

    for (const [oldKey, value] of pairs) {
      const entry = KEY_MIGRATIONS.find(([k]) => k === oldKey);
      if (!entry) continue;
      const [, newKey] = entry;
      if (value !== null) {
        toSet.push([newKey, value]);
      }
      toRemove.push(oldKey);
    }

    if (toSet.length > 0) {
      await AsyncStorage.multiSet(toSet);
    }
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }

    await AsyncStorage.setItem(MIGRATION_DONE_KEY, 'true');
  } catch {
    // Migration errors are non-fatal — the app continues with empty/default state.
  }
}
