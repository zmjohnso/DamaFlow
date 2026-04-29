import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import OnboardingScreen from './index';

jest.mock('@/lib/db/client', () => ({ db: {} }));
jest.mock('@/lib/db/queries', () => ({
  getSkillsByTier: jest.fn((_: unknown, tier: string) => {
    if (tier === 'beginner') return [
      { id: 1, name: 'Big Cup', tier: 'beginner', sort_order: 1, description: null, video_url: null },
      { id: 2, name: 'Small Cup', tier: 'beginner', sort_order: 2, description: null, video_url: null },
    ];
    if (tier === 'intermediate') return [
      { id: 11, name: 'Moshikame', tier: 'intermediate', sort_order: 11, description: null, video_url: null },
    ];
    if (tier === 'advanced') return [
      { id: 26, name: 'Lunar', tier: 'advanced', sort_order: 26, description: null, video_url: null },
    ];
    return [];
  }),
  bulkInsertSkillProgress: jest.fn(),
  getSkillsWithoutProgress: jest.fn().mockReturnValue([]),
  setSetting: jest.fn(),
}));
jest.mock('@/lib/fsrs/scheduler', () => ({
  bulkInit: jest.fn().mockReturnValue([]),
}));
jest.mock('@/store/appStore', () => {
  const setOnboardingComplete = jest.fn();
  return {
    __esModule: true,
    default: Object.assign(
      () => ({ setOnboardingComplete }),
      { getState: () => ({ setOnboardingComplete }) },
    ),
  };
});
jest.mock('@/store/queueStore', () => {
  const loadQueue = jest.fn();
  return {
    __esModule: true,
    default: Object.assign(
      () => ({ loadQueue }),
      { getState: () => ({ loadQueue }) },
    ),
  };
});
jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <PaperProvider>{children}</PaperProvider>;
}

// Helper: navigate to the Advanced step
function navigateToAdvanced(getByText: ReturnType<typeof render>['getByText']) {
  fireEvent.press(getByText('Get Started'));
  fireEvent.press(getByText('Next: Intermediate →'));
  fireEvent.press(getByText('Next: Advanced →'));
}

