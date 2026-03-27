import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  Share, TouchableOpacity, ScrollView, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { loadSaamethas, getTodaysSametha } from '../../services/saamethas';
import { ensureNotificationsScheduled } from '../../services/notifications';
import { getFavorites, toggleFavorite, isFavorite } from '../../services/favorites';

export default function TodayScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saamethas, setSaamethas] = useState<string[]>([]);
  const [displayed, setDisplayed] = useState('');
  const [isToday, setIsToday] = useState(true);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);

  async function init(isRefresh = false) {
    try {
      const data = await loadSaamethas();
      setSaamethas(data);
      setDisplayed(getTodaysSametha(data));
      setIsToday(true);
      await ensureNotificationsScheduled(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load. Check your connection.');
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }

  useEffect(() => { init(); }, []);

  // Re-check today's sametha and favorites each time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (saamethas.length) {
        setDisplayed(getTodaysSametha(saamethas));
        setIsToday(true);
      }
      getFavorites().then(setFavorites);
    }, [saamethas])
  );

  async function handleToggleFavorite() {
    await toggleFavorite(displayed);
    setFavorites(await getFavorites());
  }

  function showRandom() {
    if (!saamethas.length) return;
    const idx = Math.floor(Math.random() * saamethas.length);
    setDisplayed(saamethas[idx]);
    setIsToday(false);
  }

  function showToday() {
    setDisplayed(getTodaysSametha(saamethas));
    setIsToday(true);
  }

  async function shareSametha() {
    await Share.share({
      message: `"${displayed}"\n\n— via Sametha App`,
    });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E65100" />
        <Text style={styles.statusText}>Loading saamethas…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="wifi-off" size={48} color="#ccc" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); setError(''); init(); }}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); init(true); }} tintColor="#E65100" />}
    >
      <Text style={styles.dateText}>{today}</Text>

      {!isToday && (
        <TouchableOpacity style={styles.todayChip} onPress={showToday}>
          <MaterialIcons name="today" size={14} color="#E65100" />
          <Text style={styles.todayChipText}>Back to Today's</Text>
        </TouchableOpacity>
      )}

      <View style={styles.card}>
        <MaterialIcons name="format-quote" size={36} color="#E65100" style={styles.quoteIcon} />
        <Text style={styles.samethaText}>{displayed}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={shareSametha}>
          <MaterialIcons name="share" size={20} color="#E65100" />
          <Text style={styles.btnText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={handleToggleFavorite}>
          <MaterialIcons
            name={isFavorite(favorites, displayed) ? 'favorite' : 'favorite-border'}
            size={20}
            color="#E65100"
          />
          <Text style={styles.btnText}>
            {isFavorite(favorites, displayed) ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnFilled]} onPress={showRandom}>
          <MaterialIcons name="shuffle" size={20} color="#fff" />
          <Text style={[styles.btnText, styles.btnTextFilled]}>Random</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.totalText}>{saamethas.length.toLocaleString()} saamethas</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1, padding: 20, alignItems: 'center',
    backgroundColor: '#FFF8F0',
  },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 24, backgroundColor: '#FFF8F0',
  },
  dateText: {
    fontSize: 13, color: '#999', marginTop: 8, marginBottom: 4,
    textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600',
  },
  todayChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#FFF3E0', borderRadius: 20, marginBottom: 8,
    borderWidth: 1, borderColor: '#FFCC80',
  },
  todayChipText: { fontSize: 12, color: '#E65100', fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 28,
    width: '100%', marginVertical: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    borderLeftWidth: 4, borderLeftColor: '#E65100',
  },
  quoteIcon: { marginBottom: 8 },
  samethaText: {
    fontSize: 20, lineHeight: 32, color: '#2d2d2d',
    fontStyle: 'italic',
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 22, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E65100',
    backgroundColor: '#fff',
  },
  btnFilled: { backgroundColor: '#E65100', borderColor: '#E65100' },
  btnText: { color: '#E65100', fontWeight: '600', fontSize: 15 },
  btnTextFilled: { color: '#fff' },
  totalText: { marginTop: 28, color: '#bbb', fontSize: 12 },
  statusText: { marginTop: 12, color: '#aaa', fontSize: 15 },
  errorText: { marginTop: 12, color: '#888', textAlign: 'center', fontSize: 15, lineHeight: 22 },
  retryBtn: {
    marginTop: 20, backgroundColor: '#E65100',
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
