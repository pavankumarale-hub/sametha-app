import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { shuffleArray } from './saamethas';

const TIME_KEY = 'notification_time_v1';
const DAYS_TO_SCHEDULE = 30;
const RESCHEDULE_THRESHOLD = 7; // Reschedule when fewer than this many remain

export const DEFAULT_HOUR = 8;
export const DEFAULT_MINUTE = 0;

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices.');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-sametha', {
      name: 'Daily Sametha',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getNotificationTime(): Promise<{ hour: number; minute: number }> {
  const saved = await AsyncStorage.getItem(TIME_KEY);
  if (saved) return JSON.parse(saved);
  return { hour: DEFAULT_HOUR, minute: DEFAULT_MINUTE };
}

export async function saveNotificationTime(hour: number, minute: number): Promise<void> {
  await AsyncStorage.setItem(TIME_KEY, JSON.stringify({ hour, minute }));
}

export async function scheduleNotifications(
  saamethas: string[],
  hour: number,
  minute: number
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const shuffled = shuffleArray(saamethas);
  const now = new Date();

  for (let i = 0; i < DAYS_TO_SCHEDULE && i < shuffled.length; i++) {
    const trigger = new Date(now);
    trigger.setDate(now.getDate() + i + 1); // Start from tomorrow
    trigger.setHours(hour, minute, 0, 0);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Sametha of the Day',
        body: shuffled[i],
        data: { sametha: shuffled[i] },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    });
  }
}

/** Call on app open — reschedules if running low. */
export async function ensureNotificationsScheduled(saamethas: string[]): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  if (pending.length < RESCHEDULE_THRESHOLD) {
    const { hour, minute } = await getNotificationTime();
    await scheduleNotifications(saamethas, hour, minute);
  }
}

export async function sendTestNotification(sametha: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Sametha of the Day',
      body: sametha,
      data: { sametha },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
    },
  });
}
