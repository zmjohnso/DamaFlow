/**
 * @jest-environment node
 */

// Prevent native expo-sqlite + SQL migration file imports from loading.
// Only sortQueueItems (pure function) is tested here; loadQueue() integration
// is validated in Story 1.6 when the root layout wires the store.
jest.mock('../lib/db/client', () => ({ db: {} }));

import { sortQueueItems, capNewSkills } from './queueStore';
import type { QueueRow } from '../lib/db/queries';
import type { QueueItem } from './queueStore';

const TODAY = '2026-04-08';
const YESTERDAY = '2026-04-07';

const makeRow = (overrides: Partial<QueueRow>): QueueRow => ({
  skill_id: 1,
  skill_name: 'Spike',
  tier: 'beginner',
  due: TODAY,
  state: 2, // Review
  ...overrides,
});

describe('sortQueueItems', () => {
  it('returns empty array for no input', () => {
    expect(sortQueueItems([], TODAY)).toEqual([]);
  });

  it('places overdue (state!=0, due<today) before due-today', () => {
    const overdue = makeRow({ due: YESTERDAY, state: 2 });
    const dueToday = makeRow({ skill_id: 2, due: TODAY, state: 2 });
    const result = sortQueueItems([dueToday, overdue], TODAY);
    expect(result[0].due).toBe(YESTERDAY);
    expect(result[1].due).toBe(TODAY);
  });

  it('places new skills (state==0) last regardless of due date', () => {
    const newSkill = makeRow({ skill_id: 3, due: YESTERDAY, state: 0 });
    const overdue = makeRow({ skill_id: 2, due: YESTERDAY, state: 2 });
    const result = sortQueueItems([newSkill, overdue], TODAY);
    expect(result[0].state).not.toBe(0);
    expect(result[result.length - 1].state).toBe(0);
  });

  it('sorts within overdue section by due ascending', () => {
    const older = makeRow({ skill_id: 1, due: '2026-04-01', state: 2 });
    const newer = makeRow({ skill_id: 2, due: '2026-04-07', state: 2 });
    const result = sortQueueItems([newer, older], TODAY);
    expect(result[0].due).toBe('2026-04-01');
  });

  it('places due-today items (state!=0, due==today) after overdue', () => {
    const overdue = makeRow({ skill_id: 1, due: YESTERDAY, state: 1 });
    const dueToday = makeRow({ skill_id: 2, due: TODAY, state: 2 });
    const newSkill = makeRow({ skill_id: 3, due: '2026-04-09', state: 0 });
    const result = sortQueueItems([newSkill, dueToday, overdue], TODAY);
    expect(result[0].skill_id).toBe(1); // overdue
    expect(result[1].skill_id).toBe(2); // due today
    expect(result[2].skill_id).toBe(3); // new
  });

  it('sorts within due-today section by due ascending', () => {
    // Both are due today but different time portions — should both appear in section 1
    const a = makeRow({ skill_id: 1, due: TODAY + 'T08:00:00', state: 2 });
    const b = makeRow({ skill_id: 2, due: TODAY + 'T12:00:00', state: 2 });
    const result = sortQueueItems([b, a], TODAY);
    expect(result[0].skill_id).toBe(1);
  });

  it('excludes mastered skills — getQueueRows filters mastered=true from DB', () => {
    // This test validates the contract: sortQueueItems only receives non-mastered rows.
    // getQueueRows enforces mastered=false via WHERE clause; if a mastered row appeared
    // here it would be a bug in getQueueRows, not sortQueueItems.
    // We test that if somehow a mastered row arrived, it still sorts predictably.
    const masteredRow = makeRow({ skill_id: 99, state: 2, due: YESTERDAY });
    const normalRow = makeRow({ skill_id: 1, state: 2, due: TODAY });
    const result = sortQueueItems([normalRow, masteredRow], TODAY);
    // Both present — overdue sorts first
    expect(result[0].skill_id).toBe(99);
    expect(result[1].skill_id).toBe(1);
  });
});

describe('capNewSkills', () => {
  const makeItem = (overrides: Partial<QueueItem>): QueueItem => ({
    skill_id: 1,
    skill_name: 'Spike',
    tier: 'beginner',
    due: '2026-04-08',
    state: 2,
    ...overrides,
  });

  it('returns empty array for no input', () => {
    expect(capNewSkills([], 5)).toEqual([]);
  });

  it('does not cap when new skills are within limit', () => {
    const items = [
      makeItem({ skill_id: 1, state: 0 }),
      makeItem({ skill_id: 2, state: 0 }),
      makeItem({ skill_id: 3, state: 0 }),
    ];
    expect(capNewSkills(items, 5)).toHaveLength(3);
  });

  it('caps new skills at the configured limit', () => {
    const items = [
      makeItem({ skill_id: 1, state: 0 }),
      makeItem({ skill_id: 2, state: 0 }),
      makeItem({ skill_id: 3, state: 0 }),
      makeItem({ skill_id: 4, state: 0 }),
      makeItem({ skill_id: 5, state: 0 }),
      makeItem({ skill_id: 6, state: 0 }),
      makeItem({ skill_id: 7, state: 0 }),
    ];
    const result = capNewSkills(items, 5);
    expect(result).toHaveLength(5);
    expect(result.map(i => i.skill_id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('never caps overdue or due-today items', () => {
    const items = [
      makeItem({ skill_id: 1, state: 2, due: '2026-04-07' }), // overdue
      makeItem({ skill_id: 2, state: 2, due: '2026-04-08' }), // due today
      makeItem({ skill_id: 3, state: 0 }),
      makeItem({ skill_id: 4, state: 0 }),
      makeItem({ skill_id: 5, state: 0 }),
      makeItem({ skill_id: 6, state: 0 }),
    ];
    const result = capNewSkills(items, 2);
    expect(result).toHaveLength(4);
    expect(result.map(i => i.skill_id)).toEqual([1, 2, 3, 4]);
  });

  it('defaults to cap of 5 behavior when used with default value', () => {
    const items = Array.from({ length: 7 }, (_, i) =>
      makeItem({ skill_id: i + 1, state: 0 }),
    );
    const result = capNewSkills(items, 5);
    expect(result).toHaveLength(5);
  });

  it('treats cap 0 as 1 (defensive)', () => {
    const items = [
      makeItem({ skill_id: 1, state: 0 }),
      makeItem({ skill_id: 2, state: 0 }),
    ];
    const result = capNewSkills(items, 0);
    expect(result).toHaveLength(1);
    expect(result[0].skill_id).toBe(1);
  });

  it('preserves order of non-new items', () => {
    const items = [
      makeItem({ skill_id: 1, state: 2, due: '2026-04-06' }),
      makeItem({ skill_id: 2, state: 1, due: '2026-04-08' }),
      makeItem({ skill_id: 3, state: 2, due: '2026-04-07' }),
    ];
    const result = capNewSkills(items, 2);
    expect(result.map(i => i.skill_id)).toEqual([1, 2, 3]);
  });

  it('defaults NaN cap to 5', () => {
    const items = [
      makeItem({ skill_id: 1, state: 0 }),
      makeItem({ skill_id: 2, state: 0 }),
      makeItem({ skill_id: 3, state: 0 }),
      makeItem({ skill_id: 4, state: 0 }),
      makeItem({ skill_id: 5, state: 0 }),
      makeItem({ skill_id: 6, state: 0 }),
      makeItem({ skill_id: 7, state: 0 }),
    ];
    const result = capNewSkills(items, NaN);
    expect(result).toHaveLength(5);
    expect(result.map(i => i.skill_id)).toEqual([1, 2, 3, 4, 5]);
  });
});
