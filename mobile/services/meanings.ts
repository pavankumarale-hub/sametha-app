import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

const CACHE_PREFIX = 'sametha_meaning_v4_';

export interface MeaningData {
  meaning: string;
  example: {
    context: string;
    conversation: Array<{ speaker: string; line: string }>;
  };
}

export async function getMeaning(sametha: string): Promise<{ data: MeaningData | null; error: string | null }> {
  // Check local cache first
  const cacheKey = CACHE_PREFIX + sametha;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return { data: JSON.parse(cached) as MeaningData, error: null };
  } catch {}

  // Fetch from Firestore
  try {
    const snap = await getDoc(doc(db, 'meanings', sametha));
    if (!snap.exists()) {
      return { data: null, error: 'Meaning not yet available for this proverb.' };
    }
    const data = snap.data() as MeaningData;
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message ?? 'Could not load meaning.' };
  }
}
