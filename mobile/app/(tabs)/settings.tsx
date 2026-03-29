import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity,
  Alert, ScrollView, Modal, Image,
  ActivityIndicator, TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { updateProfile } from 'firebase/auth';
import { auth } from '../../services/firebase';
import {
  getNotificationTime, saveNotificationTime,
  scheduleNotifications, sendTestNotification,
  requestPermissions, DEFAULT_HOUR, DEFAULT_MINUTE,
} from '../../services/notifications';
import { loadSaamethas } from '../../services/saamethas';
import { useGoogleAuth, signInWithGoogleToken, signOut } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Theme, ColorSchemeName, schemeLabels } from '../../theme';

const SCHEME_PREVIEWS: Record<ColorSchemeName, [string, string]> = {
  cosmic:  ['#1E1040', '#8B5CF6'],
  ocean:   ['#0C2340', '#0EA5E9'],
  saffron: ['#7C2D12', '#F97316'],
  rose:    ['#881337', '#F43F5E'],
  forest:  ['#064E3B', '#10B981'],
  gold:    ['#78350F', '#F59E0B'],
};

function formatTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const m = minute.toString().padStart(2, '0');
  return `${h}:${m} ${ampm}`;
}

export default function SettingsScreen() {
  const { user } = useAuth();
  const { theme, isDark, colorScheme, toggleDark, setColorScheme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { request, response, promptAsync } = useGoogleAuth();

  const [signingIn, setSigningIn] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  const [enabled, setEnabled] = useState(true);
  const [hour, setHour] = useState(DEFAULT_HOUR);
  const [minute, setMinute] = useState(DEFAULT_MINUTE);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getNotificationTime().then(({ hour: h, minute: m }) => {
      setHour(h);
      setMinute(m);
    });
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = (response.params as any).id_token;
      if (idToken) {
        setSigningIn(true);
        signInWithGoogleToken(idToken)
          .catch(() => Alert.alert('Sign-in failed', 'Please try again.'))
          .finally(() => setSigningIn(false));
      }
    }
  }, [response]);

  async function handleSaveName() {
    if (!auth.currentUser || !newName.trim()) return;
    await updateProfile(auth.currentUser, { displayName: newName.trim() });
    setEditingName(false);
  }

  async function applyTimeChange(h: number, m: number) {
    setSaving(true);
    await saveNotificationTime(h, m);
    if (enabled) {
      try { await scheduleNotifications(await loadSaamethas(), h, m); }
      catch { Alert.alert('Error', 'Could not reschedule notifications.'); }
    }
    setSaving(false);
  }

  async function handleEnableToggle(value: boolean) {
    setEnabled(value);
    if (value) {
      if (!await requestPermissions()) {
        setEnabled(false);
        Alert.alert('Permission required', 'Enable notifications in device Settings.');
        return;
      }
      await scheduleNotifications(await loadSaamethas(), hour, minute);
    } else {
      const { cancelAllScheduledNotificationsAsync } = await import('expo-notifications');
      await cancelAllScheduledNotificationsAsync();
    }
  }

  async function handleTestNotification() {
    if (!await requestPermissions()) {
      Alert.alert('Permission required', 'Enable notifications in Settings.');
      return;
    }
    const saamethas = await loadSaamethas();
    await sendTestNotification(saamethas[Math.floor(Math.random() * saamethas.length)]);
    Alert.alert('Test sent!', 'You will receive a notification in 3 seconds.');
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      {/* ── ACCOUNT ── */}
      <Text style={s.sectionLabel}>ACCOUNT</Text>
      {user ? (
        <View style={s.card}>
          <LinearGradient colors={[theme.primary + '44', theme.surface2]} style={s.profileGrad}>
            {user.photoURL
              ? <Image source={{ uri: user.photoURL }} style={s.avatar} />
              : <View style={[s.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                  <Text style={s.avatarInitial}>{(user.displayName ?? user.email ?? '?')[0].toUpperCase()}</Text>
                </View>
            }
            <View style={{ flex: 1 }}>
              <Text style={s.profileName}>{user.displayName ?? 'User'}</Text>
              <Text style={s.profileEmail}>{user.email}</Text>
            </View>
            <TouchableOpacity hitSlop={12} onPress={() => { setNewName(user.displayName ?? ''); setEditingName(true); }}>
              <MaterialIcons name="edit" size={20} color={theme.primary} />
            </TouchableOpacity>
          </LinearGradient>
          <View style={s.divider} />
          <TouchableOpacity style={s.menuRow} onPress={() =>
            Alert.alert('Sign out', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: signOut },
            ])}>
            <MaterialIcons name="logout" size={20} color={theme.rose} />
            <Text style={[s.menuRowText, { color: theme.rose }]}>Sign out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.signInDesc}>Sign in to sync favourites across all your devices.</Text>
          <TouchableOpacity
            style={[s.googleBtn, (!request || signingIn) && { opacity: 0.5 }]}
            onPress={() => promptAsync()}
            disabled={!request || signingIn}
          >
            {signingIn
              ? <ActivityIndicator size="small" color="#fff" />
              : <><MaterialIcons name="login" size={20} color="#fff" /><Text style={s.googleBtnText}>Continue with Google</Text></>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* ── APPEARANCE ── */}
      <Text style={s.sectionLabel}>APPEARANCE</Text>
      <View style={s.card}>
        <View style={s.menuRow}>
          <MaterialIcons name={isDark ? 'dark-mode' : 'light-mode'} size={22} color={theme.primary} />
          <Text style={s.menuRowLabel}>Dark Mode</Text>
          <Switch value={isDark} onValueChange={toggleDark}
            trackColor={{ false: theme.border, true: theme.primary + '88' }}
            thumbColor={isDark ? theme.primary : theme.textMuted} />
        </View>
        <View style={s.divider} />
        <Text style={s.pickerLabel}>Theme Colour</Text>
        <View style={s.schemeGrid}>
          {(Object.keys(SCHEME_PREVIEWS) as ColorSchemeName[]).map((key) => (
            <TouchableOpacity
              key={key}
              style={[s.schemeChip, colorScheme === key && { borderColor: SCHEME_PREVIEWS[key][1], borderWidth: 2.5 }]}
              onPress={() => setColorScheme(key)}
            >
              <LinearGradient colors={SCHEME_PREVIEWS[key]} style={s.schemeGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                {colorScheme === key && <MaterialIcons name="check" size={14} color="#fff" />}
              </LinearGradient>
              <Text style={s.schemeLabel}>{schemeLabels[key]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── NOTIFICATIONS ── */}
      <Text style={s.sectionLabel}>NOTIFICATIONS</Text>
      <View style={s.card}>
        <View style={s.menuRow}>
          <MaterialIcons name="notifications-active" size={22} color={theme.primary} />
          <Text style={s.menuRowLabel}>Daily Sametha</Text>
          <Switch value={enabled} onValueChange={handleEnableToggle}
            trackColor={{ false: theme.border, true: theme.primary + '88' }}
            thumbColor={enabled ? theme.primary : theme.textMuted} />
        </View>
        {enabled && (
          <>
            <View style={s.divider} />
            <TouchableOpacity style={s.menuRow} onPress={() => setShowTimePicker(true)}>
              <MaterialIcons name="schedule" size={22} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.menuRowLabel}>Notification Time</Text>
                <Text style={s.menuRowSub}>Tap to change</Text>
              </View>
              {saving
                ? <Text style={s.savingText}>Saving...</Text>
                : <Text style={s.timeValue}>{formatTime(hour, minute)}</Text>
              }
              <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── TEST ── */}
      <Text style={s.sectionLabel}>TESTING</Text>
      <View style={s.card}>
        <TouchableOpacity style={s.testBtn} onPress={handleTestNotification}>
          <MaterialIcons name="send" size={18} color="#fff" />
          <Text style={s.testBtnText}>Send Test Notification</Text>
        </TouchableOpacity>
        <Text style={s.testHint}>Fires in 3 seconds with a random sametha.</Text>
      </View>

      {/* ── ABOUT ── */}
      <Text style={s.sectionLabel}>ABOUT</Text>
      <View style={s.card}>
        <Text style={s.aboutText}>Telugu proverbs sourced from <Text style={{ color: theme.primary, fontWeight: '600' }}>saamethalu.com</Text></Text>
      </View>

      {/* ── Time Picker Modal ── */}
      <Modal visible={showTimePicker} transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Notification Time</Text>
            <View style={s.timePickerRow}>
              {/* Hour picker */}
              <View style={s.spinnerCol}>
                <TouchableOpacity onPress={() => setHour((h) => (h + 1) % 24)} style={s.spinBtn}>
                  <MaterialIcons name="keyboard-arrow-up" size={28} color={theme.primary} />
                </TouchableOpacity>
                <Text style={s.spinValue}>{hour.toString().padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => setHour((h) => (h + 23) % 24)} style={s.spinBtn}>
                  <MaterialIcons name="keyboard-arrow-down" size={28} color={theme.primary} />
                </TouchableOpacity>
              </View>
              <Text style={s.timeSep}>:</Text>
              {/* Minute picker */}
              <View style={s.spinnerCol}>
                <TouchableOpacity onPress={() => setMinute((m) => (m + 1) % 60)} style={s.spinBtn}>
                  <MaterialIcons name="keyboard-arrow-up" size={28} color={theme.primary} />
                </TouchableOpacity>
                <Text style={s.spinValue}>{minute.toString().padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => setMinute((m) => (m + 59) % 60)} style={s.spinBtn}>
                  <MaterialIcons name="keyboard-arrow-down" size={28} color={theme.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={s.timePreview}>{formatTime(hour, minute)}</Text>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowTimePicker(false)}>
                <Text style={{ color: theme.textSub, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalSave, { backgroundColor: theme.primary }]} onPress={() => { setShowTimePicker(false); applyTimeChange(hour, minute); }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit name modal */}
      <Modal visible={editingName} transparent animationType="fade" onRequestClose={() => setEditingName(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { borderRadius: 20 }]}>
            <Text style={s.modalTitle}>Update Display Name</Text>
            <TextInput style={s.nameInput} value={newName} onChangeText={setNewName}
              placeholder="Your name" placeholderTextColor={theme.textMuted} autoFocus />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setEditingName(false)}>
                <Text style={{ color: theme.textSub, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalSave, { backgroundColor: theme.primary }]} onPress={handleSaveName}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 16, paddingBottom: 48 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 1.2, marginBottom: 8, marginLeft: 4, marginTop: 20 },
    card: { backgroundColor: theme.surface, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
    divider: { height: 1, backgroundColor: theme.border, marginHorizontal: 16 },
    // Profile
    profileGrad: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    avatarInitial: { fontSize: 22, fontWeight: '700', color: '#fff' },
    profileName: { fontSize: 17, fontWeight: '700', color: theme.text },
    profileEmail: { fontSize: 13, color: theme.textSub, marginTop: 2 },
    menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
    menuRowLabel: { flex: 1, fontSize: 16, color: theme.text },
    menuRowSub: { fontSize: 12, color: theme.textMuted },
    menuRowText: { flex: 1, fontSize: 16, fontWeight: '600' },
    // Sign in
    signInDesc: { fontSize: 14, color: theme.textSub, lineHeight: 20, padding: 16, paddingBottom: 12 },
    googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: theme.primary, margin: 16, marginTop: 4, padding: 14, borderRadius: 12 },
    googleBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    // Appearance
    pickerLabel: { fontSize: 13, color: theme.textMuted, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, fontWeight: '600' },
    schemeGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 16, gap: 10 },
    schemeChip: { alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', padding: 4 },
    schemeGrad: { width: 48, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    schemeLabel: { fontSize: 11, color: theme.textSub, fontWeight: '600' },
    // Notifications
    timeValue: { fontSize: 16, color: theme.primary, fontWeight: '700' },
    savingText: { fontSize: 13, color: theme.textMuted },
    testBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.primary, margin: 16, padding: 14, borderRadius: 12 },
    testBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    testHint: { fontSize: 12, color: theme.textMuted, textAlign: 'center', marginBottom: 16 },
    aboutText: { fontSize: 14, color: theme.textSub, lineHeight: 22, padding: 16 },
    // Time picker
    timePickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 16 },
    spinnerCol: { alignItems: 'center', gap: 4 },
    spinBtn: { padding: 8 },
    spinValue: { fontSize: 42, fontWeight: '700', color: theme.text, minWidth: 70, textAlign: 'center' },
    timeSep: { fontSize: 42, fontWeight: '700', color: theme.text, marginBottom: 8 },
    timePreview: { textAlign: 'center', fontSize: 15, color: theme.textMuted, marginBottom: 16 },
    // Modals
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalSheet: { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36, padding: 20 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 8 },
    nameInput: { backgroundColor: theme.surface2, borderRadius: 12, padding: 14, fontSize: 16, color: theme.text, borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalCancel: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.surface2, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    modalSave: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  });
}
