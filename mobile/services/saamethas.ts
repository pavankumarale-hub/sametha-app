import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const CACHE_KEY = 'sametha_cache_v1';
const CACHE_TS_KEY = 'sametha_cache_ts_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function loadSaamethas(): Promise<string[]> {
  // Read cache (may be fresh or stale)
  let cached: string[] | null = null;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const ts = await AsyncStorage.getItem(CACHE_TS_KEY);
    if (raw && ts) {
      const data = JSON.parse(raw) as string[];
      if (Date.now() - parseInt(ts) < CACHE_TTL_MS) {
        return data; // Fresh cache — return immediately
      }
      cached = data; // Stale cache — keep as fallback
    }
  } catch {
    // Cache unreadable — fall through to fetch
  }

  // Fetch from Firestore
  try {
    const snapshot = await getDocs(collection(db, 'saamethas'));
    const saamethas = snapshot.docs
      .sort((a, b) => (a.data().index ?? 0) - (b.data().index ?? 0))
      .map((doc) => doc.data().text as string)
      .filter(Boolean);

    if (saamethas.length === 0) throw new Error('No saamethas found in database.');

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(saamethas));
    await AsyncStorage.setItem(CACHE_TS_KEY, String(Date.now()));

    return saamethas;
  } catch (fetchError) {
    // Network failed — return stale cache if available
    if (cached && cached.length > 0) return cached;
    throw fetchError;
  }
}

/** Deterministic pick by local calendar day — same sametha all day, changes at midnight. */
export function getTodaysSametha(saamethas: string[]): string {
  if (!saamethas.length) return '';
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  const seed = now.getFullYear() * 1000 + dayOfYear;
  return saamethas[seed % saamethas.length];
}

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
