import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import RatingRow from './RatingRow';

// Mock scheduler so interval computation returns predictable values.
// Again=1d, Hard=3d, Good=7d, Easy=21d
jest.mock('@/lib/fsrs/scheduler', () => ({
  reschedule: jest.fn((_: unknown, rating: number) => {
    const intervals: Record<number, number> = { 1: 1, 2: 3, 3: 7, 4: 21 };
    return { scheduled_days: intervals[rating] ?? 1 };
  }),
}));

const MOCK_PROGRESS = {
  skill_id: 1,
  stability: 2.5,
  difficulty: 0.3,
  elapsed_days: 0,
  scheduled_days: 7,
  reps: 1,
  lapses: 0,
  state: 2,
  due: '2026-04-18T00:00:00.000Z',
  mastered: false,
  mastered_at: null,
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return <PaperProvider>{children}</PaperProvider>;
}

describe('RatingRow', () => {
  it('renders all four rating buttons', () => {
    const { getByText } = render(
      <RatingRow skillProgress={MOCK_PROGRESS} onRate={() => {}} />,
      { wrapper: Wrapper }
    );
    expect(getByText(/Again/)).toBeTruthy();
    expect(getByText(/Hard/)).toBeTruthy();
    expect(getByText(/Good/)).toBeTruthy();
    expect(getByText(/Easy/)).toBeTruthy();
  });

  it('renders interval label for each button', () => {
    const { getByText } = render(
      <RatingRow skillProgress={MOCK_PROGRESS} onRate={() => {}} />,
      { wrapper: Wrapper }
    );
    // Mocked intervals: 1d, 3d, 7d, 21d — use "· Nd" prefix to avoid substring overlap (21d contains "1d")
    expect(getByText(/· 1d/)).toBeTruthy();
    expect(getByText(/· 3d/)).toBeTruthy();
    expect(getByText(/· 7d/)).toBeTruthy();
    expect(getByText(/· 21d/)).toBeTruthy();
  });

  it('has correct accessibilityLabel for Good button', () => {
    const { getByLabelText } = render(
      <RatingRow skillProgress={MOCK_PROGRESS} onRate={() => {}} />,
      { wrapper: Wrapper }
    );
    expect(getByLabelText('Good, schedules review in 7 days')).toBeTruthy();
  });

  it('has correct accessibilityLabel for Again button (1 day)', () => {
    const { getByLabelText } = render(
      <RatingRow skillProgress={MOCK_PROGRESS} onRate={() => {}} />,
      { wrapper: Wrapper }
    );
    expect(getByLabelText('Again, schedules review in 1 day')).toBeTruthy();
  });

  it('calls onRate with correct rating integer when Good is pressed', () => {
    const onRate = jest.fn();
    const { getByLabelText } = render(
      <RatingRow skillProgress={MOCK_PROGRESS} onRate={onRate} />,
      { wrapper: Wrapper }
    );
    fireEvent.press(getByLabelText('Good, schedules review in 7 days'));
    expect(onRate).toHaveBeenCalledWith(3);
  });

  it('calls onRate with 1 when Again is pressed', () => {
    const onRate = jest.fn();
    const { getByLabelText } = render(
      <RatingRow skillProgress={MOCK_PROGRESS} onRate={onRate} />,
      { wrapper: Wrapper }
    );
    fireEvent.press(getByLabelText('Again, schedules review in 1 day'));
    expect(onRate).toHaveBeenCalledWith(1);
  });

  it('has correct accessibilityLabel for Hard button (3 days)', () => {
    const { getByLabelText } = render(
      <RatingRow skillProgress={MOCK_PROGRESS} onRate={() => {}} />,
      { wrapper: Wrapper }
    );
    expect(getByLabelText('Hard, schedules review in 3 days')).toBeTruthy();
  });

  it('has correct accessibilityLabel for Easy button (21 days)', () => {
    const { getByLabelText } = render(
      <RatingRow skillProgress={MOCK_PROGRESS} onRate={() => {}} />,
      { wrapper: Wrapper }
    );
    expect(getByLabelText('Easy, schedules review in 21 days')).toBeTruthy();
  });

  it('calls onRate with 2 when Hard is pressed', () => {
    const onRate = jest.fn();
    const { getByLabelText } = render(
      <RatingRow skillProgress={MOCK_PROGRESS} onRate={onRate} />,
      { wrapper: Wrapper }
    );
    fireEvent.press(getByLabelText('Hard, schedules review in 3 days'));
    expect(onRate).toHaveBeenCalledWith(2);
  });

  it('calls onRate with 4 when Easy is pressed', () => {
    const onRate = jest.fn();
    const { getByLabelText } = render(
      <RatingRow skillProgress={MOCK_PROGRESS} onRate={onRate} />,
      { wrapper: Wrapper }
    );
    fireEvent.press(getByLabelText('Easy, schedules review in 21 days'));
    expect(onRate).toHaveBeenCalledWith(4);
  });

  it('renders fallback "—" labels when skillProgress is undefined', () => {
    const { getAllByText } = render(
      <RatingRow skillProgress={undefined} onRate={() => {}} />,
      { wrapper: Wrapper }
    );
    expect(getAllByText(/—/).length).toBe(4);
  });
});
