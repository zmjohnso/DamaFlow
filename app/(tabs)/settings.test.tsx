import React from 'react';
import { NativeModules } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import SettingsScreen from './settings';
import useAppStore from '../../store/appStore';

const mockGetSetting = jest.fn();
const mockSetSetting = jest.fn();
const mockResetAllData = jest.fn();
const mockReplace = jest.fn();
const mockLoadQueue = jest.fn();

jest.mock('../../lib/db/client', () => ({ db: {} }));
jest.mock('../../lib/db/queries', () => ({
  getSetting: (...args: any[]) => mockGetSetting(...args),
  setSetting: (...args: any[]) => mockSetSetting(...args),
  resetAllData: (...args: any[]) => mockResetAllData(...args),
  getNewSkillCap: (db: any) => {
    const raw = mockGetSetting(db, 'new_skill_cap');
    if (raw === undefined) return 5;
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return 5;
    return Math.max(1, Math.min(20, parsed));
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('../../store/queueStore', () => ({
  __esModule: true,
  default: {
    getState: () => ({ loadQueue: mockLoadQueue }),
  },
}));

const mockRequestPermissionsAsync = jest.fn();
const mockScheduleNotificationAsync = jest.fn();
const mockCancelAllScheduledNotificationsAsync = jest.fn();

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: (...args: any[]) => mockRequestPermissionsAsync(...args),
  scheduleNotificationAsync: (...args: any[]) => mockScheduleNotificationAsync(...args),
  cancelAllScheduledNotificationsAsync: (...args: any[]) => mockCancelAllScheduledNotificationsAsync(...args),
}));

const mockRequestAndConfigureNotifications = jest.fn();
const mockScheduleDailyReminder = jest.fn();
const mockCancelAllReminders = jest.fn();

jest.mock('../../lib/notifications', () => ({
  getNotificationSettings: (db: any) => {
    const enabled = mockGetSetting(db, 'notification_enabled');
    const time = mockGetSetting(db, 'notification_time');
    return { enabled: enabled === 'true', time: time ?? '09:00' };
  },
  requestAndConfigureNotifications: (...args: any[]) => mockRequestAndConfigureNotifications(...args),
  scheduleDailyReminder: (...args: any[]) => mockScheduleDailyReminder(...args),
  cancelAllReminders: (...args: any[]) => mockCancelAllReminders(...args),
}));

jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  return function MockDateTimePicker({ onChange }: { onChange?: (event: unknown, date?: Date) => void }) {
    return (
      <View testID="datetime-picker">
        {onChange && (
          <View testID="datetime-picker-trigger" onTouchEnd={() => onChange({}, new Date(2026, 3, 24, 14, 30))} />
        )}
      </View>
    );
  };
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return <PaperProvider theme={{ animation: { scale: 0 } }}>{children}</PaperProvider>;
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    useAppStore.getState().setThemePreference('system');
    mockGetSetting.mockReset();
    mockSetSetting.mockReset();
    mockRequestPermissionsAsync.mockReset();
    mockScheduleNotificationAsync.mockReset();
    mockCancelAllScheduledNotificationsAsync.mockReset();
    mockRequestAndConfigureNotifications.mockReset();
    mockScheduleDailyReminder.mockReset();
    mockCancelAllReminders.mockReset();
    mockResetAllData.mockReset();
    mockReplace.mockReset();
    mockLoadQueue.mockReset();

    jest.spyOn(NativeModules.NativeAnimatedModule, 'startAnimatingNode')
      .mockImplementation((_animationId, _nodeTag, _config, endCallback) => {
        endCallback({ finished: true });
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Existing new_skill_cap tests ──

  it('renders with default value 5 when setting is absent', async () => {
    mockGetSetting.mockReturnValue(undefined);
    const { getByLabelText, getByText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByText('New skills per session')).toBeTruthy();
    expect(getByLabelText('New skill cap, 5')).toBeTruthy();
  });

  it('renders with stored value when setting exists', async () => {
    mockGetSetting.mockReturnValue('8');
    const { getByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByLabelText('New skill cap, 8')).toBeTruthy();
  });

  it('increments value and calls setSetting on + tap', async () => {
    mockGetSetting.mockReturnValue(undefined);
    const { getByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    fireEvent.press(getByLabelText('Increase new skills per session'));
    await act(async () => {});
    expect(mockSetSetting).toHaveBeenCalledWith({}, 'new_skill_cap', '6');
    expect(getByLabelText('New skill cap, 6')).toBeTruthy();
  });

  it('decrements value and calls setSetting on - tap', async () => {
    mockGetSetting.mockReturnValue(undefined);
    const { getByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    fireEvent.press(getByLabelText('Decrease new skills per session'));
    await act(async () => {});
    expect(mockSetSetting).toHaveBeenCalledWith({}, 'new_skill_cap', '4');
    expect(getByLabelText('New skill cap, 4')).toBeTruthy();
  });

  it('does not decrement below 1', async () => {
    mockGetSetting.mockReturnValue('1');
    const { getByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    fireEvent.press(getByLabelText('Decrease new skills per session'));
    await act(async () => {});
    expect(mockSetSetting).not.toHaveBeenCalled();
    expect(getByLabelText('New skill cap, 1')).toBeTruthy();
  });

  it('does not increment above 20', async () => {
    mockGetSetting.mockReturnValue('20');
    const { getByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    fireEvent.press(getByLabelText('Increase new skills per session'));
    await act(async () => {});
    expect(mockSetSetting).not.toHaveBeenCalled();
    expect(getByLabelText('New skill cap, 20')).toBeTruthy();
  });

  it('defaults to 5 when getSetting throws on mount', async () => {
    mockGetSetting.mockImplementation(() => {
      throw new Error('db read error');
    });
    const { getByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByLabelText('New skill cap, 5')).toBeTruthy();
  });

  it('clamps out-of-bounds cap on load', async () => {
    mockGetSetting.mockReturnValue('25');
    const { getByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByLabelText('New skill cap, 20')).toBeTruthy();
  });

  it('defaults to 5 for non-numeric setting', async () => {
    mockGetSetting.mockReturnValue('abc');
    const { getByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByLabelText('New skill cap, 5')).toBeTruthy();
  });

  it('shows Snackbar when setSetting throws', async () => {
    mockGetSetting.mockReturnValue(undefined);
    mockSetSetting.mockImplementation(() => {
      throw new Error('db write error');
    });
    const { getByLabelText, getByText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    fireEvent.press(getByLabelText('Increase new skills per session'));
    await act(async () => {});
    expect(getByText('Could not save setting')).toBeTruthy();
  });

  it('minus button is disabled at value 1', async () => {
    mockGetSetting.mockReturnValue('1');
    const { getByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    const minusButton = getByLabelText('Decrease new skills per session');
    expect(minusButton.props.accessibilityState.disabled).toBe(true);
  });

  it('plus button is disabled at value 20', async () => {
    mockGetSetting.mockReturnValue('20');
    const { getByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    const plusButton = getByLabelText('Increase new skills per session');
    expect(plusButton.props.accessibilityState.disabled).toBe(true);
  });

  // ── Notification tests (Story 7.2) ──

  it('shows notification toggle OFF and hides time picker when notifications disabled', async () => {
    mockGetSetting.mockImplementation((_: any, key: string) => {
      if (key === 'notification_enabled') return undefined;
      return undefined;
    });
    const { getByLabelText, queryByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByLabelText('Daily practice reminder, off')).toBeTruthy();
    expect(queryByLabelText(/Notification time/)).toBeNull();
  });

  it('shows notification toggle ON and time picker when notifications enabled', async () => {
    mockGetSetting.mockImplementation((_: any, key: string) => {
      if (key === 'notification_enabled') return 'true';
      if (key === 'notification_time') return '14:30';
      return undefined;
    });
    const { getByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByLabelText('Daily practice reminder, on')).toBeTruthy();
    expect(getByLabelText('Notification time, 14:30')).toBeTruthy();
  });

  it('toggle ON requests permission and schedules when not previously enabled', async () => {
    mockGetSetting.mockImplementation((_: any, key: string) => {
      if (key === 'notification_enabled') return undefined;
      return undefined;
    });
    mockRequestAndConfigureNotifications.mockResolvedValue(undefined);
    const { getByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});

    const toggle = getByLabelText('Daily practice reminder, off');
    await act(async () => {
      fireEvent(toggle, 'onValueChange', true);
    });
    expect(mockRequestAndConfigureNotifications).toHaveBeenCalled();
  });

  it('toggle OFF writes false and cancels reminders', async () => {
    mockGetSetting.mockImplementation((_: any, key: string) => {
      if (key === 'notification_enabled') return 'true';
      if (key === 'notification_time') return '09:00';
      return undefined;
    });
    const { getByLabelText, queryByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});

    const toggle = getByLabelText('Daily practice reminder, on');
    await act(async () => {
      fireEvent(toggle, 'onValueChange', false);
    });
    expect(mockSetSetting).toHaveBeenCalledWith({}, 'notification_enabled', 'false');
    expect(mockCancelAllReminders).toHaveBeenCalled();
    expect(queryByLabelText(/Notification time/)).toBeNull();
  });

  it('tapping time row opens datetime picker', async () => {
    mockGetSetting.mockImplementation((_: any, key: string) => {
      if (key === 'notification_enabled') return 'true';
      if (key === 'notification_time') return '09:00';
      return undefined;
    });
    const { getByLabelText, getByTestId } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});

    await act(async () => {
      fireEvent.press(getByLabelText('Notification time, 09:00'));
    });
    expect(getByTestId('datetime-picker')).toBeTruthy();
  });

  it('selecting new time saves and reschedules reminder', async () => {
    mockGetSetting.mockImplementation((_: any, key: string) => {
      if (key === 'notification_enabled') return 'true';
      if (key === 'notification_time') return '09:00';
      return undefined;
    });
    const { getByLabelText, getByTestId } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});

    await act(async () => {
      fireEvent.press(getByLabelText('Notification time, 09:00'));
    });

    const pickerTrigger = getByTestId('datetime-picker-trigger');
    await act(async () => {
      fireEvent(pickerTrigger, 'onTouchEnd');
    });

    expect(mockSetSetting).toHaveBeenCalledWith({}, 'notification_time', '14:30');
    expect(mockScheduleDailyReminder).toHaveBeenCalled();
  });

  // ── Reset app data tests (Story 7.3) ──

  it('renders Reset App Data button at bottom', async () => {
    mockGetSetting.mockReturnValue(undefined);
    const { getByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByLabelText('Reset app data')).toBeTruthy();
  });

  it('opens reset confirmation Dialog on Reset App Data tap', async () => {
    mockGetSetting.mockReturnValue(undefined);
    const { getByLabelText, getByText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});

    await act(async () => {
      fireEvent.press(getByLabelText('Reset app data'));
    });

    expect(getByText('Reset App Data?')).toBeTruthy();
    expect(getByText('This will delete all your skill progress, session history, and equipment records. This cannot be undone.')).toBeTruthy();
  });

  it('dismisses Dialog and does not call reset on Cancel tap', async () => {
    mockGetSetting.mockReturnValue(undefined);
    const { getByLabelText, getByText, queryByText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});

    await act(async () => {
      fireEvent.press(getByLabelText('Reset app data'));
    });

    const cancelButton = getByText('Cancel');
    await act(async () => {
      fireEvent.press(cancelButton);
    });

    await waitFor(() => {
      expect(queryByText('Reset App Data?')).toBeNull();
    });
    expect(mockResetAllData).not.toHaveBeenCalled();
    expect(mockCancelAllReminders).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('calls resetAllData, cancelAllReminders, loadQueue, and navigates on Reset tap', async () => {
    mockGetSetting.mockReturnValue(undefined);
    const { getByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});

    await act(async () => {
      fireEvent.press(getByLabelText('Reset app data'));
    });

    const confirmButton = getByLabelText('Confirm reset, this cannot be undone');
    await act(async () => {
      fireEvent.press(confirmButton);
    });

    expect(mockResetAllData).toHaveBeenCalledWith({});
    expect(mockCancelAllReminders).toHaveBeenCalled();
    expect(mockLoadQueue).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/onboarding');
  });

  it('shows Snackbar and does not navigate when resetAllData throws', async () => {
    mockGetSetting.mockReturnValue(undefined);
    mockResetAllData.mockImplementation(() => {
      throw new Error('db reset error');
    });
    const { getByLabelText, getByText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});

    await act(async () => {
      fireEvent.press(getByLabelText('Reset app data'));
    });

    const confirmButton = getByLabelText('Confirm reset, this cannot be undone');
    await act(async () => {
      fireEvent.press(confirmButton);
    });

    expect(getByText('Could not reset app data')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  // ── Appearance tests (Story 7.4) ──

  it('renders Appearance section with System segment selected by default', async () => {
    mockGetSetting.mockReturnValue(undefined);
    const { getByText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByText('Appearance')).toBeTruthy();
    expect(getByText('System')).toBeTruthy();
    expect(getByText('Light')).toBeTruthy();
    expect(getByText('Dark')).toBeTruthy();
    expect(useAppStore.getState().themePreference).toBe('system');
  });

  it('tapping Dark calls setSetting and updates store to dark', async () => {
    mockGetSetting.mockReturnValue(undefined);
    const { getByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});

    await act(async () => {
      fireEvent.press(getByLabelText('Dark theme'));
    });

    expect(mockSetSetting).toHaveBeenCalledWith({}, 'theme_preference', 'dark');
    expect(useAppStore.getState().themePreference).toBe('dark');
  });

  it('tapping Light calls setSetting and updates store to light', async () => {
    mockGetSetting.mockReturnValue(undefined);
    const { getByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});

    await act(async () => {
      fireEvent.press(getByLabelText('Light theme'));
    });

    expect(mockSetSetting).toHaveBeenCalledWith({}, 'theme_preference', 'light');
    expect(useAppStore.getState().themePreference).toBe('light');
  });

  it('tapping System after override reverts store to system', async () => {
    useAppStore.getState().setThemePreference('dark');
    mockGetSetting.mockReturnValue(undefined);
    const { getByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});

    await act(async () => {
      fireEvent.press(getByLabelText('System theme'));
    });

    expect(mockSetSetting).toHaveBeenCalledWith({}, 'theme_preference', 'system');
    expect(useAppStore.getState().themePreference).toBe('system');
  });

  it('shows Snackbar when setSetting throws on theme change and store is not mutated', async () => {
    mockGetSetting.mockReturnValue(undefined);
    mockSetSetting.mockImplementation((_db: any, key: string) => {
      if (key === 'theme_preference') throw new Error('db write error');
    });
    const { getByLabelText, getByText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});

    await act(async () => {
      fireEvent.press(getByLabelText('Dark theme'));
    });

    expect(getByText('Could not save appearance setting')).toBeTruthy();
    expect(useAppStore.getState().themePreference).toBe('system');
  });

  it('renders with pre-existing light themePreference showing Light segment active', async () => {
    useAppStore.getState().setThemePreference('light');
    mockGetSetting.mockReturnValue(undefined);
    const { getByLabelText } = render(<SettingsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(useAppStore.getState().themePreference).toBe('light');
    await act(async () => {
      fireEvent.press(getByLabelText('System theme'));
    });
    expect(mockSetSetting).toHaveBeenCalledWith({}, 'theme_preference', 'system');
    expect(useAppStore.getState().themePreference).toBe('system');
  });
});
