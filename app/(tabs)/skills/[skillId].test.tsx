import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import SkillDetailScreen from './[skillId]';

const mockUseLocalSearchParams = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));
jest.mock('@/lib/db/client', () => ({ db: {} }));
jest.mock('@shopify/flash-list', () => {
  const { FlatList } = require('react-native');
  return { FlashList: FlatList };
});
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
  getSessionsForSkillWithEquipment: jest.fn(() => []),
  getSessionsForSkill: jest.fn(() => []),
  updateSession: jest.fn(),
  deleteSession: jest.fn(),
  updateSkillProgress: jest.fn(),
  setSkillMastered: jest.fn(),
  bulkInsertSkillProgress: jest.fn(),
}));

// Stable loadQueue reference so assertions can track calls across renders
const mockLoadQueue = jest.fn();
jest.mock('@/store/queueStore', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(() => ({ loadQueue: mockLoadQueue })),
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
  bulkInit: jest.fn(() => [{
    skill_id: 1,
    stability: 1,
    difficulty: 0.3,
    elapsed_days: 0,
    scheduled_days: 1,
    reps: 1,
    lapses: 0,
    state: 2,
    due: '2026-05-01T00:00:00.000Z',
  }]),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getSkillById, getSkillProgressById, getSessionsForSkillWithEquipment, updateSession, deleteSession, setSkillMastered, bulkInsertSkillProgress } = require('@/lib/db/queries');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { bulkInit } = require('@/lib/fsrs/scheduler');

function Wrapper({ children }: { children: React.ReactNode }) {
  return <PaperProvider>{children}</PaperProvider>;
}

const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

const SESSION_ROW = {
  id: 10,
  skill_id: 1,
  equipment_id: null,
  equipment_name: null,
  reps: 5,
  self_rating: 3,
  logged_at: '2026-04-03T10:00:00.000Z',
};

