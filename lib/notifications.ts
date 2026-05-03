import * as Notifications from 'expo-notifications';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from './db/schema';
import { getSetting, setSetting } from './db/queries';

type DB = BaseSQLiteDatabase<'sync', any, typeof schema>;

const DEFAULT_TIME = '09:00';

export function parseTime(timeString: string): { hour: number; minute: number } {
  const match = /^([0-9]{1,2}):([0-9]{2})$/.exec(timeString);
  if (!match) return { hour: 9, minute: 0 };
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return { hour: 9, minute: 0 };
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return { hour: 9, minute: 0 };
  return { hour, minute };
}

export function getNotificationSettings(db: DB): { enabled: boolean; time: string } {
  const enabledRaw = getSetting(db, 'notification_enabled');
  const timeRaw = getSetting(db, 'notification_time');
  return {
    enabled: enabledRaw === 'true',
    time: timeRaw ?? DEFAULT_TIME,
  };
}

function getDueTodayCount(): number {
  const today = new Date().toLocaleDateString('sv');
  // Dynamically import queueStore to avoid circular dependency at module load time.
  // queueStore imports db/queries which imports this module.
  const { default: useQueueStore } = require('../store/queueStore');
  const queue = useQueueStore.getState().queue;
  return queue.filter((i: { state: number; due: string }) => i.state !== 0 && i.due.slice(0, 10) <= today).length;
}

export async function scheduleDailyReminder(db: DB, timeOverride?: { hour: number; minute: number }): Promise<void> {
  const time = timeOverride ?? parseTime(getNotificationSettings(db).time);
  const count = getDueTodayCount();
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'DamaFlow',
      body: `Time to practice. ${count} skills due today.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: time.hour,
      minute: time.minute,
    },
  });
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function requestAndConfigureNotifications(db: DB): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status === 'granted') {
    setSetting(db, 'notification_enabled', 'true');
    // Only set default time if no custom time exists yet (preserves user choice)
    if (getSetting(db, 'notification_time') === undefined) {
      setSetting(db, 'notification_time', DEFAULT_TIME);
    }
    await scheduleDailyReminder(db);
  }
}
