import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, StyleSheet,
  ActivityIndicator, TouchableOpacity, Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { loadSaamethas } from '../../services/saamethas';
import { addFavourite, removeFavourite, getFavourites, Favourite } from '../../services/cloudFavorites';
import { useAuth } from '../../context/AuthContext';
import { T } from '../../theme';

export default function BrowseScreen() {
  const { user } = useAuth();
  const [all, setAll] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadSaamethas().then((data) => {
      setAll(data);
      setFiltered(data);
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      getFavourites(user?.uid).then(setFavourites);
    }, [user])
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = query.trim().toLowerCase();
      setFiltered(q ? all.filter((s) => s.toLowerCase().includes(q)) : all);
    }, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, all]);

  const isFav = (text: string) => favourites.some((f) => f.text === text);

  async function handleToggleFav(text: string) {
    const match = favourites.find((f) => f.text === text);
    if (match) {
      await removeFavourite(match.id, user?.uid);
    } else {
      await addFavourite(text, user?.uid);
    }
    getFavourites(user?.uid).then(setFavourites);
  }

  async function share(sametha: string) {
    await Share.share({ message: `"${sametha}"\n\n— via Sametha App` });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={20} color={T.textMuted} />
        <TextInput
          style={styles.input}
          placeholder="Search saamethas..."
          placeholderTextColor={T.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <MaterialIcons name="cancel" size={18} color={T.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.count}>
        {filtered.length.toLocaleString()}
        {query ? ` of ${all.length.toLocaleString()}` : ''} saamethas
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(_, i) => String(i)}
        initialNumToRender={20}
        windowSize={5}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>{item}</Text>
            <View style={styles.rowActions}>
              <TouchableOpacity onPress={() => share(item)} hitSlop={8}>
                <MaterialIcons name="share" size={18} color={T.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleToggleFav(item)} hitSlop={8}>
                <MaterialIcons
                  name={isFav(item) ? 'favorite' : 'favorite-border'}
                  size={18}
                  color={isFav(item) ? '#FF6B6B' : T.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No saamethas match your search.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.bg },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.surface2, margin: 12, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: T.border,
  },
  input: { flex: 1, fontSize: 15, color: T.text },
  count: { paddingHorizontal: 16, paddingBottom: 6, fontSize: 12, color: T.textMuted },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16, backgroundColor: T.bg,
  },
  rowText: { flex: 1, fontSize: 15, color: T.text, lineHeight: 22, marginRight: 8 },
  rowActions: { flexDirection: 'row', gap: 16 },
  sep: { height: 1, backgroundColor: T.border, marginLeft: 16 },
  empty: { textAlign: 'center', color: T.textMuted, marginTop: 40, fontSize: 15 },
});
