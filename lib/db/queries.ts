import { and, asc, count, desc, eq, gte, isNull, lt, lte } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { equipment, sessions, settings, skill_progress, skills, string_replacements } from './schema';
import type * as schema from './schema';
import type { SkillProgressUpdate } from '../fsrs/types';

// Accepts BaseSQLiteDatabase so helpers are testable with both expo-sqlite
// (ExpoSQLiteDatabase) and better-sqlite3 (BetterSQLite3Database) adapters.
type DB = BaseSQLiteDatabase<'sync', any, typeof schema>;

// Infer the row type from the schema so callers get full TypeScript support.
export type Skill = typeof skills.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type EquipmentRow = typeof equipment.$inferSelect;
export type StringReplacementRow = typeof string_replacements.$inferSelect;

// Returns all skills ordered by sort_order ascending.
export function getAllSkills(db: DB): Skill[] {
  return db.select().from(skills).orderBy(asc(skills.sort_order)).all();
}

// Returns skills for a single tier, ordered by sort_order.
export function getSkillsByTier(
  db: DB,
  tier: 'beginner' | 'intermediate' | 'advanced',
): Skill[] {
  return db
    .select()
    .from(skills)
    .where(eq(skills.tier, tier))
    .orderBy(asc(skills.sort_order))
    .all();
}

// Returns a single skill by id, or undefined if not found.
export function getSkillById(db: DB, id: number): Skill | undefined {
  const rows = db.select().from(skills).where(eq(skills.id, id)).limit(1).all();
  return rows[0];
}

// Returns the value for a settings key, or undefined if the key does not exist.
export function getSetting(db: DB, key: string): string | undefined {
  const rows = db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1)
    .all();
  return rows[0]?.value;
}

// Upserts a key/value pair into the settings table.
export function setSetting(db: DB, key: string, value: string): void {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

// Returns the new_skill_cap setting as a number, defaulting to 5 and clamped to 1–20.
export function getNewSkillCap(db: DB): number {
  const raw = getSetting(db, 'new_skill_cap');
  if (raw === undefined) return 5;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) return 5;
  return Math.max(1, Math.min(20, parsed));
}

// Shape returned by getQueueRows() — exported for use by queueStore.ts.
export type QueueRow = {
  skill_id: number;
  skill_name: string;
  tier: string;
  due: string;
  state: number;
};

// Minimal equipment shape for picker UI.
export type EquipmentPickerItem = {
  id: number;
  name: string;
};

// Session row with joined equipment name for history display.
export type SessionWithEquipment = SessionRow & {
  equipment_name: string | null;
};

// Skills with mastery state — includes all skills even if no skill_progress row exists.
export type SkillWithMastery = Skill & { mastered: boolean };

export function getSkillsWithMastery(db: DB): SkillWithMastery[] {
  const rows = db
    .select({
      id: skills.id,
      name: skills.name,
      tier: skills.tier,
      description: skills.description,
      video_url: skills.video_url,
      sort_order: skills.sort_order,
      mastered: skill_progress.mastered,
    })
    .from(skills)
    .leftJoin(skill_progress, eq(skills.id, skill_progress.skill_id))
    .orderBy(asc(skills.sort_order))
    .all();
  return rows.map(row => ({ ...row, mastered: row.mastered ?? false }));
}

// Row shape accepted by bulkInsertSkillProgress — matches BulkInitResult from lib/fsrs/types.ts.
type SkillProgressInsert = {
  skill_id: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  due: string;
};

// Bulk-inserts rows into skill_progress. Idempotent: uses onConflictDoUpdate so re-running is safe.
// Runs inside a single transaction so a crash mid-batch leaves no partial writes.
export function bulkInsertSkillProgress(db: DB, rows: SkillProgressInsert[]): void {
  if (rows.length === 0) return;
  db.transaction((tx) => {
    for (const row of rows) {
      tx.insert(skill_progress)
        .values({
          skill_id: row.skill_id,
          stability: row.stability,
          difficulty: row.difficulty,
          elapsed_days: row.elapsed_days,
          scheduled_days: row.scheduled_days,
          reps: row.reps,
          lapses: row.lapses,
          state: row.state,
          due: row.due,
          mastered: false,
        })
        .onConflictDoUpdate({
          target: skill_progress.skill_id,
          set: {
            stability: row.stability,
            difficulty: row.difficulty,
            elapsed_days: row.elapsed_days,
            scheduled_days: row.scheduled_days,
            reps: row.reps,
            lapses: row.lapses,
            state: row.state,
            due: row.due,
          },
        })
        .run();
    }
  });
}

