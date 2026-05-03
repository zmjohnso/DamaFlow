import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import PracticeScreen from './[skillId]';

const mockBack = jest.fn();
const mockUseLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  router: { back: () => mockBack() },
}));

jest.mock('@/lib/db/client', () => ({ db: {} }));

jest.mock('@/components/TierBadge', () => {
  const { View } = require('react-native');
  return function MockTierBadge({ tier }: { tier: string }) {
    return <View testID={`tier-badge-${tier}`} />;
  };
});

jest.mock('@/components/RatingRow', () => {
  const { View, TouchableOpacity } = require('react-native');
  return function MockRatingRow({ onRate }: { onRate: (rating: 1 | 2 | 3 | 4) => void }) {
    return (
      <View>
        {[1, 2, 3, 4].map((r) => (
          <TouchableOpacity key={r} testID={`rate-${r}`} onPress={() => onRate(r as 1 | 2 | 3 | 4)}>
            <View />
          </TouchableOpacity>
        ))}
      </View>
    );
  };
});

const mockLoadQueue = jest.fn();
jest.mock('@/store/queueStore', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(() => ({ loadQueue: mockLoadQueue })),
  },
}));

const mockClearSession = jest.fn();
const mockSetReps = jest.fn();
const mockSetCurrentSkill = jest.fn();
jest.mock('@/store/sessionStore', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(() => ({
      currentSkillId: 1,
      reps: null,
      clearSession: mockClearSession,
      setReps: mockSetReps,
      setCurrentSkill: mockSetCurrentSkill,
    })),
  },
}));

jest.mock('@/lib/fsrs/scheduler', () => ({
  reschedule: jest.fn(() => ({
    stability: 1,
    difficulty: 0.3,
    elapsed_days: 0,
    scheduled_days: 1,
    reps: 1,
    lapses: 0,
    state: 2,
    due: '2026-05-01T00:00:00.000Z',
  })),
  scheduleNew: jest.fn(() => ({
    skill_id: 1,
    stability: 1,
    difficulty: 0.3,
    elapsed_days: 0,
    scheduled_days: 1,
    reps: 1,
    lapses: 0,
    state: 1,
    due: '2026-05-03T15:10:00.000Z',
  })),
}));

