import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, StyleSheet,
  ActivityIndicator, TouchableOpacity, Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { loadSaamethas } from '../../services/saamethas';
import { addFavourite, removeFavourite, getFavourites, Favourite } from '../../services/cloudFavorites';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function BrowseScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [all, setAll] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadSaamethas().then((data) => { setAll(data); setFiltered(data); setLoading(false); });
  }, []);

  useFocusEffect(useCallback(() => {
    getFavourites(user?.uid).then(setFavourites);
  }, [user]));

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
    if (match) await removeFavourite(match.id, user?.uid);
    else await addFavourite(text, user?.uid);
    getFavourites(user?.uid).then(setFavourites);
  }

  if (loading) return (
    <View style={s.centered}><ActivityIndicator size="large" color={theme.primary} /></View>
  );

  return (
    <View style={s.container}>
      <View style={s.searchBox}>
        <MaterialIcons name="search" size={20} color={theme.textMuted} />
        <TextInput
          style={s.input}
          placeholder="Search saamethas..."
          placeholderTextColor={theme.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <MaterialIcons name="cancel" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={s.count}>
        {filtered.length.toLocaleString()}
        {query ? ` of ${all.length.toLocaleString()}` : ''} saamethas
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(_, i) => String(i)}
        initialNumToRender={20}
        windowSize={5}
        renderItem={({ item }) => (
          <View style={s.row}>
            <Text style={s.rowText}>{item}</Text>
            <View style={s.rowActions}>
              <TouchableOpacity onPress={() => Share.share({ message: `"${item}"\n\n— via Sametha App` })} hitSlop={8}>
                <MaterialIcons name="share" size={18} color={theme.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleToggleFav(item)} hitSlop={8}>
                <MaterialIcons
                  name={isFav(item) ? 'favorite' : 'favorite-border'}
                  size={18}
                  color={isFav(item) ? '#FF6B6B' : theme.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={s.sep} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={s.empty}>No saamethas match your search.</Text>}
      />
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof import('../../theme').buildTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: theme.surface2, margin: 12, borderRadius: 14,
      paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: theme.border,
    },
    input: { flex: 1, fontSize: 15, color: theme.text },
    count: { paddingHorizontal: 16, paddingBottom: 6, fontSize: 12, color: theme.textMuted },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: theme.bg },
    rowText: { flex: 1, fontSize: 15, color: theme.text, lineHeight: 22, marginRight: 8 },
    rowActions: { flexDirection: 'row', gap: 16 },
    sep: { height: 1, backgroundColor: theme.border, marginLeft: 16 },
    empty: { textAlign: 'center', color: theme.textMuted, marginTop: 40, fontSize: 15 },
  });
}
