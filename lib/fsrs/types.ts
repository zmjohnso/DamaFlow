// lib/fsrs/types.ts
// Re-export ts-fsrs types used across DamaFlow + define DB-mapped aliases.
// Screens import from here, never from 'ts-fsrs' directly (architectural boundary).

export { Rating, State } from 'ts-fsrs';
export type { Grade, Card, CardInput, RecordLogItem } from 'ts-fsrs';

// Mirrors the skill_progress Drizzle schema row.
export type SkillProgressRow = {
  skill_id: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;   // 0–3, cast to/from State enum at scheduler boundary
  due: string;     // ISO 8601 TEXT
  mastered: boolean;
  mastered_at: string | null;
};

// Fields returned by schedule() / reschedule() — passed to updateSkillProgress() query helper.
export type SkillProgressUpdate = {
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  due: string;  // ISO 8601 TEXT
};

// Returned by bulkInit() — one entry per skill, ready for DB upsert.
export type BulkInitResult = { skill_id: number } & SkillProgressUpdate;
