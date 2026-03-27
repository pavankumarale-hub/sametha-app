import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'sametha_favorites_v1';

export async function getFavorites(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function toggleFavorite(sametha: string): Promise<boolean> {
  const current = await getFavorites();
  const idx = current.indexOf(sametha);
  let updated: string[];
  if (idx === -1) {
    updated = [sametha, ...current];
  } else {
    updated = current.filter((_, i) => i !== idx);
  }
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  return idx === -1; // returns true if now favorited
}

export function isFavorite(favorites: string[], sametha: string): boolean {
  return favorites.includes(sametha);
}
