import { fsrs, createEmptyCard, Rating } from 'ts-fsrs';
import type { Grade, Card } from 'ts-fsrs';
import type { SkillProgressRow, SkillProgressUpdate, BulkInitResult } from './types';
import { State } from './types';

// Default FSRS instance with pretrained FSRS-5 weights
const f = fsrs({});

// Bulk-init FSRS instance — skips short-term learning steps so New→Review directly
const fBulk = fsrs({ enable_short_term: false });

function toCard(row: SkillProgressRow): Card {
  // Approximate last_review as (due - scheduled_days) for cards that have been reviewed.
  // ts-fsrs v5 uses last_review to compute elapsed_days internally; without it elapsed=0.
  const lastReview =
    row.reps > 0
      ? new Date(new Date(row.due).getTime() - row.scheduled_days * 24 * 60 * 60 * 1000)
      : undefined;
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    learning_steps: 0, // not persisted in V1; set 0 for non-learning-step cards
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: lastReview,
  };
}

function fromCard(card: Card): SkillProgressUpdate {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as number,
    due: card.due.toISOString(),
  };
}

function validateInput(row: SkillProgressRow | null | undefined, rating: number): boolean {
  if (!row) {
    const msg = '[scheduler] skillProgress is null or undefined';
    if (__DEV__) throw new Error(msg);
    console.error(msg);
    return false;
  }
  if (rating < 1 || rating > 4 || !Number.isInteger(rating)) {
    const msg = `[scheduler] Invalid rating: ${rating}. Must be 1–4.`;
    if (__DEV__) throw new Error(msg);
    console.error(msg);
    return false;
  }
  if (row.state < 0 || row.state > 3 || !Number.isInteger(row.state)) {
    const msg = `[scheduler] Invalid state: ${row.state}. Must be 0–3.`;
    if (__DEV__) throw new Error(msg);
    console.error(msg);
    return false;
  }
  if (!row.due || isNaN(new Date(row.due).getTime())) {
    const msg = `[scheduler] Invalid due date: ${row.due}`;
    if (__DEV__) throw new Error(msg);
    console.error(msg);
    return false;
  }
  return true;
}

export function schedule(
  row: SkillProgressRow,
  rating: Grade,
): SkillProgressUpdate | undefined {
  if (!validateInput(row, rating)) return undefined;
  const card = toCard(row);
  const result = f.next(card, new Date(), rating);
  return fromCard(result.card);
}

export function reschedule(
  row: SkillProgressRow,
  rating: Grade,
): SkillProgressUpdate | undefined {
  // Identical to schedule() — same logic, different semantic name
  return schedule(row, rating);
}

export function scheduleNew(
  skillId: number,
  rating: Grade,
): BulkInitResult {
  const now = new Date();
  const card = createEmptyCard(now);
  const result = f.next(card, now, rating);
  return { skill_id: skillId, ...fromCard(result.card) };
}

export function bulkInit(
  skillIds: number[],
  masteredAt: string,
): BulkInitResult[] {
  if (!masteredAt || isNaN(new Date(masteredAt).getTime())) {
    const msg = `[scheduler] Invalid masteredAt date: ${masteredAt}`;
    if (__DEV__) throw new Error(msg);
    console.error(msg);
    return [];
  }
  const now = new Date(masteredAt);
  return skillIds.map((skill_id) => {
    const card = createEmptyCard(now);
    const result = fBulk.next(card, now, Rating.Good);
    return {
      skill_id,
      ...fromCard(result.card),
    };
  });
}
