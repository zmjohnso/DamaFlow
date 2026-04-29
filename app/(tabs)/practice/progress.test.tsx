import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import ProgressScreen from './progress';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('@/lib/db/client', () => ({ db: {} }));

jest.mock('@/components/TierBadge', () => {
  const { View } = require('react-native');
  return function MockTierBadge({ tier }: { tier: string }) {
    return <View testID={`tier-badge-${tier}`} />;
  };
});

jest.mock('@/lib/db/queries', () => ({
  ...jest.requireActual('@/lib/db/queries'),
  getTierMasteryCounts: jest.fn(() => [
    { tier: 'beginner', mastered: 5, total: 15 },
    { tier: 'intermediate', mastered: 2, total: 12 },
    { tier: 'advanced', mastered: 0, total: 10 },
  ]),
  getOverdueMasteredSkills: jest.fn(() => [
    { skill_id: 1, skill_name: 'Lighthouse', tier: 'beginner', due: '2026-04-01T00:00:00.000Z' },
    { skill_id: 2, skill_name: 'Bird', tier: 'intermediate', due: '2026-04-10T00:00:00.000Z' },
  ]),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <PaperProvider>{children}</PaperProvider>;
}

describe('ProgressScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default implementation to prevent cross-test leakage
    require('@/lib/db/queries').getTierMasteryCounts.mockReturnValue([
      { tier: 'beginner', mastered: 5, total: 15 },
      { tier: 'intermediate', mastered: 2, total: 12 },
      { tier: 'advanced', mastered: 0, total: 10 },
    ]);
    require('@/lib/db/queries').getOverdueMasteredSkills.mockReturnValue([
      { skill_id: 1, skill_name: 'Lighthouse', tier: 'beginner', due: '2026-04-01T00:00:00.000Z' },
      { skill_id: 2, skill_name: 'Bird', tier: 'intermediate', due: '2026-04-10T00:00:00.000Z' },
    ]);
  });

  it('renders three tier sections with correct counts and progress', async () => {
    const { getByText, getAllByRole } = render(<ProgressScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByText('Beginner')).toBeTruthy();
    expect(getByText('5 of 15 skills mastered')).toBeTruthy();
    expect(getByText('Intermediate')).toBeTruthy();
    expect(getByText('2 of 12 skills mastered')).toBeTruthy();
    expect(getByText('Advanced')).toBeTruthy();
    expect(getByText('0 of 10 skills mastered')).toBeTruthy();

    const bars = getAllByRole('progressbar');
    expect(bars).toHaveLength(3);
  });

  it('sets accessibilityLabel on each tier section', async () => {
    const { getByLabelText } = render(<ProgressScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByLabelText('5 of 15 Beginner skills mastered')).toBeTruthy();
    expect(getByLabelText('2 of 12 Intermediate skills mastered')).toBeTruthy();
    expect(getByLabelText('0 of 10 Advanced skills mastered')).toBeTruthy();
  });

  it('renders full progress bar when all skills in a tier are mastered', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/lib/db/queries').getTierMasteryCounts.mockReturnValue([
      { tier: 'beginner', mastered: 15, total: 15 },
      { tier: 'intermediate', mastered: 0, total: 12 },
      { tier: 'advanced', mastered: 0, total: 10 },
    ]);
    const { getByText } = render(<ProgressScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByText('15 of 15 skills mastered')).toBeTruthy();
  });

  it('renders empty progress bar when no skills in a tier are mastered', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/lib/db/queries').getTierMasteryCounts.mockReturnValue([
      { tier: 'beginner', mastered: 0, total: 15 },
      { tier: 'intermediate', mastered: 0, total: 12 },
      { tier: 'advanced', mastered: 0, total: 10 },
    ]);
    const { getByText } = render(<ProgressScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByText('0 of 15 skills mastered')).toBeTruthy();
  });

  it('renders overdue mastered skills section with correct data', async () => {
    const toLocaleSpy = jest.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('2026-04-15');
    try {
      const { getByText, getByLabelText, getAllByText } = render(<ProgressScreen />, { wrapper: Wrapper });
      await act(async () => {});

      expect(getByText('Overdue Mastered Skills')).toBeTruthy();
      expect(getByText('Lighthouse')).toBeTruthy();
      expect(getByText('Bird')).toBeTruthy();
      expect(getAllByText(/\d+ days overdue/)).toHaveLength(2);
      expect(getByLabelText('Lighthouse, beginner, 14 days overdue')).toBeTruthy();
    } finally {
      toLocaleSpy.mockRestore();
    }
  });

  it('hides overdue section when no mastered skills are overdue', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/lib/db/queries').getOverdueMasteredSkills.mockReturnValue([]);
    const { queryByText } = render(<ProgressScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(queryByText('Overdue Mastered Skills')).toBeNull();
  });

  it('navigates to skill detail when an overdue row is tapped', async () => {
    const toLocaleSpy = jest.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('2026-04-15');
    try {
      const { getByLabelText } = render(<ProgressScreen />, { wrapper: Wrapper });
      await act(async () => {});

      const row = getByLabelText('Lighthouse, beginner, 14 days overdue');
      await act(async () => {
        fireEvent.press(row);
      });

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/(tabs)/skills/[skillId]',
        params: { skillId: 1 },
      });
    } finally {
      toLocaleSpy.mockRestore();
    }
  });
});
