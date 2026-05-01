import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import SkillsScreen from './index';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useFocusEffect: (cb: () => void) => { require('react').useEffect(cb, []); },
}));
jest.mock('@shopify/flash-list', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { FlatList } = require('react-native');
  return { FlashList: FlatList };
});
jest.mock('@/lib/db/client', () => ({ db: {} }));
jest.mock('@/lib/db/queries', () => ({
  getSkillsWithMastery: jest.fn(() => [
    { id: 1, name: 'Big Cup', tier: 'beginner', description: null, video_url: null, sort_order: 1, mastered: false },
    { id: 2, name: 'Spike', tier: 'beginner', description: null, video_url: null, sort_order: 3, mastered: true },
    { id: 3, name: 'Moshikame', tier: 'intermediate', description: null, video_url: null, sort_order: 11, mastered: false },
  ]),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <PaperProvider>{children}</PaperProvider>;
}

describe('SkillsScreen', () => {
  it('renders all 3 skill names from mock data', async () => {
    const { getByText } = render(<SkillsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByText('Big Cup')).toBeTruthy();
    expect(getByText('Spike')).toBeTruthy();
    expect(getByText('Moshikame')).toBeTruthy();
  });

  it('renders accessible labels including mastery state', async () => {
    const { getByLabelText } = render(<SkillsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByLabelText('Big Cup, beginner, not yet mastered')).toBeTruthy();
    expect(getByLabelText('Spike, beginner, mastered')).toBeTruthy();
    expect(getByLabelText('Moshikame, intermediate, not yet mastered')).toBeTruthy();
  });

  it('tapping "Beginner" chip shows only beginner skills', async () => {
    const { getAllByText, getByText, queryByText } = render(<SkillsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    // "Beginner" appears in both the filter chip and TierBadges — press the first (the chip)
    fireEvent.press(getAllByText('Beginner')[0]);
    await act(async () => {});
    expect(getByText('Big Cup')).toBeTruthy();
    expect(getByText('Spike')).toBeTruthy();
    expect(queryByText('Moshikame')).toBeNull();
  });

  it('tapping "All" chip after filtering restores all skills', async () => {
    const { getAllByText, getByText } = render(<SkillsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    // "Intermediate" appears in both the chip and TierBadge — press the first (the chip)
    fireEvent.press(getAllByText('Intermediate')[0]);
    await act(async () => {});
    fireEvent.press(getByText('All'));
    await act(async () => {});
    expect(getByText('Big Cup')).toBeTruthy();
    expect(getByText('Spike')).toBeTruthy();
    expect(getByText('Moshikame')).toBeTruthy();
  });

  it('shows empty state when no skills match the filter', async () => {
    const { getByText } = render(<SkillsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    // "Advanced" filter returns 0 results from the mock
    fireEvent.press(getByText('Advanced'));
    await act(async () => {});
    expect(getByText('No skills match this filter.')).toBeTruthy();
    expect(getByText('Clear filter')).toBeTruthy();
  });

  it('tapping "Clear filter" restores full list from empty state', async () => {
    const { getByText } = render(<SkillsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    fireEvent.press(getByText('Advanced'));
    await act(async () => {});
    fireEvent.press(getByText('Clear filter'));
    await act(async () => {});
    expect(getByText('Big Cup')).toBeTruthy();
    expect(getByText('Spike')).toBeTruthy();
    expect(getByText('Moshikame')).toBeTruthy();
  });

  it('renders a search input', async () => {
    const { getByPlaceholderText } = render(<SkillsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByPlaceholderText('Search skills')).toBeTruthy();
  });

  it('search input has accessibility label "Search skills"', async () => {
    const { getByLabelText } = render(<SkillsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByLabelText('Search skills')).toBeTruthy();
  });

  it('filters skills by search query (case-insensitive)', async () => {
    const { getByPlaceholderText, queryByText } = render(<SkillsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    const input = getByPlaceholderText('Search skills');
    fireEvent.changeText(input, 'big');
    await act(async () => {});
    expect(queryByText('Big Cup')).toBeTruthy();
    expect(queryByText('Spike')).toBeNull();
    expect(queryByText('Moshikame')).toBeNull();
  });

  it('combined tier filter + search only shows matching items', async () => {
    const { getByPlaceholderText, getAllByText, queryByText } = render(<SkillsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    fireEvent.press(getAllByText('Beginner')[0]);
    await act(async () => {});
    const input = getByPlaceholderText('Search skills');
    fireEvent.changeText(input, 'spike');
    await act(async () => {});
    expect(queryByText('Spike')).toBeTruthy();
    expect(queryByText('Big Cup')).toBeNull();
    expect(queryByText('Moshikame')).toBeNull();
  });

  it('Clear filter resets both search and tier filter', async () => {
    const { getByPlaceholderText, getAllByText, getByText } = render(<SkillsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    // Set a non-default tier filter AND a search query so both need resetting
    fireEvent.press(getAllByText('Beginner')[0]);
    await act(async () => {});
    fireEvent.changeText(getByPlaceholderText('Search skills'), 'zzz');
    await act(async () => {});
    fireEvent.press(getByText('Clear filter'));
    await act(async () => {});
    // All skills including Moshikame (intermediate) must be visible — proves tier was also reset
    expect(getByText('Big Cup')).toBeTruthy();
    expect(getByText('Spike')).toBeTruthy();
    expect(getByText('Moshikame')).toBeTruthy();
  });

  it('tapping a skill row navigates to skill detail', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { router } = require('expo-router');
    const { getByLabelText } = render(<SkillsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    fireEvent.press(getByLabelText('Big Cup, beginner, not yet mastered'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/skills/1');
  });

  it('skill rows have accessibilityRole "button"', async () => {
    const { getByLabelText } = render(<SkillsScreen />, { wrapper: Wrapper });
    await act(async () => {});
    const row = getByLabelText('Big Cup, beginner, not yet mastered');
    expect(row.props.accessibilityRole).toBe('button');
  });
});
