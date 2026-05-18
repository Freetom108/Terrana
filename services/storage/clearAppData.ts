import AsyncStorage from '@react-native-async-storage/async-storage';

/** Removes all keys from AsyncStorage (full app reset). */
export async function clearAllAppStorage(): Promise<void> {
  await AsyncStorage.clear();
}
