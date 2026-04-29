import useSessionStore from './sessionStore';

// Reset store between tests
const initialState = { currentSkillId: null, reps: null, pendingRating: null };

beforeEach(() => {
  useSessionStore.setState(initialState);
});

describe('sessionStore', () => {
  it('initial state has null values', () => {
    const { currentSkillId, reps, pendingRating } = useSessionStore.getState();
    expect(currentSkillId).toBeNull();
    expect(reps).toBeNull();
    expect(pendingRating).toBeNull();
  });

  it('setCurrentSkill sets currentSkillId', () => {
    useSessionStore.getState().setCurrentSkill(42);
    expect(useSessionStore.getState().currentSkillId).toBe(42);
  });

  it('setReps sets reps', () => {
    useSessionStore.getState().setReps(10);
    expect(useSessionStore.getState().reps).toBe(10);
  });

  it('setPendingRating sets pendingRating', () => {
    useSessionStore.getState().setPendingRating(3);
    expect(useSessionStore.getState().pendingRating).toBe(3);
  });

  it('clearSession resets all state', () => {
    useSessionStore.getState().setCurrentSkill(42);
    useSessionStore.getState().setReps(10);
    useSessionStore.getState().setPendingRating(3);
    useSessionStore.getState().clearSession();
    const { currentSkillId, reps, pendingRating } = useSessionStore.getState();
    expect(currentSkillId).toBeNull();
    expect(reps).toBeNull();
    expect(pendingRating).toBeNull();
  });
});
