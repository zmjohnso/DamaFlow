import React from 'react';
import { render, act } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import TodayScreen from './index';

const mockGetSetting = jest.fn();
const mockSetSetting = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockScheduleNotificationAsync = jest.fn();
const mockCancelAllScheduledNotificationsAsync = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
}));

jest.mock('@/lib/db/client', () => ({ db: {} }));

jest.mock('@/lib/db/queries', () => ({
  getMasteredCount: jest.fn(() => 0),
  getSessionsThisWeek: jest.fn(() => 0),
  getSetting: (...args: any[]) => mockGetSetting(...args),
  setSetting: (...args: any[]) => mockSetSetting(...args),
}));

jest.mock('@/lib/notifications', () => ({
  requestAndConfigureNotifications: jest.fn(() => {
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    return Promise.resolve();
  }),
}));

jest.mock('@/components/EmptyQueueState', () => {
  const { View } = require('react-native');
  return function MockEmptyQueueState() {
    return <View testID="empty-queue-state" />;
  };
});

jest.mock('@/components/SkillQueueItem', () => {
  const { View, TouchableOpacity } = require('react-native');
  return function MockSkillQueueItem({ skillName, onPress }: { skillName: string; onPress?: () => void }) {
    return (
      <TouchableOpacity onPress={onPress} testID={`skill-item-${skillName}`}>
        <View />
      </TouchableOpacity>
    );
  };
});

const mockLoadQueue = jest.fn();
jest.mock('@/store/queueStore', () => ({
  __esModule: true,
  default: jest.fn((selector: any) => selector({ queue: [], loadQueue: mockLoadQueue })),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <PaperProvider>{children}</PaperProvider>;
}

describe('TodayScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSetting.mockReset();
    mockSetSetting.mockReset();
  });

  it('triggers notification permission request when pending flag is true', async () => {
    mockGetSetting.mockImplementation((_: any, key: string) => {
      if (key === 'pending_notification_prompt') return 'true';
      return undefined;
    });
    const { requestAndConfigureNotifications } = require('@/lib/notifications');
    render(<TodayScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(mockSetSetting).toHaveBeenCalledWith({}, 'pending_notification_prompt', 'false');
    expect(requestAndConfigureNotifications).toHaveBeenCalled();
  });

  it('does not trigger permission request when pending flag is absent', async () => {
    mockGetSetting.mockReturnValue(undefined);
    const { requestAndConfigureNotifications } = require('@/lib/notifications');
    render(<TodayScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(mockSetSetting).not.toHaveBeenCalledWith(expect.anything(), 'pending_notification_prompt', 'false');
    expect(requestAndConfigureNotifications).not.toHaveBeenCalled();
  });

  it('does not trigger permission request when pending flag is false', async () => {
    mockGetSetting.mockImplementation((_: any, key: string) => {
      if (key === 'pending_notification_prompt') return 'false';
      return undefined;
    });
    const { requestAndConfigureNotifications } = require('@/lib/notifications');
    render(<TodayScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(requestAndConfigureNotifications).not.toHaveBeenCalled();
  });
});