// Returns up to `limit` skills in `tier` that have no skill_progress row.
// Used during onboarding to populate the queue with New-state skills for first-time players.
export function getSkillsWithoutProgress(db: DB, tier: string, limit: number): Skill[] {
  return db
    .select({
      id: skills.id,
      name: skills.name,
      tier: skills.tier,
      description: skills.description,
      video_url: skills.video_url,
      sort_order: skills.sort_order,
    })
    .from(skills)
    .leftJoin(skill_progress, eq(skills.id, skill_progress.skill_id))
    .where(and(eq(skills.tier, tier), isNull(skill_progress.skill_id)))
    .orderBy(asc(skills.sort_order))
    .limit(limit)
    .all();
}

// Returns the number of skills with mastered = true.
export function getMasteredCount(db: DB): number {
  const result = db
    .select({ value: count() })
    .from(skill_progress)
    .where(eq(skill_progress.mastered, true))
    .get();
  return result?.value ?? 0;
}

// Returns the number of sessions logged in the 7-day window starting at weekStart (inclusive).
// weekStart is an ISO 8601 string (e.g., '2026-04-13T00:00:00.000Z').
export function getSessionsThisWeek(db: DB, weekStart: string): number {
  const start = new Date(weekStart);
  if (Number.isNaN(start.getTime())) return 0;
  const weekEnd = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const result = db
    .select({ value: count() })
    .from(sessions)
    .where(and(gte(sessions.logged_at, weekStart), lt(sessions.logged_at, weekEnd)))
    .get();
  return result?.value ?? 0;
}

// Returns the full skill_progress row for a given skill, or undefined if no row exists.
// Used by practice screen to display "Next review: [date]" metadata.
export function getSkillProgressById(
  db: DB,
  skillId: number,
): typeof skill_progress.$inferSelect | undefined {
  const rows = db
    .select()
    .from(skill_progress)
    .where(eq(skill_progress.skill_id, skillId))
    .limit(1)
    .all();
  return rows[0];
}

// Returns the most recent session for a skill (by logged_at DESC), or undefined if none.
// Used by practice screen to display "Last practiced X days ago" subtitle.
export function getLastSession(
  db: DB,
  skillId: number,
): { logged_at: string } | undefined {
  const rows = db
    .select({ logged_at: sessions.logged_at })
    .from(sessions)
    .where(eq(sessions.skill_id, skillId))
    .orderBy(desc(sessions.logged_at))
    .limit(1)
    .all();
  return rows[0];
}

// Updates FSRS scheduling fields on an existing skill_progress row.
// Does NOT touch mastered or mastered_at — mastery is managed separately (Story 4.8).
export function updateSkillProgress(
  db: DB,
  skillId: number,
  update: SkillProgressUpdate,
): void {
  db.update(skill_progress)
    .set({
      stability: update.stability,
      difficulty: update.difficulty,
      elapsed_days: update.elapsed_days,
      scheduled_days: update.scheduled_days,
      reps: update.reps,
      lapses: update.lapses,
      state: update.state,
      due: update.due,
    })
    .where(eq(skill_progress.skill_id, skillId))
    .run();
}

// Inserts a new practice session. equipment_id is optional (nullable FK).
export function insertSession(
  db: DB,
  session: {
    skill_id: number;
    equipment_id?: number | null;
    reps: number | null;
    self_rating: number;
    logged_at: string;
  },
): void {
  db.insert(sessions)
    .values({
      skill_id: session.skill_id,
      equipment_id: session.equipment_id ?? null,
      reps: session.reps ?? null,
      self_rating: session.self_rating,
      logged_at: session.logged_at,
    })
    .run();
}

// Updates reps and self_rating for an existing session. Used by edit flow (Story 4.7).
export function updateSession(
  db: DB,
  sessionId: number,
  update: { reps: number | null; self_rating: 1 | 2 | 3 | 4 },
): void {
  db.update(sessions)
    .set({ reps: update.reps, self_rating: update.self_rating })
    .where(eq(sessions.id, sessionId))
    .run();
}

// Deletes a session by id. Used by delete flow (Story 4.7).
export function deleteSession(db: DB, sessionId: number): void {
  db.delete(sessions).where(eq(sessions.id, sessionId)).run();
}

