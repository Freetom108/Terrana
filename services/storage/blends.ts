import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Blend } from '../../types/blend';

const STORAGE_KEY = 'blends';

async function readBlends(): Promise<Blend[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as Blend[];
  } catch {
    return [];
  }
}

async function writeBlends(blends: Blend[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(blends));
}

export async function getAllBlends(): Promise<Blend[]> {
  return readBlends();
}

export async function getBlendById(id: string): Promise<Blend | null> {
  const blends = await readBlends();
  return blends.find((b) => b.id === id) ?? null;
}

export async function saveBlend(blend: Blend): Promise<void> {
  const blends = await readBlends();
  const idx = blends.findIndex((b) => b.id === blend.id);
  if (idx >= 0) {
    blends[idx] = blend;
  } else {
    blends.push(blend);
  }
  await writeBlends(blends);
}

export async function deleteBlend(id: string): Promise<void> {
  const blends = await readBlends();
  await writeBlends(blends.filter((b) => b.id !== id));
}