const mockInsertSession = jest.fn();
const mockSetSetting = jest.fn();
const mockGetAllEquipmentForPicker = jest.fn(() => []);
jest.mock('@/lib/db/queries', () => ({
  getSkillById: jest.fn(() => ({
    id: 1,
    name: 'Big Cup',
    tier: 'beginner',
    description: 'A classic beginner trick.',
    video_url: 'https://example.com/big-cup',
    sort_order: 1,
  })),
  getSkillProgressById: jest.fn(() => undefined),
  getLastSession: jest.fn(() => undefined),
  updateSkillProgress: jest.fn(),
  bulkInsertSkillProgress: jest.fn(),
  insertSession: (...args: unknown[]) => mockInsertSession(...args),
  setSetting: (...args: unknown[]) => mockSetSetting(...args),
  getAllEquipmentForPicker: () => mockGetAllEquipmentForPicker(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getSkillById, getSkillProgressById, getLastSession } = require('@/lib/db/queries');

function Wrapper({ children }: { children: React.ReactNode }) {
  return <PaperProvider>{children}</PaperProvider>;
}

describe('PracticeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetSetting.mockReset();
    mockUseLocalSearchParams.mockReturnValue({ skillId: '1' });
    getSkillById.mockReturnValue({
      id: 1,
      name: 'Big Cup',
      tier: 'beginner',
      description: 'A classic beginner trick.',
      video_url: 'https://example.com/big-cup',
      sort_order: 1,
    });
    getSkillProgressById.mockReturnValue(undefined);
    getLastSession.mockReturnValue(undefined);
    mockGetAllEquipmentForPicker.mockReturnValue([]);
    // Restore session store after clearAllMocks
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/store/sessionStore').default.getState.mockReturnValue({
      currentSkillId: 1,
      reps: null,
      clearSession: mockClearSession,
      setReps: mockSetReps,
      setCurrentSkill: mockSetCurrentSkill,
    });
    // Restore queue store after clearAllMocks
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/store/queueStore').default.getState.mockReturnValue({ loadQueue: mockLoadQueue });
  });

  it('renders skill name', () => {
    const { getByText } = render(<PracticeScreen />, { wrapper: Wrapper });
    expect(getByText('Big Cup')).toBeTruthy();
  });

  it('renders skill not found when id is invalid', () => {
    mockUseLocalSearchParams.mockReturnValueOnce({ skillId: 'abc' });
    const { getByText } = render(<PracticeScreen />, { wrapper: Wrapper });
    expect(getByText('Skill not found.')).toBeTruthy();
  });

  it('renders Watch Tutorial button when video_url is valid', () => {
    const { getByText } = render(<PracticeScreen />, { wrapper: Wrapper });
    expect(getByText('Watch Tutorial')).toBeTruthy();
  });

  it('does not render Watch Tutorial when video_url is null', () => {
    getSkillById.mockReturnValueOnce({
      id: 1,
      name: 'Big Cup',
      tier: 'beginner',
      description: null,
      video_url: null,
      sort_order: 1,
    });
    const { queryByText } = render(<PracticeScreen />, { wrapper: Wrapper });
    expect(queryByText('Watch Tutorial')).toBeNull();
  });

  it('hides equipment picker when no equipment exists', () => {
    mockGetAllEquipmentForPicker.mockReturnValue([]);
    const { queryByLabelText } = render(<PracticeScreen />, { wrapper: Wrapper });
    expect(queryByLabelText(/Equipment used/)).toBeNull();
  });

  it('shows equipment picker when equipment exists', () => {
    mockGetAllEquipmentForPicker.mockReturnValue([{ id: 1, name: 'Ozora' }]);
    const { getByLabelText } = render(<PracticeScreen />, { wrapper: Wrapper });
    expect(getByLabelText('Equipment used: None')).toBeTruthy();
  });

  it('equipment picker defaults to "None"', () => {
    mockGetAllEquipmentForPicker.mockReturnValue([{ id: 1, name: 'Ozora' }]);
    const { getByLabelText } = render(<PracticeScreen />, { wrapper: Wrapper });
    expect(getByLabelText('Equipment used: None')).toBeTruthy();
  });

  it('tapping equipment picker opens modal', async () => {
    mockGetAllEquipmentForPicker.mockReturnValue([{ id: 1, name: 'Ozora' }]);
    const { getByLabelText, getByText, getAllByText } = render(<PracticeScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByLabelText('Equipment used: None'));
    });
    expect(getByText('Select Equipment')).toBeTruthy();
    // "None" appears on picker button and in modal list
    expect(getAllByText('None').length).toBeGreaterThanOrEqual(1);
    expect(getByText('Ozora')).toBeTruthy();
  });

  it('selecting equipment in modal updates picker label', async () => {
    mockGetAllEquipmentForPicker.mockReturnValue([{ id: 1, name: 'Ozora' }]);
    const { getByLabelText, getByText, queryByLabelText } = render(<PracticeScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByLabelText('Equipment used: None'));
    });
    await act(async () => {
      fireEvent.press(getByText('Ozora'));
    });
    expect(queryByLabelText('Equipment used: None')).toBeNull();
    expect(getByLabelText('Equipment used: Ozora')).toBeTruthy();
  });

  it('selecting "None" in modal keeps picker as None', async () => {
    mockGetAllEquipmentForPicker.mockReturnValue([{ id: 1, name: 'Ozora' }]);
    const { getByLabelText, getByRole } = render(<PracticeScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByLabelText('Equipment used: None'));
    });
    await act(async () => {
      fireEvent.press(getByRole('radio', { name: 'None, selected' }));
    });
    expect(getByLabelText('Equipment used: None')).toBeTruthy();
  });

  it('modal row has accessibilityRole radio and selected state', async () => {
    mockGetAllEquipmentForPicker.mockReturnValue([{ id: 1, name: 'Ozora' }]);
    const { getByLabelText, getByRole } = render(<PracticeScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByLabelText('Equipment used: None'));
    });
    expect(getByRole('radio', { name: 'None, selected' })).toBeTruthy();
    expect(getByRole('radio', { name: 'Ozora, not selected' })).toBeTruthy();
  });

  it('logs session with equipment_id when equipment is selected', async () => {
    mockGetAllEquipmentForPicker.mockReturnValue([{ id: 1, name: 'Ozora' }]);
    const { getByLabelText, getByText, getByTestId } = render(<PracticeScreen />, { wrapper: Wrapper });

    // Select equipment
    await act(async () => {
      fireEvent.press(getByLabelText('Equipment used: None'));
    });
    await act(async () => {
      fireEvent.press(getByText('Ozora'));
    });

    // Tap Done to show rating
    await act(async () => {
      fireEvent.press(getByText('Done'));
    });

    // Tap a rating
    await act(async () => {
      fireEvent.press(getByTestId('rate-3'));
    });

    expect(mockInsertSession).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        skill_id: 1,
        equipment_id: 1,
        self_rating: 3,
      }),
    );
  });

  it('logs session with null equipment_id when None is selected', async () => {
    mockGetAllEquipmentForPicker.mockReturnValue([{ id: 1, name: 'Ozora' }]);
    const { getByText, getByTestId } = render(<PracticeScreen />, { wrapper: Wrapper });

    await act(async () => {
      fireEvent.press(getByText('Done'));
    });

    await act(async () => {
      fireEvent.press(getByTestId('rate-3'));
    });

    expect(mockInsertSession).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        skill_id: 1,
        equipment_id: null,
        self_rating: 3,
      }),
    );
  });

  it('logs session with null equipment_id when no equipment exists', async () => {
    mockGetAllEquipmentForPicker.mockReturnValue([]);
    const { getByText, getByTestId } = render(<PracticeScreen />, { wrapper: Wrapper });

    await act(async () => {
      fireEvent.press(getByText('Done'));
    });

    await act(async () => {
      fireEvent.press(getByTestId('rate-3'));
    });

    expect(mockInsertSession).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        skill_id: 1,
        equipment_id: null,
        self_rating: 3,
      }),
    );
  });

  it('loads queue after rating', async () => {
    const { getByText, getByTestId } = render(<PracticeScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByText('Done'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('rate-3'));
    });
    expect(mockLoadQueue).toHaveBeenCalled();
  });

  it('clears session after rating', async () => {
    const { getByText, getByTestId } = render(<PracticeScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByText('Done'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('rate-3'));
    });
    expect(mockClearSession).toHaveBeenCalled();
  });

  it('navigates back after rating', async () => {
    const { getByText, getByTestId } = render(<PracticeScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByText('Done'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('rate-3'));
    });
    expect(mockBack).toHaveBeenCalled();
  });

  it('sets pending_notification_prompt after successful session rating', async () => {
    const { getByText, getByTestId } = render(<PracticeScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByText('Done'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('rate-3'));
    });
    expect(mockSetSetting).toHaveBeenCalledWith({}, 'pending_notification_prompt', 'true');
  });

  it('does not set pending_notification_prompt when insertSession throws', async () => {
    mockInsertSession.mockImplementation(() => {
      throw new Error('db error');
    });
    const { getByText, getByTestId } = render(<PracticeScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByText('Done'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('rate-3'));
    });
    expect(mockSetSetting).not.toHaveBeenCalledWith(expect.anything(), 'pending_notification_prompt', 'true');
  });
});
