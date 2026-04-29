/**
 * @jest-environment node
 */

import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from './db/schema';

const mockRequestPermissionsAsync = jest.fn();
const mockScheduleNotificationAsync = jest.fn();
const mockCancelAllScheduledNotificationsAsync = jest.fn();
const mockGetAllScheduledNotificationsAsync = jest.fn();

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: (...args: any[]) => mockRequestPermissionsAsync(...args),
  scheduleNotificationAsync: (...args: any[]) => mockScheduleNotificationAsync(...args),
  cancelAllScheduledNotificationsAsync: (...args: any[]) => mockCancelAllScheduledNotificationsAsync(...args),
  getAllScheduledNotificationsAsync: (...args: any[]) => mockGetAllScheduledNotificationsAsync(...args),
}));

const mockGetSetting = jest.fn();
const mockSetSetting = jest.fn();
const mockGetState = jest.fn(() => ({ queue: [] }));

jest.mock('./db/queries', () => ({
  getSetting: (...args: any[]) => mockGetSetting(...args),
  setSetting: (...args: any[]) => mockSetSetting(...args),
}));

jest.mock('../store/queueStore', () => ({
  __esModule: true,
  default: {
    getState: () => mockGetState(),
  },
}));

import {
  parseTime,
  getNotificationSettings,
  scheduleDailyReminder,
  cancelAllReminders,
  requestAndConfigureNotifications,
} from './notifications';

type DB = BaseSQLiteDatabase<'sync', any, typeof schema>;
const db = {} as DB;

describe('parseTime', () => {
  it('parses valid time "14:30"', () => {
    expect(parseTime('14:30')).toEqual({ hour: 14, minute: 30 });
  });

  it('returns default for invalid string', () => {
    expect(parseTime('invalid')).toEqual({ hour: 9, minute: 0 });
  });

  it('returns default for out-of-range hour', () => {
    expect(parseTime('25:00')).toEqual({ hour: 9, minute: 0 });
  });

  it('returns default for out-of-range minute', () => {
    expect(parseTime('12:60')).toEqual({ hour: 9, minute: 0 });
  });

  it('parses single-digit hour', () => {
    expect(parseTime('9:05')).toEqual({ hour: 9, minute: 5 });
  });
});

describe('getNotificationSettings', () => {
  beforeEach(() => {
    mockGetSetting.mockReset();
  });

  it('returns defaults when keys are missing', () => {
    mockGetSetting.mockReturnValue(undefined);
    expect(getNotificationSettings(db)).toEqual({ enabled: false, time: '09:00' });
  });

  it('returns parsed values when keys exist', () => {
    mockGetSetting.mockImplementation((_: DB, key: string) => {
      if (key === 'notification_enabled') return 'true';
      if (key === 'notification_time') return '14:30';
      return undefined;
    });
    expect(getNotificationSettings(db)).toEqual({ enabled: true, time: '14:30' });
  });
});

describe('scheduleDailyReminder', () => {
  beforeEach(() => {
    mockCancelAllScheduledNotificationsAsync.mockReset();
    mockScheduleNotificationAsync.mockReset();
    mockGetState.mockReturnValue({ queue: [] });
  });

  it('cancels existing and schedules new daily reminder', async () => {
    mockGetSetting.mockImplementation((_: DB, key: string) => {
      if (key === 'notification_time') return '08:30';
      return undefined;
    });
    await scheduleDailyReminder(db);
    expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: 'DamaFlow',
          body: 'Time to practice. 0 skills due today.',
        }),
        trigger: expect.objectContaining({ hour: 8, minute: 30, repeats: true }),
      }),
    );
  });

  it('uses provided hour and minute over stored setting', async () => {
    await scheduleDailyReminder(db, { hour: 21, minute: 45 });
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({ hour: 21, minute: 45, repeats: true }),
      }),
    );
  });

  it('computes due count from queue store', async () => {
    const today = new Date().toLocaleDateString('sv');
    mockGetState.mockReturnValue({
      queue: [
        { state: 1, due: today + 'T08:00:00' },
        { state: 2, due: today + 'T12:00:00' },
        { state: 0, due: today + 'T10:00:00' },
      ],
    });
    await scheduleDailyReminder(db, { hour: 9, minute: 0 });
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          body: 'Time to practice. 2 skills due today.',
        }),
      }),
    );
  });
});

describe('cancelAllReminders', () => {
  beforeEach(() => {
    mockCancelAllScheduledNotificationsAsync.mockReset();
  });

  it('calls cancelAllScheduledNotificationsAsync', async () => {
    await cancelAllReminders();
    expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });
});

describe('requestAndConfigureNotifications', () => {
  beforeEach(() => {
    mockRequestPermissionsAsync.mockReset();
    mockSetSetting.mockReset();
    mockScheduleNotificationAsync.mockReset();
    mockCancelAllScheduledNotificationsAsync.mockReset();
  });

  it('writes settings and schedules reminder on granted', async () => {
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetSetting.mockImplementation((_: DB, key: string) => {
      if (key === 'notification_time') return undefined;
      return undefined;
    });
    await requestAndConfigureNotifications(db);
    expect(mockSetSetting).toHaveBeenCalledWith(db, 'notification_enabled', 'true');
    expect(mockSetSetting).toHaveBeenCalledWith(db, 'notification_time', '09:00');
    expect(mockScheduleNotificationAsync).toHaveBeenCalled();
  });

  it('preserves existing custom time on re-grant', async () => {
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetSetting.mockImplementation((_: DB, key: string) => {
      if (key === 'notification_time') return '14:30';
      return undefined;
    });
    await requestAndConfigureNotifications(db);
    expect(mockSetSetting).toHaveBeenCalledWith(db, 'notification_enabled', 'true');
    expect(mockSetSetting).not.toHaveBeenCalledWith(db, 'notification_time', '09:00');
    expect(mockScheduleNotificationAsync).toHaveBeenCalled();
  });

  it('does nothing when permission is denied', async () => {
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    await requestAndConfigureNotifications(db);
    expect(mockSetSetting).not.toHaveBeenCalled();
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
