import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity,
  Platform, Alert, ScrollView, Modal, Image,
  ActivityIndicator, TextInput,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
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
import { ColorSchemeName, schemeLabels } from '../../theme';

const SCHEME_PREVIEWS: Record<ColorSchemeName, [string, string]> = {
  cosmic:  ['#1E1040', '#8B5CF6'],
  ocean:   ['#0C2340', '#0EA5E9'],
  saffron: ['#7C2D12', '#F97316'],
  rose:    ['#881337', '#F43F5E'],
  forest:  ['#064E3B', '#10B981'],
  gold:    ['#78350F', '#F59E0B'],
};

export default function SettingsScreen() {
  const { user } = useAuth();
  const { theme, isDark, colorScheme, toggleDark, setColorScheme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { request, response, promptAsync } = useGoogleAuth();

  const [signingIn, setSigningIn] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  const [enabled, setEnabled] = useState(true);
  const [time, setTime] = useState(() => { const d = new Date(); d.setHours(DEFAULT_HOUR, DEFAULT_MINUTE, 0, 0); return d; });
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getNotificationTime().then(({ hour, minute }) => {
      const d = new Date(); d.setHours(hour, minute, 0, 0); setTime(d);
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

  async function applyTimeChange(selected: Date) {
    setSaving(true);
    const h = selected.getHours(), m = selected.getMinutes();
    await saveNotificationTime(h, m);
    if (enabled) {
      try { await scheduleNotifications(await loadSaamethas(), h, m); }
      catch { Alert.alert('Error', 'Could not reschedule notifications.'); }
    }
    setSaving(false);
  }

  function onPickerChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowPicker(false);
    if (!selected) return;
    setTime(selected);
    applyTimeChange(selected);
  }

  async function handleEnableToggle(value: boolean) {
    setEnabled(value);
    if (value) {
      if (!await requestPermissions()) { setEnabled(false); Alert.alert('Permission required', 'Enable notifications in device Settings.'); return; }
      await scheduleNotifications(await loadSaamethas(), time.getHours(), time.getMinutes());
    } else {
      const { cancelAllScheduledNotificationsAsync } = await import('expo-notifications');
      await cancelAllScheduledNotificationsAsync();
    }
  }

  async function handleTestNotification() {
    if (!await requestPermissions()) { Alert.alert('Permission required', 'Enable notifications in Settings.'); return; }
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
          {/* Profile header */}
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

          {/* Sign out */}
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
        {/* Dark / Light toggle */}
        <View style={s.menuRow}>
          <MaterialIcons name={isDark ? 'dark-mode' : 'light-mode'} size={22} color={theme.primary} />
          <Text style={s.menuRowLabel}>Dark Mode</Text>
          <Switch value={isDark} onValueChange={toggleDark}
            trackColor={{ false: theme.border, true: theme.primary + '88' }}
            thumbColor={isDark ? theme.primary : theme.textMuted} />
        </View>

        <View style={s.divider} />

        {/* Color scheme picker */}
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
            <TouchableOpacity style={s.menuRow} onPress={() => setShowPicker(true)}>
              <MaterialIcons name="schedule" size={22} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.menuRowLabel}>Notification Time</Text>
                <Text style={s.menuRowSub}>Tap to change</Text>
              </View>
              {saving
                ? <Text style={s.savingText}>Saving...</Text>
                : <Text style={s.timeValue}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              }
              <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker value={time} mode="time" display="default" onChange={onPickerChange} />
      )}
      {Platform.OS === 'ios' && (
        <Modal transparent visible={showPicker} animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Set Notification Time</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}><Text style={[s.modalTitle, { color: theme.primary }]}>Done</Text></TouchableOpacity>
              </View>
              <DateTimePicker value={time} mode="time" display="spinner" onChange={onPickerChange} style={{ width: '100%' }} />
            </View>
          </View>
        </Modal>
      )}

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

function makeStyles(theme: ReturnType<typeof import('../../theme').buildTheme>) {
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
    // Modals
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalSheet: { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
    modalTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
    nameInput: { backgroundColor: theme.surface2, borderRadius: 12, padding: 14, fontSize: 16, color: theme.text, borderWidth: 1, borderColor: theme.border, margin: 16 },
    modalActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
    modalCancel: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.surface2, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    modalSave: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  });
}
