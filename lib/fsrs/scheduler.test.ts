import { schedule, reschedule, bulkInit } from './scheduler';
import { Rating, State } from './types';
import type { Grade } from './types';

const newRow = {
  skill_id: 1,
  stability: 0,
  difficulty: 0,
  elapsed_days: 0,
  scheduled_days: 0,
  reps: 0,
  lapses: 0,
  state: State.New, // 0
  due: new Date().toISOString(),
  mastered: false,
  mastered_at: null,
};

describe('schedule()', () => {
  it('returns non-New state for Good rating on New card', () => {
    const result = schedule(newRow, Rating.Good);
    expect(result).toBeDefined();
    expect(result!.state).not.toBe(State.New);
  });

  it('returns future due date for Good rating', () => {
    const result = schedule(newRow, Rating.Good);
    expect(new Date(result!.due).getTime()).toBeGreaterThan(Date.now() - 1000);
  });

  it.each<Grade>([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy])(
    'returns non-New state for rating %i',
    (rating) => {
      const result = schedule(newRow, rating);
      expect(result).toBeDefined();
      expect(result!.state).not.toBe(State.New);
    },
  );
});

describe('reschedule()', () => {
  const reviewRow = {
    skill_id: 2,
    stability: 10,
    difficulty: 5,
    elapsed_days: 10,
    scheduled_days: 10,
    reps: 5,
    lapses: 0,
    state: State.Review, // 2
    due: new Date().toISOString(),
    mastered: false,
    mastered_at: null,
  };

  it('increases stability on Good rating in Review state', () => {
    const result = reschedule(reviewRow, Rating.Good);
    expect(result!.stability).toBeGreaterThan(reviewRow.stability);
  });

  it('due date is later than previous due date', () => {
    const result = reschedule(reviewRow, Rating.Good);
    expect(new Date(result!.due).getTime()).toBeGreaterThan(new Date(reviewRow.due).getTime());
  });
});

describe('bulkInit()', () => {
  const masteredAt = new Date('2026-01-01T00:00:00.000Z').toISOString();

  it('returns one result per skill ID', () => {
    const results = bulkInit([1, 2, 3], masteredAt);
    expect(results).toHaveLength(3);
    expect(results.map(r => r.skill_id)).toEqual([1, 2, 3]);
  });

  it('all results have Review state', () => {
    const results = bulkInit([1, 2], masteredAt);
    results.forEach(r => expect(r.state).toBe(State.Review));
  });

  it('due date is after masteredAt', () => {
    const results = bulkInit([1], masteredAt);
    expect(new Date(results[0].due).getTime()).toBeGreaterThan(new Date(masteredAt).getTime());
  });

  it('all results have reps: 1 and lapses: 0', () => {
    const results = bulkInit([1], masteredAt);
    expect(results[0].reps).toBe(1);
    expect(results[0].lapses).toBe(0);
  });
});

describe('input validation', () => {
  const validRow = {
    skill_id: 1, stability: 0, difficulty: 0, elapsed_days: 0,
    scheduled_days: 0, reps: 0, lapses: 0, state: State.New,
    due: new Date().toISOString(), mastered: false, mastered_at: null,
  };

  it('throws with descriptive message in dev mode for invalid rating', () => {
    // __DEV__ is true in Jest (React Native)
    expect(() => schedule(validRow, 5 as any)).toThrow(/Invalid rating/);
  });

  it('returns undefined and logs silently in prod mode for invalid rating', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const originalDev = (global as any).__DEV__;
    (global as any).__DEV__ = false;
    try {
      const result = schedule(validRow, 5 as any);
      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Invalid rating/));
    } finally {
      (global as any).__DEV__ = originalDev;
      consoleSpy.mockRestore();
    }
  });

  it('throws with descriptive message in dev mode for null row', () => {
    expect(() => schedule(null as any, Rating.Good)).toThrow(/null or undefined/);
  });

  it('returns undefined and logs silently in prod mode for null row', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const originalDev = (global as any).__DEV__;
    (global as any).__DEV__ = false;
    try {
      const result = schedule(null as any, Rating.Good);
      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/null or undefined/));
    } finally {
      (global as any).__DEV__ = originalDev;
      consoleSpy.mockRestore();
    }
  });

  it('throws with descriptive message in dev mode for invalid state', () => {
    expect(() => schedule({ ...validRow, state: 99 }, Rating.Good)).toThrow(/Invalid state/);
  });

  it('returns undefined and logs silently in prod mode for invalid state', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const originalDev = (global as any).__DEV__;
    (global as any).__DEV__ = false;
    try {
      const result = schedule({ ...validRow, state: 99 }, Rating.Good);
      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Invalid state/));
    } finally {
      (global as any).__DEV__ = originalDev;
      consoleSpy.mockRestore();
    }
  });
});