// Sets the mastered flag and mastered_at timestamp on an existing skill_progress row.
// For the no-row case, caller must call bulkInsertSkillProgress first (Story 4.8).
export function setSkillMastered(db: DB, skillId: number, mastered: boolean): void {
  db.update(skill_progress)
    .set({ mastered, mastered_at: mastered ? new Date().toISOString() : null })
    .where(eq(skill_progress.skill_id, skillId))
    .run();
}

// Returns all sessions for a skill sorted most-recent first.
export function getSessionsForSkill(db: DB, skillId: number): SessionRow[] {
  return db
    .select()
    .from(sessions)
    .where(eq(sessions.skill_id, skillId))
    .orderBy(desc(sessions.logged_at))
    .all();
}

// Returns all sessions for a skill with joined equipment name, sorted most-recent first.
export function getSessionsForSkillWithEquipment(
  db: DB,
  skillId: number,
): SessionWithEquipment[] {
  const rows = db
    .select({
      id: sessions.id,
      skill_id: sessions.skill_id,
      equipment_id: sessions.equipment_id,
      reps: sessions.reps,
      self_rating: sessions.self_rating,
      logged_at: sessions.logged_at,
      equipment_name: equipment.name,
    })
    .from(sessions)
    .leftJoin(equipment, eq(sessions.equipment_id, equipment.id))
    .where(eq(sessions.skill_id, skillId))
    .orderBy(desc(sessions.logged_at))
    .all();
  return rows.map((row) => ({
    id: row.id,
    skill_id: row.skill_id,
    equipment_id: row.equipment_id,
    reps: row.reps,
    self_rating: row.self_rating,
    logged_at: row.logged_at,
    equipment_name: row.equipment_name ?? null,
  }));
}

// Returns all skill_progress rows with due <= today, joined with skills.
// `today` is a 'YYYY-MM-DD' string. ISO 8601 comparison is lexicographic — safe for TEXT columns.
// Mastery does not exempt a skill from scheduled reviews (Story 4.8).
export function getQueueRows(db: DB, today: string): QueueRow[] {
  return db
    .select({
      skill_id: skill_progress.skill_id,
      skill_name: skills.name,
      tier: skills.tier,
      due: skill_progress.due,
      state: skill_progress.state,
    })
    .from(skill_progress)
    .innerJoin(skills, eq(skill_progress.skill_id, skills.id))
    .where(lte(skill_progress.due, today))
    .all();
}

// Returns mastery counts per tier: total skills and mastered count.
// Uses getSkillsWithMastery (existing LEFT JOIN) and reduces in JS — optimal for 40-row catalog.
export function getTierMasteryCounts(
  db: DB,
): { tier: string; mastered: number; total: number }[] {
  const rows = getSkillsWithMastery(db);
  const counts = [
    { tier: 'beginner', mastered: 0, total: 0 },
    { tier: 'intermediate', mastered: 0, total: 0 },
    { tier: 'advanced', mastered: 0, total: 0 },
  ];
  for (const skill of rows) {
    const entry = counts.find(c => c.tier === skill.tier);
    if (entry) {
      entry.total++;
      if (skill.mastered) entry.mastered++;
    }
  }
  return counts;
}

export type OverdueMasteredSkill = {
  skill_id: number;
  skill_name: string;
  tier: string;
  due: string;
};

// Returns mastered skills with a due date strictly before today.
// `today` is a 'YYYY-MM-DD' string. Lexicographic comparison is safe for TEXT ISO 8601 columns.
// Sorted by due ASC so most overdue skills appear first.
export function getOverdueMasteredSkills(
  db: DB,
  today: string,
): OverdueMasteredSkill[] {
  return db
    .select({
      skill_id: skill_progress.skill_id,
      skill_name: skills.name,
      tier: skills.tier,
      due: skill_progress.due,
    })
    .from(skill_progress)
    .innerJoin(skills, eq(skill_progress.skill_id, skills.id))
    .where(and(eq(skill_progress.mastered, true), lt(skill_progress.due, today)))
    .orderBy(asc(skill_progress.due))
    .all();
}

// ── Equipment queries ───────────────────────────────────────────────────────

// Returns all equipment rows ordered by added_at DESC (most recently added first).
export function getAllEquipment(db: DB): EquipmentRow[] {
  return db.select().from(equipment).orderBy(desc(equipment.added_at)).all();
}

// Returns minimal equipment rows for picker UI (id + name only), ordered by added_at DESC.
export function getAllEquipmentForPicker(db: DB): EquipmentPickerItem[] {
  return db
    .select({ id: equipment.id, name: equipment.name })
    .from(equipment)
    .orderBy(desc(equipment.added_at))
    .all();
}

