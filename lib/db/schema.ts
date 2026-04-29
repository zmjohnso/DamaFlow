import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Table order matters: referenced tables must be defined before their dependents.

export const skills = sqliteTable('skills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  tier: text('tier').notNull(), // 'beginner' | 'intermediate' | 'advanced'
  description: text('description'),
  video_url: text('video_url'),
  sort_order: integer('sort_order').notNull(),
});

export const equipment = sqliteTable('equipment', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  notes: text('notes'),
  purchase_date: text('purchase_date'), // ISO 8601 string, nullable
  added_at: text('added_at').notNull(), // ISO 8601 string
});

// One row per skill — holds FSRS scheduling state.
export const skill_progress = sqliteTable('skill_progress', {
  skill_id: integer('skill_id').primaryKey().references(() => skills.id),
  stability: real('stability').notNull().default(0),
  difficulty: real('difficulty').notNull().default(0),
  elapsed_days: real('elapsed_days').notNull().default(0),
  scheduled_days: real('scheduled_days').notNull().default(0),
  reps: integer('reps').notNull().default(0),
  lapses: integer('lapses').notNull().default(0),
  // FSRS state integer: 0=New, 1=Learning, 2=Review, 3=Relearning
  state: integer('state').notNull().default(0),
  due: text('due').notNull(), // ISO 8601 string
  // Stored as 0/1; Drizzle maps to TS boolean automatically
  mastered: integer('mastered', { mode: 'boolean' }).notNull().default(false),
  mastered_at: text('mastered_at'), // ISO 8601 string, nullable
});

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  skill_id: integer('skill_id').notNull().references(() => skills.id),
  equipment_id: integer('equipment_id').references(() => equipment.id), // nullable
  reps: integer('reps'), // nullable — rep tracking is optional per UX
  // Self-rating: 1=Again, 2=Hard, 3=Good, 4=Easy (matches ts-fsrs Rating enum)
  self_rating: integer('self_rating').notNull(),
  logged_at: text('logged_at').notNull(), // ISO 8601 string
});

export const string_replacements = sqliteTable('string_replacements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  equipment_id: integer('equipment_id').notNull().references(() => equipment.id),
  replaced_at: text('replaced_at').notNull(), // ISO 8601 string
  notes: text('notes'),
});

// Simple key/value store for app settings (e.g., onboarding_complete, notification_enabled).
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