describe('SkillDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ skillId: '1' });
    openURLSpy.mockResolvedValue(undefined);
    getSkillById.mockReturnValue({
      id: 1,
      name: 'Big Cup',
      tier: 'beginner',
      description: 'A classic beginner trick.',
      video_url: 'https://example.com/big-cup',
      sort_order: 1,
    });
    getSkillProgressById.mockReturnValue(undefined);
    getSessionsForSkillWithEquipment.mockReturnValue([]);
    // Restore loadQueue after clearAllMocks resets the mock call count
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/store/queueStore').default.getState.mockReturnValue({ loadQueue: mockLoadQueue });
  });

  it('renders skill name', () => {
    const { getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getByText('Big Cup')).toBeTruthy();
  });

  it('renders TierBadge with tier label', () => {
    const { getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getByText('Beginner')).toBeTruthy();
  });

  it('renders skill description', () => {
    const { getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getByText('A classic beginner trick.')).toBeTruthy();
  });

  it('renders Watch Tutorial button when video_url is set', () => {
    const { getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getByText('Watch Tutorial')).toBeTruthy();
  });

  it('does not render Watch Tutorial button when video_url is null', () => {
    getSkillById.mockReturnValueOnce({
      id: 1,
      name: 'Big Cup',
      tier: 'beginner',
      description: 'A classic beginner trick.',
      video_url: null,
      sort_order: 1,
    });
    const { queryByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(queryByText('Watch Tutorial')).toBeNull();
  });

  it('does not render Watch Tutorial button when video_url is empty string', () => {
    getSkillById.mockReturnValueOnce({
      id: 1,
      name: 'Big Cup',
      tier: 'beginner',
      description: null,
      video_url: '',
      sort_order: 1,
    });
    const { queryByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(queryByText('Watch Tutorial')).toBeNull();
  });

  it('does not render Watch Tutorial button when video_url is malformed', () => {
    getSkillById.mockReturnValueOnce({
      id: 1,
      name: 'Big Cup',
      tier: 'beginner',
      description: null,
      video_url: 'notaurl',
      sort_order: 1,
    });
    const { queryByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(queryByText('Watch Tutorial')).toBeNull();
  });

  it('tapping Watch Tutorial calls Linking.openURL with the correct URL', async () => {
    const { getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByText('Watch Tutorial'));
    });
    expect(openURLSpy).toHaveBeenCalledWith('https://example.com/big-cup');
  });

  it('swallows Linking.openURL rejections', async () => {
    openURLSpy.mockRejectedValueOnce(new Error('blocked'));
    const { getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByText('Watch Tutorial'));
    });
    expect(openURLSpy).toHaveBeenCalledWith('https://example.com/big-cup');
  });

  it('skill name has accessibilityRole "header"', () => {
    const { getByRole } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getByRole('header', { name: 'Big Cup' })).toBeTruthy();
  });

  it('Watch Tutorial button has correct accessibilityLabel', () => {
    const { getByLabelText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getByLabelText('Watch tutorial for Big Cup in browser')).toBeTruthy();
  });

  it('renders "Skill not found." when getSkillById returns undefined', () => {
    getSkillById.mockReturnValueOnce(undefined);
    const { getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getByText('Skill not found.')).toBeTruthy();
  });

  it('renders "Skill not found." when skillId param is invalid', () => {
    mockUseLocalSearchParams.mockReturnValueOnce({ skillId: ['1'] });
    const { getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getByText('Skill not found.')).toBeTruthy();
  });

  it('renders "Skill not found." when skillId param is undefined', () => {
    mockUseLocalSearchParams.mockReturnValueOnce({ skillId: undefined });
    const { getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getByText('Skill not found.')).toBeTruthy();
  });

  it('does not render Watch Tutorial button when video_url is whitespace only', () => {
    getSkillById.mockReturnValueOnce({
      id: 1,
      name: 'Big Cup',
      tier: 'beginner',
      description: null,
      video_url: '   ',
      sort_order: 1,
    });
    const { queryByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(queryByText('Watch Tutorial')).toBeNull();
  });

  it('does not render description section when description is null', () => {
    getSkillById.mockReturnValueOnce({
      id: 1,
      name: 'Big Cup',
      tier: 'beginner',
      description: null,
      video_url: 'https://example.com/big-cup',
      sort_order: 1,
    });
    const { queryByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(queryByText('Big Cup')).toBeTruthy();
    expect(queryByText('A classic beginner trick.')).toBeNull();
  });

  // Story 4.6: Session History

  it('renders empty state when skill has no sessions', () => {
    getSessionsForSkillWithEquipment.mockReturnValueOnce([]);
    const { getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getByText(/No sessions logged yet/)).toBeTruthy();
  });

  it('renders a session row with date, reps, and rating', () => {
    getSessionsForSkillWithEquipment.mockReturnValueOnce([{
      id: 1,
      skill_id: 1,
      equipment_id: null,
      equipment_name: null,
      reps: 5,
      self_rating: 3,
      logged_at: '2026-04-03T10:00:00.000Z',
    }]);
    const { getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getByText('Apr 3, 2026')).toBeTruthy();
    expect(getByText(/5 reps · Good/)).toBeTruthy();
  });

  it('renders "—" for null reps', () => {
    getSessionsForSkillWithEquipment.mockReturnValueOnce([{
      id: 2,
      skill_id: 1,
      equipment_id: null,
      equipment_name: null,
      reps: null,
      self_rating: 1,
      logged_at: '2026-04-01T10:00:00.000Z',
    }]);
    const { getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getByText(/— reps · Again/)).toBeTruthy();
  });

  it('renders correct rating labels for all four ratings', () => {
    getSessionsForSkillWithEquipment.mockReturnValueOnce([
      { id: 1, skill_id: 1, equipment_id: null, equipment_name: null, reps: null, self_rating: 1, logged_at: '2026-04-04T00:00:00.000Z' },
      { id: 2, skill_id: 1, equipment_id: null, equipment_name: null, reps: null, self_rating: 2, logged_at: '2026-04-03T00:00:00.000Z' },
      { id: 3, skill_id: 1, equipment_id: null, equipment_name: null, reps: null, self_rating: 3, logged_at: '2026-04-02T00:00:00.000Z' },
      { id: 4, skill_id: 1, equipment_id: null, equipment_name: null, reps: null, self_rating: 4, logged_at: '2026-04-01T00:00:00.000Z' },
    ]);
    const { getAllByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getAllByText(/Again/).length).toBeGreaterThan(0);
    expect(getAllByText(/Hard/).length).toBeGreaterThan(0);
    expect(getAllByText(/Good/).length).toBeGreaterThan(0);
    expect(getAllByText(/Easy/).length).toBeGreaterThan(0);
  });

  it('renders "Next review" with formatted date when skill has progress and sessions', () => {
    getSkillProgressById.mockReturnValueOnce({
      skill_id: 1,
      due: '2026-04-20T12:00:00.000Z',
      stability: 2.5,
      difficulty: 0.3,
      elapsed_days: 0,
      scheduled_days: 7,
      reps: 1,
      lapses: 0,
      state: 2,
      mastered: false,
      mastered_at: null,
    });
    getSessionsForSkillWithEquipment.mockReturnValueOnce([{
      id: 1,
      skill_id: 1,
      equipment_id: null,
      equipment_name: null,
      reps: 3,
      self_rating: 3,
      logged_at: '2026-04-15T10:00:00.000Z',
    }]);
    const { getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getByText(/Next review: Apr 20, 2026/)).toBeTruthy();
  });

  it('does not render "Next review" when skill has no progress', () => {
    getSkillProgressById.mockReturnValueOnce(undefined);
    getSessionsForSkillWithEquipment.mockReturnValueOnce([]);
    const { queryByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(queryByText(/Next review/)).toBeNull();
  });

  it('does not render "Next review" when skill has progress but no sessions', () => {
    getSkillProgressById.mockReturnValueOnce({
      skill_id: 1,
      due: '2026-04-20T12:00:00.000Z',
      stability: 2.5,
      difficulty: 0.3,
      elapsed_days: 0,
      scheduled_days: 7,
      reps: 1,
      lapses: 0,
      state: 2,
      mastered: false,
      mastered_at: null,
    });
    getSessionsForSkillWithEquipment.mockReturnValueOnce([]);
    const { queryByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(queryByText(/Next review/)).toBeNull();
  });

  it('calls getSessionsForSkillWithEquipment with the parsed skill id', () => {
    mockUseLocalSearchParams.mockReturnValue({ skillId: '42' });
    getSkillById.mockReturnValueOnce({
      id: 42,
      name: 'Lighthouse',
      tier: 'advanced',
      description: null,
      video_url: null,
      sort_order: 5,
    });
    render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getSessionsForSkillWithEquipment).toHaveBeenCalledWith({}, 42);
  });

  // Story 6.4: Equipment name in session history

  it('renders equipment name in session row when equipment_id is set', () => {
    getSessionsForSkillWithEquipment.mockReturnValueOnce([{
      id: 1,
      skill_id: 1,
      equipment_id: 5,
      equipment_name: 'Ozora',
      reps: 5,
      self_rating: 3,
      logged_at: '2026-04-03T10:00:00.000Z',
    }]);
    const { getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getByText(/Ozora/)).toBeTruthy();
  });

  it('does not render extra text when equipment_id is null', () => {
    getSessionsForSkillWithEquipment.mockReturnValueOnce([{
      id: 1,
      skill_id: 1,
      equipment_id: null,
      equipment_name: null,
      reps: 5,
      self_rating: 3,
      logged_at: '2026-04-03T10:00:00.000Z',
    }]);
    const { getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getByText('Apr 3, 2026')).toBeTruthy();
    expect(getByText(/5 reps · Good/)).toBeTruthy();
    // Ensure no extra "·" beyond the one between reps and rating
    const textEl = getByText(/5 reps · Good/);
    expect(textEl.children.join('').split('·').length).toBe(2);
  });

  it('session row accessibility label includes equipment name when present', () => {
    getSessionsForSkillWithEquipment.mockReturnValueOnce([{
      id: 1,
      skill_id: 1,
      equipment_id: 5,
      equipment_name: 'Ozora',
      reps: 5,
      self_rating: 3,
      logged_at: '2026-04-03T10:00:00.000Z',
    }]);
    const { getByLabelText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getByLabelText('Edit session from Apr 3, 2026, using Ozora')).toBeTruthy();
  });

  // Story 4.7: Session Edit and Delete

  it('session row has accessible label with date', () => {
    getSessionsForSkillWithEquipment.mockReturnValue([SESSION_ROW]);
    const { getByLabelText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getByLabelText('Edit session from Apr 3, 2026')).toBeTruthy();
  });

  it('tapping a session row opens the edit modal', async () => {
    getSessionsForSkillWithEquipment.mockReturnValue([SESSION_ROW]);
    const { getByLabelText, getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByLabelText('Edit session from Apr 3, 2026'));
    });
    expect(getByText('Edit Session')).toBeTruthy();
  });

  it('edit modal shows reps input and rating buttons', async () => {
    getSessionsForSkillWithEquipment.mockReturnValue([SESSION_ROW]);
    const { getByLabelText, getByDisplayValue } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByLabelText('Edit session from Apr 3, 2026'));
    });
    expect(getByDisplayValue('5')).toBeTruthy(); // reps pre-populated
    expect(getByLabelText('Rate Again')).toBeTruthy();
    expect(getByLabelText('Rate Hard')).toBeTruthy();
    expect(getByLabelText('Rate Good')).toBeTruthy();
    expect(getByLabelText('Rate Easy')).toBeTruthy();
  });

  it('edit modal shows the session date in header', async () => {
    getSessionsForSkillWithEquipment.mockReturnValue([SESSION_ROW]);
    const { getByLabelText, getAllByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByLabelText('Edit session from Apr 3, 2026'));
    });
    // Date appears in both session row and modal header
    expect(getAllByText('Apr 3, 2026').length).toBeGreaterThanOrEqual(2);
  });

  it('Save calls updateSession with correct args', async () => {
    getSessionsForSkillWithEquipment.mockReturnValue([SESSION_ROW]);
    const { getByLabelText, getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByLabelText('Edit session from Apr 3, 2026'));
    });
    await act(async () => {
      fireEvent.press(getByText('Save'));
    });
    expect(updateSession).toHaveBeenCalledWith({}, SESSION_ROW.id, { reps: 5, self_rating: 3 });
  });

  it('Save calls loadQueue', async () => {
    getSessionsForSkillWithEquipment.mockReturnValue([SESSION_ROW]);
    const { getByLabelText, getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByLabelText('Edit session from Apr 3, 2026'));
    });
    await act(async () => {
      fireEvent.press(getByText('Save'));
    });
    expect(mockLoadQueue).toHaveBeenCalled();
  });

  it('Save clears editingSession state so modal content disappears', async () => {
    getSessionsForSkillWithEquipment.mockReturnValue([SESSION_ROW]);
    const { getByLabelText, getByText, queryByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByLabelText('Edit session from Apr 3, 2026'));
    });
    expect(getByText('Edit Session')).toBeTruthy();
    await act(async () => {
      fireEvent.press(getByText('Save'));
    });
    // editingSession = null → modal content rendered as null
    expect(queryByText('Save')).toBeNull();
    expect(queryByText('Delete session')).toBeNull();
  });

  it('tapping "Delete session" button shows delete Dialog', async () => {
    getSessionsForSkillWithEquipment.mockReturnValue([SESSION_ROW]);
    // Paper Dialog animation does not complete in Jest; use includeHiddenElements to find buttons
    const { getByLabelText, getByText, getByTestId } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByLabelText('Edit session from Apr 3, 2026'));
    });
    await act(async () => {
      fireEvent.press(getByText('Delete session'));
    });
    expect(getByTestId('dialog-delete-btn', { includeHiddenElements: true })).toBeTruthy();
    expect(getByTestId('dialog-cancel-btn', { includeHiddenElements: true })).toBeTruthy();
  });

  it('tapping [Delete] in Dialog calls deleteSession', async () => {
    getSessionsForSkillWithEquipment.mockReturnValue([SESSION_ROW]);
    const { getByLabelText, getByText, getByTestId } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByLabelText('Edit session from Apr 3, 2026'));
    });
    await act(async () => {
      fireEvent.press(getByText('Delete session'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('dialog-delete-btn', { includeHiddenElements: true }));
    });
    expect(deleteSession).toHaveBeenCalledWith({}, SESSION_ROW.id);
  });

  it('tapping [Delete] in Dialog calls loadQueue', async () => {
    getSessionsForSkillWithEquipment.mockReturnValue([SESSION_ROW]);
    const { getByLabelText, getByText, getByTestId } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByLabelText('Edit session from Apr 3, 2026'));
    });
    await act(async () => {
      fireEvent.press(getByText('Delete session'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('dialog-delete-btn', { includeHiddenElements: true }));
    });
    expect(mockLoadQueue).toHaveBeenCalled();
  });

  it('tapping [Delete] clears modal and dialog content', async () => {
    getSessionsForSkillWithEquipment.mockReturnValue([SESSION_ROW]);
    const { getByLabelText, getByText, getByTestId, queryByText, queryByTestId } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByLabelText('Edit session from Apr 3, 2026'));
    });
    await act(async () => {
      fireEvent.press(getByText('Delete session'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('dialog-delete-btn', { includeHiddenElements: true }));
    });
    // editingSession = null → modal content gone (conditional render, not animation)
    expect(queryByText('Delete session')).toBeNull();
    expect(queryByText('Save')).toBeNull();
    // dialog hidden (opacity 0 → inaccessible to default queries)
    expect(queryByTestId('dialog-delete-btn')).toBeNull();
  });

  it('tapping [Cancel] in Dialog does not call deleteSession', async () => {
    getSessionsForSkillWithEquipment.mockReturnValue([SESSION_ROW]);
    const { getByLabelText, getByText, getByTestId } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByLabelText('Edit session from Apr 3, 2026'));
    });
    await act(async () => {
      fireEvent.press(getByText('Delete session'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('dialog-cancel-btn', { includeHiddenElements: true }));
    });
    expect(deleteSession).not.toHaveBeenCalled();
  });

  it('tapping [Cancel] hides dialog but keeps modal content visible', async () => {
    getSessionsForSkillWithEquipment.mockReturnValue([SESSION_ROW]);
    const { getByLabelText, getByText, getByTestId, queryByTestId } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByLabelText('Edit session from Apr 3, 2026'));
    });
    await act(async () => {
      fireEvent.press(getByText('Delete session'));
    });
    expect(getByTestId('dialog-delete-btn', { includeHiddenElements: true })).toBeTruthy();
    await act(async () => {
      fireEvent.press(getByTestId('dialog-cancel-btn', { includeHiddenElements: true }));
    });
    // dialog hidden (opacity 0 → inaccessible to default queries)
    expect(queryByTestId('dialog-delete-btn')).toBeNull();
    // Modal still open — Save is still in the tree (conditional render; includeHiddenElements
    // bypasses the aria-modal sibling filter that Paper Dialog applies during close animation)
    expect(getByText('Save', { includeHiddenElements: true })).toBeTruthy();
  });

  // Story 4.8: Mark and Unmark Skill as Mastered

  it('renders mastery Switch in OFF state when progress is undefined', () => {
    getSkillProgressById.mockReturnValue(undefined);
    const { getByRole } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    const switchEl = getByRole('switch');
    expect(switchEl).toBeTruthy();
    expect(switchEl.props.value).toBe(false);
  });

  it('renders mastery Switch in ON state when mastered=true', () => {
    getSkillProgressById.mockReturnValue({
      skill_id: 1, mastered: true, mastered_at: '2026-04-20T00:00:00.000Z',
      due: '2026-04-25T00:00:00.000Z', stability: 2, difficulty: 0.3,
      elapsed_days: 0, scheduled_days: 5, reps: 1, lapses: 0, state: 2,
    });
    const { getByRole } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    const switchEl = getByRole('switch');
    expect(switchEl.props.value).toBe(true);
  });

  it('tapping Switch when unmastered calls setSkillMastered(db, 1, true)', async () => {
    getSkillProgressById.mockReturnValue({
      skill_id: 1, mastered: false, mastered_at: null,
      due: '2026-04-25T00:00:00.000Z', stability: 2, difficulty: 0.3,
      elapsed_days: 0, scheduled_days: 5, reps: 1, lapses: 0, state: 2,
    });
    const { getByRole } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent(getByRole('switch'), 'valueChange', true);
    });
    expect(setSkillMastered).toHaveBeenCalledWith({}, 1, true);
  });

  it('tapping Switch when mastered calls setSkillMastered(db, 1, false)', async () => {
    getSkillProgressById.mockReturnValue({
      skill_id: 1, mastered: true, mastered_at: '2026-04-20T00:00:00.000Z',
      due: '2026-04-25T00:00:00.000Z', stability: 2, difficulty: 0.3,
      elapsed_days: 0, scheduled_days: 5, reps: 1, lapses: 0, state: 2,
    });
    const { getByRole } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent(getByRole('switch'), 'valueChange', false);
    });
    expect(setSkillMastered).toHaveBeenCalledWith({}, 1, false);
  });

  it('tapping Switch calls loadQueue', async () => {
    getSkillProgressById.mockReturnValue({
      skill_id: 1, mastered: false, mastered_at: null,
      due: '2026-04-25T00:00:00.000Z', stability: 2, difficulty: 0.3,
      elapsed_days: 0, scheduled_days: 5, reps: 1, lapses: 0, state: 2,
    });
    const { getByRole } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent(getByRole('switch'), 'valueChange', true);
    });
    expect(mockLoadQueue).toHaveBeenCalled();
  });

  it('calls bulkInsertSkillProgress when no progress row exists and marking mastered', async () => {
    getSkillProgressById.mockReturnValue(undefined);
    const { getByRole } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent(getByRole('switch'), 'valueChange', true);
    });
    expect(bulkInit).toHaveBeenCalledWith([1], expect.any(String));
    expect(bulkInsertSkillProgress).toHaveBeenCalled();
    expect(setSkillMastered).toHaveBeenCalledWith({}, 1, true);
  });

  it('Switch has accessibilityRole="switch"', () => {
    const { getByRole } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    expect(getByRole('switch')).toBeTruthy();
  });

  it('shows snackbar when setSkillMastered throws', async () => {
    getSkillProgressById.mockReturnValue({
      skill_id: 1, mastered: false, mastered_at: null,
      due: '2026-04-25T00:00:00.000Z', stability: 2, difficulty: 0.3,
      elapsed_days: 0, scheduled_days: 5, reps: 1, lapses: 0, state: 2,
    });
    setSkillMastered.mockImplementationOnce(() => { throw new Error('DB error'); });
    const { getByRole, getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent(getByRole('switch'), 'valueChange', true);
    });
    expect(getByText('Could not update mastery. Please try again.')).toBeTruthy();
  });

  it('edit modal pre-populates null reps as empty string', async () => {
    getSessionsForSkillWithEquipment.mockReturnValue([{ ...SESSION_ROW, reps: null }]);
    const { getByLabelText, getByPlaceholderText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByLabelText('Edit session from Apr 3, 2026'));
    });
    expect(getByPlaceholderText('Reps (optional)')).toBeTruthy();
  });

  it('Save shows snackbar when updateSession throws', async () => {
    getSessionsForSkillWithEquipment.mockReturnValue([SESSION_ROW]);
    updateSession.mockImplementationOnce(() => { throw new Error('DB error'); });
    const { getByLabelText, getByText } = render(<SkillDetailScreen />, { wrapper: Wrapper });
    await act(async () => {
      fireEvent.press(getByLabelText('Edit session from Apr 3, 2026'));
    });
    await act(async () => {
      fireEvent.press(getByText('Save'));
    });
    expect(getByText('Could not save changes. Please try again.')).toBeTruthy();
  });
});
