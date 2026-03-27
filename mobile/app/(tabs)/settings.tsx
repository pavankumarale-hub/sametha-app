import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity,
  Platform, Alert, ScrollView, Modal,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import {
  getNotificationTime, saveNotificationTime,
  scheduleNotifications, sendTestNotification,
  requestPermissions, DEFAULT_HOUR, DEFAULT_MINUTE,
} from '../../services/notifications';
import { loadSaamethas } from '../../services/saamethas';

export default function SettingsScreen() {
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
        Alert.alert('Error', 'Could not reschedule notifications. Try again.');
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
        Alert.alert(
          'Permission required',
          'Please enable notifications for Sametha in your device Settings.'
        );
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

  function formatTime(d: Date) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Notification section */}
      <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
      <View style={styles.card}>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <MaterialIcons name="notifications-active" size={22} color="#E65100" />
            <Text style={styles.rowLabel}>Daily Sametha</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleEnableToggle}
            trackColor={{ false: '#ddd', true: '#FFCC80' }}
            thumbColor={enabled ? '#E65100' : '#f4f3f4'}
          />
        </View>

        {enabled && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.row} onPress={() => setShowPicker(true)}>
              <View style={styles.rowLeft}>
                <MaterialIcons name="schedule" size={22} color="#E65100" />
                <View>
                  <Text style={styles.rowLabel}>Notification Time</Text>
                  <Text style={styles.rowSub}>Tap to change</Text>
                </View>
              </View>
              <View style={styles.rowRight}>
                {saving
                  ? <Text style={styles.savingText}>Saving…</Text>
                  : <Text style={styles.timeValue}>{formatTime(time)}</Text>
                }
                <MaterialIcons name="chevron-right" size={20} color="#ccc" />
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Android: show picker inline as dialog */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={time}
          mode="time"
          display="default"
          onChange={onPickerChange}
        />
      )}

      {/* iOS: show in a modal with spinner */}
      {Platform.OS === 'ios' && (
        <Modal
          transparent
          visible={showPicker}
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Set Notification Time</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={time}
                mode="time"
                display="spinner"
                onChange={onPickerChange}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Testing section */}
      <Text style={styles.sectionLabel}>TESTING</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.testBtn} onPress={handleTestNotification}>
          <MaterialIcons name="send" size={18} color="#fff" />
          <Text style={styles.testBtnText}>Send Test Notification</Text>
        </TouchableOpacity>
        <Text style={styles.testHint}>Fires in 3 seconds with a random sametha.</Text>
      </View>

      {/* About section */}
      <Text style={styles.sectionLabel}>ABOUT</Text>
      <View style={styles.card}>
        <Text style={styles.aboutText}>
          Telugu proverbs (saamethas) sourced from{'\n'}
          <Text style={styles.link}>saamethalu.com</Text>
        </Text>
        <Text style={[styles.aboutText, { marginTop: 8 }]}>
          Notifications are scheduled locally on your device — no account needed.
        </Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  content: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 1,
    marginBottom: 8, marginLeft: 4, marginTop: 16,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  divider: { height: 1, backgroundColor: '#F5EDE4', marginVertical: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 8,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowLabel: { fontSize: 16, color: '#333' },
  rowSub: { fontSize: 12, color: '#bbb', marginTop: 1 },
  timeValue: { fontSize: 16, color: '#E65100', fontWeight: '700' },
  savingText: { fontSize: 13, color: '#aaa' },
  testBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#E65100', padding: 14, borderRadius: 12,
  },
  testBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  testHint: { fontSize: 12, color: '#bbb', textAlign: 'center', marginTop: 8 },
  aboutText: { fontSize: 14, color: '#666', lineHeight: 22 },
  link: { color: '#E65100', fontWeight: '600' },
  // iOS modal
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0e8e0',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  modalDone: { fontSize: 16, color: '#E65100', fontWeight: '700' },
});
