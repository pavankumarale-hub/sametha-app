import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  Share, TouchableOpacity, ScrollView, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { loadSaamethas, getTodaysSametha } from '../../services/saamethas';
import { ensureNotificationsScheduled } from '../../services/notifications';
import { addFavourite, removeFavourite, getFavourites } from '../../services/cloudFavorites';
import { useAuth } from '../../context/AuthContext';
import { T, todayGradient } from '../../theme';

export default function TodayScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saamethas, setSaamethas] = useState<string[]>([]);
  const [displayed, setDisplayed] = useState('');
  const [isToday, setIsToday] = useState(true);
  const [error, setError] = useState('');
  const [favourited, setFavourited] = useState(false);
  const [favId, setFavId] = useState<string | null>(null);

  async function init(isRefresh = false) {
    try {
      const data = await loadSaamethas();
      setSaamethas(data);
      const today = getTodaysSametha(data);
      setDisplayed(today);
      setIsToday(true);
      await ensureNotificationsScheduled(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load. Check your connection.');
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }

  async function refreshFavState(text: string) {
    const favs = await getFavourites(user?.uid);
    const match = favs.find((f) => f.text === text);
    setFavourited(!!match);
    setFavId(match?.id ?? null);
  }

  useEffect(() => { init(); }, []);

  useFocusEffect(
    useCallback(() => {
      if (saamethas.length) {
        const today = getTodaysSametha(saamethas);
        setDisplayed(today);
        setIsToday(true);
        refreshFavState(today);
      }
    }, [saamethas, user])
  );

  useEffect(() => {
    if (displayed) refreshFavState(displayed);
  }, [displayed, user]);

  function showRandom() {
    if (!saamethas.length) return;
    const next = saamethas[Math.floor(Math.random() * saamethas.length)];
    setDisplayed(next);
    setIsToday(false);
  }

  function showToday() {
    const today = getTodaysSametha(saamethas);
    setDisplayed(today);
    setIsToday(true);
  }

  async function handleToggleFavourite() {
    if (favourited && favId) {
      await removeFavourite(favId, user?.uid);
      setFavourited(false);
      setFavId(null);
    } else {
      await addFavourite(displayed, user?.uid);
      await refreshFavState(displayed);
    }
  }

  async function shareSametha() {
    await Share.share({ message: `"${displayed}"\n\n— via Sametha App` });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={T.primary} />
        <Text style={styles.statusText}>Loading saamethas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="wifi-off" size={48} color={T.textMuted} />
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
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); init(true); }}
          tintColor={T.primary}
        />
      }
    >
      {/* Date */}
      <Text style={styles.dateText}>{today.toUpperCase()}</Text>

      {/* Back-to-today chip */}
      {!isToday && (
        <TouchableOpacity style={styles.todayChip} onPress={showToday}>
          <MaterialIcons name="today" size={13} color={T.gold} />
          <Text style={styles.todayChipText}>Back to Today's</Text>
        </TouchableOpacity>
      )}

      {/* Gradient quote card */}
      <LinearGradient
        colors={todayGradient()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <MaterialIcons name="format-quote" size={40} color="rgba(255,255,255,0.3)" style={styles.quoteIcon} />
        <Text style={styles.samethaText}>{displayed}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardLabel}>Telugu Proverb</Text>
          <TouchableOpacity onPress={handleToggleFavourite} hitSlop={12}>
            <MaterialIcons
              name={favourited ? 'favorite' : 'favorite-border'}
              size={22}
              color={favourited ? '#FF6B6B' : 'rgba(255,255,255,0.6)'}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={shareSametha}>
          <MaterialIcons name="share" size={19} color={T.text} />
          <Text style={styles.btnText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={showRandom}>
          <MaterialIcons name="shuffle" size={19} color={T.text} />
          <Text style={styles.btnText}>Random</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.totalText}>{saamethas.length.toLocaleString()} saamethas</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: T.bg },
  container: {
    flexGrow: 1, paddingHorizontal: 20, paddingTop: 20,
    paddingBottom: 40, alignItems: 'center', backgroundColor: T.bg,
  },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 24, backgroundColor: T.bg,
  },
  dateText: {
    fontSize: 11, color: T.textMuted, letterSpacing: 1.5, fontWeight: '700',
    marginBottom: 10,
  },
  todayChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: T.surface2, borderRadius: 20, marginBottom: 12,
    borderWidth: 1, borderColor: T.border,
  },
  todayChipText: { fontSize: 12, color: T.gold, fontWeight: '600' },
  card: {
    width: '100%', borderRadius: 24, padding: 28,
    marginVertical: 12, minHeight: 240,
    justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  quoteIcon: { marginBottom: 8 },
  samethaText: {
    fontSize: 22, lineHeight: 34, color: '#FFFFFF',
    fontWeight: '500', flex: 1,
  },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 20,
  },
  cardLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16, width: '100%' },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
    backgroundColor: T.surface2, borderWidth: 1, borderColor: T.border,
  },
  btnPrimary: { backgroundColor: T.primary, borderColor: T.primary },
  btnText: { color: T.text, fontWeight: '600', fontSize: 15 },
  totalText: { marginTop: 28, color: T.textMuted, fontSize: 12 },
  statusText: { marginTop: 12, color: T.textSub, fontSize: 15 },
  errorText: { marginTop: 12, color: T.textSub, textAlign: 'center', fontSize: 15, lineHeight: 22 },
  retryBtn: {
    marginTop: 20, backgroundColor: T.primary,
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
