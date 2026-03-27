import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getFavorites, toggleFavorite } from '../../services/favorites';

export default function FavouritesScreen() {
  const [favourites, setFavourites] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      getFavorites().then(setFavourites);
    }, [])
  );

  async function handleUnfavourite(sametha: string) {
    await toggleFavorite(sametha);
    setFavourites((prev) => prev.filter((s) => s !== sametha));
  }

  async function share(sametha: string) {
    await Share.share({ message: `"${sametha}"\n\n— via Sametha App` });
  }

  return (
    <View style={styles.container}>
      {favourites.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="favorite-border" size={48} color="#ddd" />
          <Text style={styles.emptyTitle}>No favourites yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the heart icon on any sametha to save it here.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.count}>
            {favourites.length} saved sametha{favourites.length !== 1 ? 's' : ''}
          </Text>
          <FlatList
            data={favourites}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.rowText}>{item}</Text>
                <View style={styles.rowActions}>
                  <TouchableOpacity onPress={() => share(item)} hitSlop={8}>
                    <MaterialIcons name="share" size={18} color="#E65100" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleUnfavourite(item)} hitSlop={8}>
                    <MaterialIcons name="favorite" size={18} color="#E65100" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  count: { paddingHorizontal: 16, paddingVertical: 10, fontSize: 12, color: '#aaa' },
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#bbb', marginTop: 12 },
  emptySubtitle: {
    fontSize: 14, color: '#ccc', textAlign: 'center', marginTop: 6, lineHeight: 20,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
  },
  rowText: { flex: 1, fontSize: 15, color: '#333', lineHeight: 22, marginRight: 12 },
  rowActions: { flexDirection: 'row', gap: 14 },
  sep: { height: 1, backgroundColor: '#F5EDE4', marginLeft: 16 },
});