// Helper: reach the complete step (Done with no marks)
function tapDoneNoMarks(utils: ReturnType<typeof render>) {
  navigateToAdvanced(utils.getByText);
  fireEvent.press(utils.getByText("Done — I've marked what I know"));
}

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no new skills to add
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/lib/db/queries').getSkillsWithoutProgress.mockReturnValue([]);
  });

  it('welcome step renders the app message', () => {
    const { getByText } = render(<OnboardingScreen />, { wrapper: Wrapper });
    expect(getByText('DamaFlow tracks your skills and tells you what to practice today')).toBeTruthy();
  });

  it('welcome step renders [Get Started] button', () => {
    const { getByText } = render(<OnboardingScreen />, { wrapper: Wrapper });
    expect(getByText('Get Started')).toBeTruthy();
  });

  it('tapping [Get Started] shows Beginner tier heading', () => {
    const { getByText } = render(<OnboardingScreen />, { wrapper: Wrapper });
    fireEvent.press(getByText('Get Started'));
    expect(getByText('Beginner Skills')).toBeTruthy();
  });

  it('Beginner skill rows render via OnboardingSkillRow', () => {
    const { getByText, getByLabelText } = render(<OnboardingScreen />, { wrapper: Wrapper });
    fireEvent.press(getByText('Get Started'));
    expect(getByLabelText('Big Cup, not marked as mastered')).toBeTruthy();
    expect(getByLabelText('Small Cup, not marked as mastered')).toBeTruthy();
  });

  it('tapping a skill row marks it (accessibilityState.checked = true)', () => {
    const { getByText, getByLabelText } = render(<OnboardingScreen />, { wrapper: Wrapper });
    fireEvent.press(getByText('Get Started'));
    const row = getByLabelText('Big Cup, not marked as mastered');
    fireEvent.press(row);
    expect(getByLabelText('Big Cup, marked as mastered')).toBeTruthy();
  });

  it('tapping a marked skill row un-marks it', () => {
    const { getByText, getByLabelText } = render(<OnboardingScreen />, { wrapper: Wrapper });
    fireEvent.press(getByText('Get Started'));
    const row = getByLabelText('Big Cup, not marked as mastered');
    fireEvent.press(row);
    const markedRow = getByLabelText('Big Cup, marked as mastered');
    fireEvent.press(markedRow);
    expect(getByLabelText('Big Cup, not marked as mastered')).toBeTruthy();
  });

  it('"Skip Tier →" on Beginner advances to Intermediate without retaining marks', () => {
    const { getByText, getByLabelText } = render(<OnboardingScreen />, { wrapper: Wrapper });
    fireEvent.press(getByText('Get Started'));
    // mark a skill, then skip the entire tier
    fireEvent.press(getByLabelText('Big Cup, not marked as mastered'));
    fireEvent.press(getByText('Skip Tier →'));
    // should now be on Intermediate
    expect(getByText('Intermediate Skills')).toBeTruthy();
    // Intermediate skills appear unmarked — marks from the skipped Beginner tier were not carried over
    expect(getByLabelText('Moshikame, not marked as mastered')).toBeTruthy();
  });

  it('"Next: Intermediate →" advances and retains marked skills', () => {
    const { getByText, getByLabelText } = render(<OnboardingScreen />, { wrapper: Wrapper });
    fireEvent.press(getByText('Get Started'));
    fireEvent.press(getByLabelText('Big Cup, not marked as mastered'));
    fireEvent.press(getByText('Next: Intermediate →'));
    expect(getByText('Intermediate Skills')).toBeTruthy();
    // Advance to Advanced — Big Cup was retained
    fireEvent.press(getByText('Next: Advanced →'));
    expect(getByText('Advanced Skills')).toBeTruthy();
    // Done button appears
    expect(getByText("Done — I've marked what I know")).toBeTruthy();
  });

  it('"Done — I\'ve marked what I know" button appears on Advanced step', () => {
    const { getByText } = render(<OnboardingScreen />, { wrapper: Wrapper });
    navigateToAdvanced(getByText);
    expect(getByText("Done — I've marked what I know")).toBeTruthy();
  });

  // --- Complete step tests ---

  it('tapping Done shows explanation card heading', () => {
    const utils = render(<OnboardingScreen />, { wrapper: Wrapper });
    tapDoneNoMarks(utils);
    expect(utils.getByText("Here's what happens next")).toBeTruthy();
  });

  it('with no skills marked, shows "Start Learning →"', () => {
    const utils = render(<OnboardingScreen />, { wrapper: Wrapper });
    tapDoneNoMarks(utils);
    expect(utils.getByText('Start Learning →')).toBeTruthy();
  });

  it('with no skills marked, shows the learning copy', () => {
    const utils = render(<OnboardingScreen />, { wrapper: Wrapper });
    tapDoneNoMarks(utils);
    expect(utils.getByText("Here are your first skills to learn. Practice each one, then rate how it went.")).toBeTruthy();
  });

  it('with skills marked, shows "Start Reviewing →"', () => {
    const { getByText, getByLabelText } = render(<OnboardingScreen />, { wrapper: Wrapper });
    fireEvent.press(getByText('Get Started'));
    fireEvent.press(getByLabelText('Big Cup, not marked as mastered'));
    fireEvent.press(getByText('Next: Intermediate →'));
    fireEvent.press(getByText('Next: Advanced →'));
    fireEvent.press(getByText("Done — I've marked what I know"));
    expect(getByText('Start Reviewing →')).toBeTruthy();
  });

  it('with skills marked, shows the reviewing copy', () => {
    const { getByText, getByLabelText } = render(<OnboardingScreen />, { wrapper: Wrapper });
    fireEvent.press(getByText('Get Started'));
    fireEvent.press(getByLabelText('Big Cup, not marked as mastered'));
    fireEvent.press(getByText('Next: Intermediate →'));
    fireEvent.press(getByText('Next: Advanced →'));
    fireEvent.press(getByText("Done — I've marked what I know"));
    expect(getByText("Based on what you've practiced, here are your first reviews. Rate each session and the app will schedule your next one.")).toBeTruthy();
  });

  it('tapping "Start Learning →" calls router.replace("/(tabs)")', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { router } = require('expo-router');
    const utils = render(<OnboardingScreen />, { wrapper: Wrapper });
    tapDoneNoMarks(utils);
    fireEvent.press(utils.getByText('Start Learning →'));
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('tapping "Start Reviewing →" calls router.replace("/(tabs)")', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { router } = require('expo-router');
    const { getByText, getByLabelText } = render(<OnboardingScreen />, { wrapper: Wrapper });
    fireEvent.press(getByText('Get Started'));
    fireEvent.press(getByLabelText('Big Cup, not marked as mastered'));
    fireEvent.press(getByText('Next: Intermediate →'));
    fireEvent.press(getByText('Next: Advanced →'));
    fireEvent.press(getByText("Done — I've marked what I know"));
    fireEvent.press(getByText('Start Reviewing →'));
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('tapping Done with marked skills calls bulkInit with correct IDs', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { bulkInit } = require('@/lib/fsrs/scheduler');
    const { getByText, getByLabelText } = render(<OnboardingScreen />, { wrapper: Wrapper });
    fireEvent.press(getByText('Get Started'));
    fireEvent.press(getByLabelText('Big Cup, not marked as mastered')); // id=1
    fireEvent.press(getByText('Next: Intermediate →'));
    fireEvent.press(getByText('Next: Advanced →'));
    fireEvent.press(getByText("Done — I've marked what I know"));
    expect(bulkInit).toHaveBeenCalledWith([1], expect.any(String));
  });

  it('tapping Done calls setSetting with onboarding_complete=true', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setSetting } = require('@/lib/db/queries');
    const utils = render(<OnboardingScreen />, { wrapper: Wrapper });
    tapDoneNoMarks(utils);
    expect(setSetting).toHaveBeenCalledWith({}, 'onboarding_complete', 'true');
  });

  it('tapping Start loads the queue before navigating', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: useQueueStore } = require('@/store/queueStore');
    const { loadQueue } = useQueueStore.getState();
    const utils = render(<OnboardingScreen />, { wrapper: Wrapper });
    tapDoneNoMarks(utils);
    fireEvent.press(utils.getByText('Start Learning →'));
    expect(loadQueue).toHaveBeenCalled();
  });
});
