import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getLocale } from './i18n/i18n';

const REMINDER_ENABLED_KEY = 'terrana_backup_reminder_enabled';
const REMINDER_NOTIF_ID_KEY = 'terrana_backup_reminder_notif_id';

const REMINDER_BODY: Record<string, string> = {
  de: '🌿 Zeit für dein Terrana Backup!',
  en: '🌿 Time for your Terrana backup!',
  fr: "🌿 C'est l'heure de votre sauvegarde Terrana !",
  es: '🌿 ¡Es hora de tu copia de seguridad de Terrana!',
};

export async function isBackupReminderEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(REMINDER_ENABLED_KEY);
  return val === 'true';
}

async function setReminderEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(REMINDER_ENABLED_KEY, enabled ? 'true' : 'false');
}

async function cancelExistingReminder(): Promise<void> {
  const id = await AsyncStorage.getItem(REMINDER_NOTIF_ID_KEY);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
    await AsyncStorage.removeItem(REMINDER_NOTIF_ID_KEY);
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('backup-reminder', {
      name: 'Backup Reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#7A9E7E',
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedules a weekly backup reminder every Sunday at 10:00.
 * Requests permissions first. Returns false if permission was denied.
 */
export async function enableBackupReminder(): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await cancelExistingReminder();

  const locale = getLocale();
  const body = REMINDER_BODY[locale] ?? REMINDER_BODY['en']!;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Terrana',
      body,
      data: { navigate: 'backup' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // 1 = Sunday
      hour: 10,
      minute: 0,
    },
  });

  await AsyncStorage.setItem(REMINDER_NOTIF_ID_KEY, id);
  await setReminderEnabled(true);
  return true;
}

/** Cancels the weekly backup reminder and clears its state. */
export async function disableBackupReminder(): Promise<void> {
  await cancelExistingReminder();
  await setReminderEnabled(false);
}
