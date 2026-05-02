import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PRO = 'isPro';
const KEY_LIFETIME = 'isLifetime';
const KEY_IMPORT_COUNT = 'importCount';

function parseBoolean(raw: string | null): boolean {
  if (raw === null) return false;
  try {
    return Boolean(JSON.parse(raw));
  } catch {
    return raw === 'true';
  }
}

function parseCount(raw: string | null): number {
  if (raw === null) return 0;
  try {
    const n = JSON.parse(raw) as unknown;
    if (typeof n !== 'number' || !Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
  } catch {
    return 0;
  }
}

export async function getIsPro(): Promise<boolean> {
  return parseBoolean(await AsyncStorage.getItem(KEY_PRO));
}

export async function setIsPro(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_PRO, JSON.stringify(Boolean(value)));
}

export async function getIsLifetime(): Promise<boolean> {
  return parseBoolean(await AsyncStorage.getItem(KEY_LIFETIME));
}

export async function setIsLifetime(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_LIFETIME, JSON.stringify(Boolean(value)));
}

export async function getImportCount(): Promise<number> {
  return parseCount(await AsyncStorage.getItem(KEY_IMPORT_COUNT));
}

export async function incrementImportCount(): Promise<void> {
  const next = (await getImportCount()) + 1;
  await AsyncStorage.setItem(KEY_IMPORT_COUNT, JSON.stringify(next));
}

export async function resetImportCount(): Promise<void> {
  await AsyncStorage.setItem(KEY_IMPORT_COUNT, JSON.stringify(0));
}
