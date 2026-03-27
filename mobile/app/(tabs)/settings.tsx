import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity,
  Platform, Alert, ScrollView, Modal, Image, ActivityIndicator,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getNotificationTime, saveNotificationTime,
  scheduleNotifications, sendTestNotification,
  requestPermissions, DEFAULT_HOUR, DEFAULT_MINUTE,
} from '../../services/notifications';
import { loadSaamethas } from '../../services/saamethas';
import { useGoogleAuth, signInWithGoogleToken, signOut } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { T } from '../../theme';

export default function SettingsScreen() {
  const { user } = useAuth();
  const { request, response, promptAsync } = useGoogleAuth();
  const [signingIn, setSigningIn] = useState(false);

  const [enabled, setEnabled] = useState(true);
  const [time, setTime] = useState(() => {
    const d = new Date();
    d.setHours(DEFAULT_HOUR, DEFAULT_MINUTE, 0, 0);
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getNotificationTime().then(({ hour, minute }) => {
      const d = new Date();
      d.setHours(hour, minute, 0, 0);
      setTime(d);
    });
  }, []);

  // Handle Google OAuth response
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

  async function applyTimeChange(selected: Date) {
    setSaving(true);
    const hour = selected.getHours();
    const minute = selected.getMinutes();
    await saveNotificationTime(hour, minute);
    if (enabled) {
      try {
        const saamethas = await loadSaamethas();
        await scheduleNotifications(saamethas, hour, minute);
      } catch {
        Alert.alert('Error', 'Could not reschedule notifications.');
      }
    }
    setSaving(false);
  }

  function onPickerChange(_event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowPicker(false);
    if (!selected) return;
    setTime(selected);
    applyTimeChange(selected);
  }

  async function handleEnableToggle(value: boolean) {
    setEnabled(value);
    if (value) {
      const granted = await requestPermissions();
      if (!granted) {
        setEnabled(false);
        Alert.alert('Permission required', 'Please enable notifications in device Settings.');
        return;
      }
      const saamethas = await loadSaamethas();
      await scheduleNotifications(saamethas, time.getHours(), time.getMinutes());
    } else {
      const { cancelAllScheduledNotificationsAsync } = await import('expo-notifications');
      await cancelAllScheduledNotificationsAsync();
    }
  }

  async function handleTestNotification() {
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert('Permission required', 'Please enable notifications in Settings.');
      return;
    }
    const saamethas = await loadSaamethas();
    const random = saamethas[Math.floor(Math.random() * saamethas.length)];
    await sendTestNotification(random);
    Alert.alert('Test sent!', 'You will receive a notification in 3 seconds.');
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Account section */}
      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      {user ? (
        <View style={styles.card}>
          <LinearGradient
            colors={[T.primary + '33', T.surface2]}
            style={styles.profileGradient}
          >
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(user.displayName ?? user.email ?? '?')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.displayName ?? 'User'}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
          </LinearGradient>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <MaterialIcons name="logout" size={18} color={T.rose} />
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.signInDesc}>
            Sign in to sync your favourites across devices.
          </Text>
          <TouchableOpacity
            style={[styles.googleBtn, !request && styles.googleBtnDisabled]}
            onPress={() => promptAsync()}
            disabled={!request || signingIn}
          >
            {signingIn ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="login" size={20} color="#fff" />
                <Text style={styles.googleBtnText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications section */}
      <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <MaterialIcons name="notifications-active" size={22} color={T.primary} />
            <Text style={styles.rowLabel}>Daily Sametha</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleEnableToggle}
            trackColor={{ false: T.border, true: T.primary + '88' }}
            thumbColor={enabled ? T.primary : T.textMuted}
          />
        </View>

        {enabled && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.row} onPress={() => setShowPicker(true)}>
              <View style={styles.rowLeft}>
                <MaterialIcons name="schedule" size={22} color={T.primary} />
                <View>
                  <Text style={styles.rowLabel}>Notification Time</Text>
                  <Text style={styles.rowSub}>Tap to change</Text>
                </View>
              </View>
              <View style={styles.rowRight}>
                {saving
                  ? <Text style={styles.savingText}>Saving...</Text>
                  : <Text style={styles.timeValue}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                }
                <MaterialIcons name="chevron-right" size={20} color={T.textMuted} />
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker value={time} mode="time" display="default" onChange={onPickerChange} />
      )}
      {Platform.OS === 'ios' && (
        <Modal transparent visible={showPicker} animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Set Notification Time</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker value={time} mode="time" display="spinner" onChange={onPickerChange} style={{ width: '100%' }} />
            </View>
          </View>
        </Modal>
      )}

      {/* Testing */}
      <Text style={styles.sectionLabel}>TESTING</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.testBtn} onPress={handleTestNotification}>
          <MaterialIcons name="send" size={18} color="#fff" />
          <Text style={styles.testBtnText}>Send Test Notification</Text>
        </TouchableOpacity>
        <Text style={styles.testHint}>Fires in 3 seconds with a random sametha.</Text>
      </View>

      {/* About */}
      <Text style={styles.sectionLabel}>ABOUT</Text>
      <View style={styles.card}>
        <Text style={styles.aboutText}>
          Telugu proverbs (saamethas) sourced from{'\n'}
          <Text style={styles.link}>saamethalu.com</Text>
        </Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { padding: 16, paddingBottom: 48 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: T.textMuted, letterSpacing: 1.2,
    marginBottom: 8, marginLeft: 4, marginTop: 20,
  },
  card: {
    backgroundColor: T.surface, borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: T.border,
  },
  // Profile
  profileGradient: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: T.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: 22, fontWeight: '700', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', color: T.text },
  profileEmail: { fontSize: 13, color: T.textSub, marginTop: 2 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 16, borderTopWidth: 1, borderTopColor: T.border,
  },
  signOutText: { fontSize: 15, color: T.rose, fontWeight: '600' },
  signInDesc: { fontSize: 14, color: T.textSub, lineHeight: 20, padding: 16, paddingBottom: 12 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: T.primary, margin: 16, marginTop: 4,
    padding: 14, borderRadius: 12,
  },
  googleBtnDisabled: { opacity: 0.5 },
  googleBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // Notifications
  divider: { height: 1, backgroundColor: T.border, marginHorizontal: 16 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowLabel: { fontSize: 16, color: T.text },
  rowSub: { fontSize: 12, color: T.textMuted, marginTop: 1 },
  timeValue: { fontSize: 16, color: T.primary, fontWeight: '700' },
  savingText: { fontSize: 13, color: T.textMuted },
  testBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: T.primary, margin: 16, padding: 14, borderRadius: 12,
  },
  testBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  testHint: { fontSize: 12, color: T.textMuted, textAlign: 'center', marginBottom: 16 },
  aboutText: { fontSize: 14, color: T.textSub, lineHeight: 22, padding: 16 },
  link: { color: T.primary, fontWeight: '600' },
  // iOS modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: T.text },
  modalDone: { fontSize: 16, color: T.primary, fontWeight: '700' },
});
