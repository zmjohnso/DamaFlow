import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import TodayScreen from './index';

const mockGetSetting = jest.fn();
const mockSetSetting = jest.fn();
const mockGetMasteredCount = jest.fn();
const mockGetSessionsThisWeek = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockScheduleNotificationAsync = jest.fn();
const mockCancelAllScheduledNotificationsAsync = jest.fn();
const mockRouterPush = jest.fn();
const mockRouterNavigate = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: any[]) => mockRouterPush(...args),
    navigate: (...args: any[]) => mockRouterNavigate(...args),
  },
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('@/lib/db/client', () => ({ db: {} }));

jest.mock('@/lib/db/queries', () => ({
  getMasteredCount: (...args: any[]) => mockGetMasteredCount(...args),
  getSessionsThisWeek: (...args: any[]) => mockGetSessionsThisWeek(...args),
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
  const { View, Text } = require('react-native');
  return function MockEmptyQueueState({ isFirstCompletion }: { isFirstCompletion: boolean }) {
    return (
      <View testID="empty-queue-state">
        <Text>{isFirstCompletion ? 'first-completion' : 'standard'}</Text>
      </View>
    );
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

let mockQueue: { skill_id: number; skill_name: string; tier: string; due: string; state: number }[] = [];
const mockLoadQueue = jest.fn();
jest.mock('@/store/queueStore', () => ({
  __esModule: true,
  default: jest.fn((selector: any) => selector({ queue: mockQueue, loadQueue: mockLoadQueue })),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <PaperProvider>{children}</PaperProvider>;
}

const TODAY = '2026-06-27';

describe('TodayScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSetting.mockReset();
    mockSetSetting.mockReset();
    mockGetMasteredCount.mockReset().mockReturnValue(0);
    mockGetSessionsThisWeek.mockReset().mockReturnValue(0);
    mockGetSetting.mockReturnValue(undefined);
    mockQueue = [];
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

  it('re-checks the pending flag on every focus, not just at mount', async () => {
    let pending = 'false';
    mockGetSetting.mockImplementation((_: any, key: string) => {
      if (key === 'pending_notification_prompt') return pending;
      return undefined;
    });
    const { requestAndConfigureNotifications } = require('@/lib/notifications');
    const { rerender } = render(<TodayScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(requestAndConfigureNotifications).not.toHaveBeenCalled();

    // Simulate: user logs a session (sets the flag), then the Today tab regains focus
    // without ever unmounting — this is the scenario the mount-only effect used to miss.
    pending = 'true';
    rerender(<TodayScreen />);
    await act(async () => {});

    expect(requestAndConfigureNotifications).toHaveBeenCalled();
  });

  describe('stat chips', () => {
    it('renders mastered count and sessions-this-week from the DB', async () => {
      mockGetMasteredCount.mockReturnValue(7);
      mockGetSessionsThisWeek.mockReturnValue(3);
      const { getByText } = render(<TodayScreen />, { wrapper: Wrapper });
      await act(async () => {});
      expect(getByText('7')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
    });

    it('keeps stat chips at 0 when getMasteredCount throws', async () => {
      mockGetMasteredCount.mockImplementation(() => {
        throw new Error('db unavailable');
      });
      const { getAllByText } = render(<TodayScreen />, { wrapper: Wrapper });
      await act(async () => {});
      expect(getAllByText('0').length).toBeGreaterThan(0);
    });

    it('keeps stat chips at 0 when getSessionsThisWeek throws', async () => {
      mockGetSessionsThisWeek.mockImplementation(() => {
        throw new Error('db unavailable');
      });
      const { getAllByText } = render(<TodayScreen />, { wrapper: Wrapper });
      await act(async () => {});
      expect(getAllByText('0').length).toBeGreaterThan(0);
    });

    it('tapping the mastered chip navigates to the progress screen', async () => {
      const { getByLabelText } = render(<TodayScreen />, { wrapper: Wrapper });
      await act(async () => {});
      fireEvent.press(getByLabelText(/View progress/));
      expect(mockRouterPush).toHaveBeenCalledWith('/(tabs)/practice/progress');
    });
  });

  describe('first-completion empty state', () => {
    it('marks first_completion_shown and shows the first-completion variant when unset', async () => {
      mockGetSetting.mockReturnValue(undefined);
      const { getByText } = render(<TodayScreen />, { wrapper: Wrapper });
      await act(async () => {});
      expect(mockSetSetting).toHaveBeenCalledWith({}, 'first_completion_shown', 'true');
      expect(getByText('first-completion')).toBeTruthy();
    });

    it('shows the standard empty-state variant when first_completion_shown is already set', async () => {
      mockGetSetting.mockImplementation((_: any, key: string) => {
        if (key === 'first_completion_shown') return 'true';
        return undefined;
      });
      const { getByText } = render(<TodayScreen />, { wrapper: Wrapper });
      await act(async () => {});
      expect(mockSetSetting).not.toHaveBeenCalledWith(expect.anything(), 'first_completion_shown', 'true');
      expect(getByText('standard')).toBeTruthy();
    });

    it('does not crash and shows the standard empty state when getSetting throws', async () => {
      mockGetSetting.mockImplementation(() => {
        throw new Error('db unavailable');
      });
      const { getByText, getByTestId } = render(<TodayScreen />, { wrapper: Wrapper });
      await act(async () => {});
      expect(getByTestId('empty-queue-state')).toBeTruthy();
      expect(getByText('standard')).toBeTruthy();
    });

    it('does not leak the first-completion variant into a later, unrelated empty queue', async () => {
      let firstCompletionShown: string | undefined;
      mockGetSetting.mockImplementation((_: any, key: string) => {
        if (key === 'first_completion_shown') return firstCompletionShown;
        return undefined;
      });
      mockSetSetting.mockImplementation((_: any, key: string, value: string) => {
        if (key === 'first_completion_shown') firstCompletionShown = value;
      });

      const { getByText, rerender } = render(<TodayScreen />, { wrapper: Wrapper });
      await act(async () => {});
      expect(getByText('first-completion')).toBeTruthy();

      // Queue fills up (e.g. a new skill becomes due), then empties again later —
      // this second empty state is unrelated to the first-ever completion and
      // must not inherit the stale isFirstCompletion=true from the first pass.
      mockQueue = [
        { skill_id: 1, skill_name: 'Some Skill', tier: 'beginner', due: '2026-06-27T00:00:00.000Z', state: 0 },
      ];
      rerender(<TodayScreen />);
      await act(async () => {});

      mockQueue = [];
      rerender(<TodayScreen />);
      await act(async () => {});

      expect(getByText('standard')).toBeTruthy();
    });
  });

  describe('with a populated queue', () => {
    let toLocaleSpy: jest.SpyInstance;

    beforeEach(() => {
      toLocaleSpy = jest.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue(TODAY);
    });

    afterEach(() => {
      toLocaleSpy.mockRestore();
    });

    it('renders Overdue, Due Today, and New Skills sections with their items', async () => {
      mockQueue = [
        { skill_id: 1, skill_name: 'Overdue Skill', tier: 'beginner', due: '2026-06-26T14:00:00.000Z', state: 2 },
        { skill_id: 2, skill_name: 'Due Today Skill', tier: 'intermediate', due: '2026-06-27T08:00:00.000Z', state: 1 },
        { skill_id: 3, skill_name: 'New Skill', tier: 'advanced', due: '2026-06-27T00:00:00.000Z', state: 0 },
      ];
      const { getByText, getByTestId, queryByTestId } = render(<TodayScreen />, { wrapper: Wrapper });
      await act(async () => {});

      expect(getByText('Overdue')).toBeTruthy();
      expect(getByText('Due Today')).toBeTruthy();
      expect(getByText('New Skills')).toBeTruthy();
      expect(getByTestId('skill-item-Overdue Skill')).toBeTruthy();
      expect(getByTestId('skill-item-Due Today Skill')).toBeTruthy();
      expect(getByTestId('skill-item-New Skill')).toBeTruthy();
      expect(queryByTestId('empty-queue-state')).toBeNull();
    });

    it('omits a section header when that section has no items', async () => {
      mockQueue = [
        { skill_id: 3, skill_name: 'New Skill', tier: 'advanced', due: '2026-06-27T00:00:00.000Z', state: 0 },
      ];
      const { getByText, queryByText } = render(<TodayScreen />, { wrapper: Wrapper });
      await act(async () => {});

      expect(queryByText('Overdue')).toBeNull();
      expect(queryByText('Due Today')).toBeNull();
      expect(getByText('New Skills')).toBeTruthy();
    });

    it('counts the due-today stat chip as overdue + due-today items, excluding new skills', async () => {
      mockQueue = [
        { skill_id: 1, skill_name: 'Overdue Skill', tier: 'beginner', due: '2026-06-26T14:00:00.000Z', state: 2 },
        { skill_id: 2, skill_name: 'Due Today Skill', tier: 'intermediate', due: '2026-06-27T08:00:00.000Z', state: 1 },
        { skill_id: 3, skill_name: 'New Skill', tier: 'advanced', due: '2026-06-27T00:00:00.000Z', state: 0 },
      ];
      const { getByText } = render(<TodayScreen />, { wrapper: Wrapper });
      await act(async () => {});
      expect(getByText('2')).toBeTruthy();
    });

    it('categorizes a skill due late in the UTC day today as Due Today, not Overdue', async () => {
      mockQueue = [
        { skill_id: 4, skill_name: 'Late UTC Skill', tier: 'beginner', due: '2026-06-27T23:59:00.000Z', state: 2 },
      ];
      const { getByText, queryByText, getByTestId } = render(<TodayScreen />, { wrapper: Wrapper });
      await act(async () => {});

      expect(getByText('Due Today')).toBeTruthy();
      expect(queryByText('Overdue')).toBeNull();
      expect(getByTestId('skill-item-Late UTC Skill')).toBeTruthy();
    });

    it('categorizes a skill due late in the UTC day yesterday as Overdue', async () => {
      mockQueue = [
        { skill_id: 5, skill_name: 'Late Yesterday Skill', tier: 'beginner', due: '2026-06-26T23:59:00.000Z', state: 2 },
      ];
      const { getByText, queryByText, getByTestId } = render(<TodayScreen />, { wrapper: Wrapper });
      await act(async () => {});

      expect(getByText('Overdue')).toBeTruthy();
      expect(queryByText('Due Today')).toBeNull();
      expect(getByTestId('skill-item-Late Yesterday Skill')).toBeTruthy();
    });

    it('navigates to the practice screen when a queue item is tapped', async () => {
      mockQueue = [
        { skill_id: 9, skill_name: 'Tap Me Skill', tier: 'beginner', due: '2026-06-27T08:00:00.000Z', state: 1 },
      ];
      const { getByTestId } = render(<TodayScreen />, { wrapper: Wrapper });
      await act(async () => {});
      fireEvent.press(getByTestId('skill-item-Tap Me Skill'));
      expect(mockRouterPush).toHaveBeenCalledWith({
        pathname: '/(tabs)/practice/[skillId]',
        params: { skillId: 9 },
      });
    });
  });
});
