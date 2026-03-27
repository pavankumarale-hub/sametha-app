/**
 * Cloud-synced favourites & groups backed by Firestore.
 * Falls back to local AsyncStorage when the user is not signed in.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection, doc, setDoc, deleteDoc,
  getDocs, addDoc, updateDoc, query, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface Favourite {
  id: string;
  text: string;
  groupId: string | null;
  savedAt: number;
}

// ── Local (AsyncStorage) fallback ──────────────────────────────────────────

const LOCAL_FAV_KEY = 'sametha_favorites_v2';
const LOCAL_GRP_KEY = 'sametha_groups_v1';

async function localGetFavourites(): Promise<Favourite[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_FAV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function localSaveFavourites(favs: Favourite[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_FAV_KEY, JSON.stringify(favs));
}

async function localGetGroups(): Promise<Group[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_GRP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function localSaveGroups(groups: Group[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_GRP_KEY, JSON.stringify(groups));
}

// ── Firestore helpers ──────────────────────────────────────────────────────

function favsRef(uid: string) {
  return collection(db, 'users', uid, 'favorites');
}

function grpsRef(uid: string) {
  return collection(db, 'users', uid, 'groups');
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function getFavourites(uid?: string | null): Promise<Favourite[]> {
  if (!uid) return localGetFavourites();
  const snap = await getDocs(query(favsRef(uid), orderBy('savedAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Favourite, 'id'>) }));
}

export async function addFavourite(text: string, uid?: string | null, groupId: string | null = null): Promise<void> {
  if (!uid) {
    const favs = await localGetFavourites();
    if (favs.some((f) => f.text === text)) return;
    favs.unshift({ id: Date.now().toString(), text, groupId, savedAt: Date.now() });
    await localSaveFavourites(favs);
    return;
  }
  const ref = doc(favsRef(uid), btoa(encodeURIComponent(text)).slice(0, 20));
  await setDoc(ref, { text, groupId, savedAt: Timestamp.now() });
}

export async function removeFavourite(id: string, uid?: string | null): Promise<void> {
  if (!uid) {
    const favs = await localGetFavourites();
    await localSaveFavourites(favs.filter((f) => f.id !== id));
    return;
  }
  await deleteDoc(doc(favsRef(uid), id));
}

export async function moveFavouriteToGroup(
  id: string, groupId: string | null, uid?: string | null
): Promise<void> {
  if (!uid) {
    const favs = await localGetFavourites();
    const updated = favs.map((f) => f.id === id ? { ...f, groupId } : f);
    await localSaveFavourites(updated);
    return;
  }
  await updateDoc(doc(favsRef(uid), id), { groupId });
}

export async function isFavourited(text: string, uid?: string | null): Promise<boolean> {
  const favs = await getFavourites(uid);
  return favs.some((f) => f.text === text);
}

// ── Groups ─────────────────────────────────────────────────────────────────

export const GROUP_COLORS = [
  '#8B5CF6', '#F5A623', '#F43F5E', '#10B981',
  '#0EA5E9', '#F59E0B', '#6366F1', '#EC4899',
];

export async function getGroups(uid?: string | null): Promise<Group[]> {
  if (!uid) return localGetGroups();
  const snap = await getDocs(query(grpsRef(uid), orderBy('createdAt', 'asc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Group, 'id'>) }));
}

export async function createGroup(name: string, color: string, uid?: string | null): Promise<Group> {
  const group: Omit<Group, 'id'> = { name, color, createdAt: Date.now() };
  if (!uid) {
    const groups = await localGetGroups();
    const newGroup = { id: Date.now().toString(), ...group };
    await localSaveGroups([...groups, newGroup]);
    return newGroup;
  }
  const ref = await addDoc(grpsRef(uid), group);
  return { id: ref.id, ...group };
}

export async function deleteGroup(id: string, uid?: string | null): Promise<void> {
  if (!uid) {
    const groups = await localGetGroups();
    await localSaveGroups(groups.filter((g) => g.id !== id));
    return;
  }
  await deleteDoc(doc(grpsRef(uid), id));
  // Move all favs in this group back to ungrouped
  const favs = await getFavourites(uid);
  for (const fav of favs.filter((f) => f.groupId === id)) {
    await moveFavouriteToGroup(fav.id, null, uid);
  }
}
