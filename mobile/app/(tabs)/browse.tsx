import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, StyleSheet,
  ActivityIndicator, TouchableOpacity, Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { loadSaamethas } from '../../services/saamethas';
import { getFavorites, toggleFavorite, isFavorite } from '../../services/favorites';

export default function BrowseScreen() {
  const [all, setAll] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
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
      getFavorites().then(setFavorites);
    }, [])
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = query.trim().toLowerCase();
      setFiltered(q ? all.filter((s) => s.toLowerCase().includes(q)) : all);
    }, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, all]);

  async function handleToggleFavorite(sametha: string) {
    await toggleFavorite(sametha);
    setFavorites(await getFavorites());
  }

  async function share(sametha: string) {
    await Share.share({ message: `"${sametha}"\n\n— via Sametha App` });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E65100" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={20} color="#aaa" />
        <TextInput
          style={styles.input}
          placeholder="Search saamethas…"
          placeholderTextColor="#bbb"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <MaterialIcons name="cancel" size={18} color="#bbb" />
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
                <MaterialIcons name="share" size={18} color="#E65100" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleToggleFavorite(item)} hitSlop={8}>
                <MaterialIcons
                  name={isFavorite(favorites, item) ? 'favorite' : 'favorite-border'}
                  size={18}
                  color="#E65100"
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
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', margin: 12, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  input: { flex: 1, fontSize: 15, color: '#333' },
  count: { paddingHorizontal: 16, paddingBottom: 6, fontSize: 12, color: '#aaa' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
  },
  rowText: { flex: 1, fontSize: 15, color: '#333', lineHeight: 22, marginRight: 8 },
  rowActions: { flexDirection: 'row', gap: 14 },
  sep: { height: 1, backgroundColor: '#F5EDE4', marginLeft: 16 },
  empty: { textAlign: 'center', color: '#bbb', marginTop: 40, fontSize: 15 },
});
