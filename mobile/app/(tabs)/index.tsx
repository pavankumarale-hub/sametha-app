import { useEffect, useState, useCallback, useMemo } from 'react';
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
import { getMeaning, MeaningData } from '../../services/meanings';
import { consumePendingSametha } from '../../services/notificationState';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Theme, todayGradient } from '../../theme';

export default function TodayScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saamethas, setSaamethas] = useState<string[]>([]);
  const [displayed, setDisplayed] = useState('');
  const [isToday, setIsToday] = useState(true);
  const [error, setError] = useState('');
  const [favourited, setFavourited] = useState(false);
  const [favId, setFavId] = useState<string | null>(null);
  const [meaning, setMeaning] = useState<MeaningData | null>(null);
  const [meaningError, setMeaningError] = useState<string | null>(null);
  const [loadingMeaning, setLoadingMeaning] = useState(false);

  const s = useMemo(() => makeStyles(theme), [theme]);

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

  async function fetchMeaning(text: string) {
    setMeaning(null);
    setMeaningError(null);
    setLoadingMeaning(true);
    const { data, error } = await getMeaning(text);
    setMeaning(data);
    setMeaningError(error);
    setLoadingMeaning(false);
  }

  useEffect(() => { init(); }, []);

  useFocusEffect(useCallback(() => {
    // Check if we arrived here from a notification tap
    const pending = consumePendingSametha();
    if (pending && saamethas.length) {
      setDisplayed(pending);
      setIsToday(false);
      return;
    }
    if (saamethas.length) {
      const today = getTodaysSametha(saamethas);
      setDisplayed(today);
      setIsToday(true);
      refreshFavState(today);
    }
  }, [saamethas, user]));

  useEffect(() => {
    if (displayed) {
      refreshFavState(displayed);
      fetchMeaning(displayed);
    }
  }, [displayed, user]);

  function showRandom() {
    if (!saamethas.length) return;
    setDisplayed(saamethas[Math.floor(Math.random() * saamethas.length)]);
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

  if (loading) return (
    <View style={s.centered}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={s.statusText}>Loading saamethas...</Text>
    </View>
  );

  if (error) return (
    <View style={s.centered}>
      <MaterialIcons name="wifi-off" size={48} color={theme.textMuted} />
      <Text style={s.errorText}>{error}</Text>
      <TouchableOpacity style={s.retryBtn} onPress={() => { setLoading(true); setError(''); init(); }}>
        <Text style={s.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); init(true); }} tintColor={theme.primary} />}
    >
      <Text style={s.dateText}>{today.toUpperCase()}</Text>

      {!isToday && (
        <TouchableOpacity style={s.todayChip} onPress={showToday}>
          <MaterialIcons name="today" size={13} color={theme.gold} />
          <Text style={s.todayChipText}>Back to Today's</Text>
        </TouchableOpacity>
      )}

      <LinearGradient colors={todayGradient(theme)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.card}>
        <MaterialIcons name="format-quote" size={40} color="rgba(255,255,255,0.3)" style={{ marginBottom: 8 }} />
        <Text style={s.samethaText}>{displayed}</Text>
        <View style={s.cardFooter}>
          <Text style={s.cardLabel}>TELUGU PROVERB</Text>
          <TouchableOpacity onPress={handleToggleFavourite} hitSlop={12}>
            <MaterialIcons
              name={favourited ? 'favorite' : 'favorite-border'}
              size={24}
              color={favourited ? '#FF6B6B' : 'rgba(255,255,255,0.6)'}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={s.actions}>
        <TouchableOpacity style={s.btn} onPress={() => Share.share({ message: `"${displayed}"\n\n— via Sametha App` })}>
          <MaterialIcons name="share" size={19} color={theme.text} />
          <Text style={s.btnText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={showRandom}>
          <MaterialIcons name="shuffle" size={19} color="#fff" />
          <Text style={[s.btnText, { color: '#fff' }]}>Random</Text>
        </TouchableOpacity>
      </View>

      {/* ── MEANING SECTION ── */}
      <View style={s.meaningCard}>
        <View style={s.meaningSectionHeader}>
          <MaterialIcons name="menu-book" size={18} color={theme.primary} />
          <Text style={s.meaningSectionTitle}>MEANING</Text>
        </View>

        {loadingMeaning ? (
          <View style={s.meaningLoading}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={s.meaningLoadingText}>Fetching meaning...</Text>
          </View>
        ) : meaningError ? (
          <Text style={s.meaningUnavailable}>{meaningError}</Text>
        ) : meaning ? (
          <>
            <Text style={s.meaningText}>{meaning.meaning}</Text>

            <View style={s.exampleBlock}>
              <View style={s.exampleHeader}>
                <MaterialIcons name="chat-bubble-outline" size={15} color={theme.primary} />
                <Text style={s.exampleTitle}>EXAMPLE</Text>
              </View>
              <Text style={s.exampleContext}>{meaning.example.context}</Text>
              <View style={s.conversationBox}>
                {meaning.example.conversation.map((line, i) => (
                  <View key={i} style={s.conversationLine}>
                    <Text style={s.speakerName}>{line.speaker}:</Text>
                    <Text style={s.speakerLine}>{line.line}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}
      </View>

      <Text style={s.totalText}>{saamethas.length.toLocaleString()} saamethas</Text>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: theme.bg },
    container: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, alignItems: 'center', backgroundColor: theme.bg },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: theme.bg },
    dateText: { fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 10 },
    todayChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 14, paddingVertical: 6, backgroundColor: theme.surface2,
      borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: theme.border,
    },
    todayChipText: { fontSize: 12, color: theme.gold, fontWeight: '600' },
    card: {
      width: '100%', borderRadius: 24, padding: 28, marginVertical: 12, minHeight: 240,
      justifyContent: 'space-between',
      shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
    },
    samethaText: { fontSize: 22, lineHeight: 34, color: '#FFFFFF', fontWeight: '500', flex: 1 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
    cardLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 12, marginTop: 4, width: '100%' },
    btn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 14, borderRadius: 14, backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border,
    },
    btnPrimary: { backgroundColor: theme.primary, borderColor: theme.primary },
    btnText: { color: theme.text, fontWeight: '600', fontSize: 15 },
    // Meaning card
    meaningCard: {
      width: '100%', marginTop: 20, backgroundColor: theme.surface, borderRadius: 20,
      borderWidth: 1, borderColor: theme.border, padding: 20,
    },
    meaningSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    meaningSectionTitle: { fontSize: 11, fontWeight: '700', color: theme.primary, letterSpacing: 1.5 },
    meaningText: { fontSize: 15, color: theme.text, lineHeight: 24 },
    meaningLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    meaningLoadingText: { fontSize: 14, color: theme.textMuted },
    meaningUnavailable: { fontSize: 14, color: theme.textMuted, lineHeight: 22 },
    // Example block
    exampleBlock: { marginTop: 18 },
    exampleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    exampleTitle: { fontSize: 11, fontWeight: '700', color: theme.primary, letterSpacing: 1.5 },
    exampleContext: { fontSize: 13, color: theme.textSub, fontStyle: 'italic', marginBottom: 12, lineHeight: 20 },
    conversationBox: {
      backgroundColor: theme.surface2, borderRadius: 14, padding: 14, gap: 10,
      borderLeftWidth: 3, borderLeftColor: theme.primary + '88',
    },
    conversationLine: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    speakerName: { fontSize: 14, fontWeight: '700', color: theme.primary, minWidth: 50 },
    speakerLine: { flex: 1, fontSize: 14, color: theme.text, lineHeight: 21 },
    totalText: { marginTop: 28, color: theme.textMuted, fontSize: 12 },
    statusText: { marginTop: 12, color: theme.textSub, fontSize: 15 },
    errorText: { marginTop: 12, color: theme.textSub, textAlign: 'center', fontSize: 15, lineHeight: 22 },
    retryBtn: { marginTop: 20, backgroundColor: theme.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  });
}