// Returns a single equipment row by id, or undefined if not found.
export function getEquipmentById(db: DB, id: number): EquipmentRow | undefined {
  const rows = db.select().from(equipment).where(eq(equipment.id, id)).limit(1).all();
  return rows[0];
}

// Returns the number of string replacements for a given equipment id.
export function getStringReplacementCount(db: DB, equipmentId: number): number {
  const result = db
    .select({ value: count() })
    .from(string_replacements)
    .where(eq(string_replacements.equipment_id, equipmentId))
    .get();
  return result?.value ?? 0;
}

export type EquipmentWithCount = EquipmentRow & { replacementCount: number };

// Returns all equipment rows with their string-replacement counts in a single query.
export function getAllEquipmentWithReplacementCount(db: DB): EquipmentWithCount[] {
  const rows = db
    .select({
      id: equipment.id,
      name: equipment.name,
      notes: equipment.notes,
      purchase_date: equipment.purchase_date,
      added_at: equipment.added_at,
      replacementCount: count(string_replacements.id),
    })
    .from(equipment)
    .leftJoin(string_replacements, eq(equipment.id, string_replacements.equipment_id))
    .groupBy(equipment.id)
    .orderBy(desc(equipment.added_at))
    .all();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    notes: row.notes,
    purchase_date: row.purchase_date,
    added_at: row.added_at,
    replacementCount: Number(row.replacementCount),
  }));
}

// Inserts a new equipment row.
export function insertEquipment(
  db: DB,
  row: {
    name: string;
    notes?: string | null;
    purchase_date?: string | null;
    added_at: string;
  },
): void {
  db.insert(equipment)
    .values({
      name: row.name,
      notes: row.notes ?? null,
      purchase_date: row.purchase_date ?? null,
      added_at: row.added_at,
    })
    .run();
}

// Updates an existing equipment row. Only provided fields are updated.
// No-ops if the update object is empty.
export function updateEquipment(
  db: DB,
  id: number,
  update: {
    name?: string;
    notes?: string | null;
    purchase_date?: string | null;
  },
): void {
  const payload: Partial<typeof equipment.$inferInsert> = {};
  if (update.name !== undefined) payload.name = update.name;
  if (update.notes !== undefined) payload.notes = update.notes;
  if (update.purchase_date !== undefined) payload.purchase_date = update.purchase_date;
  if (Object.keys(payload).length === 0) return;
  db.update(equipment)
    .set(payload)
    .where(eq(equipment.id, id))
    .run();
}

// Deletes an equipment row by id. Also deletes related string_replacements
// and nulls sessions.equipment_id first because the FKs are defined as ON DELETE no action.
// Session history is preserved (Story 6.5).
export function deleteEquipment(db: DB, id: number): void {
  db.transaction((tx) => {
    tx.update(sessions)
      .set({ equipment_id: null })
      .where(eq(sessions.equipment_id, id))
      .run();
    tx.delete(string_replacements).where(eq(string_replacements.equipment_id, id)).run();
    tx.delete(equipment).where(eq(equipment.id, id)).run();
  });
}

// ── String replacement queries ──────────────────────────────────────────────

// Returns all string replacements for a given equipment id, ordered by replaced_at DESC.
export function getStringReplacementsForEquipment(db: DB, equipmentId: number): StringReplacementRow[] {
  return db
    .select()
    .from(string_replacements)
    .where(eq(string_replacements.equipment_id, equipmentId))
    .orderBy(desc(string_replacements.replaced_at))
    .all();
}

// Inserts a new string replacement row.
export function insertStringReplacement(
  db: DB,
  row: {
    equipment_id: number;
    replaced_at: string;
    notes?: string | null;
  },
): void {
  db.insert(string_replacements)
    .values({
      equipment_id: row.equipment_id,
      replaced_at: row.replaced_at,
      notes: row.notes ?? null,
    })
    .run();
}

// Deletes a single string replacement row by id.
export function deleteStringReplacement(db: DB, id: number): void {
  db.delete(string_replacements).where(eq(string_replacements.id, id)).run();
}

// Resets all user data while preserving the skills catalog seed.
// Can be reused by the root error boundary for corruption recovery (NFR13).
// Deletion order respects FK constraints (children before parents).
export function resetAllData(db: DB): void {
  db.transaction((tx) => {
    tx.delete(string_replacements).run();
    tx.delete(sessions).run();
    tx.delete(skill_progress).run();
    tx.delete(equipment).run();
    tx.delete(settings).run();
  });
}
