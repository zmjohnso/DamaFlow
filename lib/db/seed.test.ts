/**
 * @jest-environment node
 *
 * Uses better-sqlite3 (in-memory) + drizzle-orm/better-sqlite3 to test seed
 * logic without a real device or expo-sqlite native module.
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { SKILL_CATALOG } from '../../assets/skillCatalog';
import { seedSkillCatalog } from './seed';
import { skills } from './schema';
import * as schema from './schema';

function createTestDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });

  // Create all tables inline — matches the generated migration SQL
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      name TEXT NOT NULL,
      tier TEXT NOT NULL,
      description TEXT,
      video_url TEXT,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      name TEXT NOT NULL,
      notes TEXT,
      added_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS skill_progress (
      skill_id INTEGER PRIMARY KEY NOT NULL REFERENCES skills(id),
      stability REAL DEFAULT 0 NOT NULL,
      difficulty REAL DEFAULT 0 NOT NULL,
      elapsed_days REAL DEFAULT 0 NOT NULL,
      scheduled_days REAL DEFAULT 0 NOT NULL,
      reps INTEGER DEFAULT 0 NOT NULL,
      lapses INTEGER DEFAULT 0 NOT NULL,
      state INTEGER DEFAULT 0 NOT NULL,
      due TEXT NOT NULL,
      mastered INTEGER DEFAULT false NOT NULL,
      mastered_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      skill_id INTEGER NOT NULL REFERENCES skills(id),
      equipment_id INTEGER REFERENCES equipment(id),
      reps INTEGER,
      self_rating INTEGER NOT NULL,
      logged_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS string_replacements (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      equipment_id INTEGER NOT NULL REFERENCES equipment(id),
      replaced_at TEXT NOT NULL,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  return db;
}

describe('seedSkillCatalog', () => {
  it('inserts all SKILL_CATALOG entries on first launch', () => {
    const db = createTestDb();
    seedSkillCatalog(db);

    const rows = db.select().from(skills).all();
    expect(rows).toHaveLength(SKILL_CATALOG.length);
    expect(rows.length).toBeGreaterThanOrEqual(40);
  });

  it('inserts skills in the correct tier distribution', () => {
    const db = createTestDb();
    seedSkillCatalog(db);

    const beginners = db.select().from(skills).all().filter((s) => s.tier === 'beginner');
    const intermediates = db.select().from(skills).all().filter((s) => s.tier === 'intermediate');
    const advanced = db.select().from(skills).all().filter((s) => s.tier === 'advanced');

    expect(beginners.length).toBe(10);
    expect(intermediates.length).toBe(15);
    expect(advanced.length).toBe(17);
  });

  it('is idempotent — running twice produces same row count', () => {
    const db = createTestDb();
    seedSkillCatalog(db);
    seedSkillCatalog(db);

    const rows = db.select().from(skills).all();
    expect(rows).toHaveLength(SKILL_CATALOG.length);
  });

  it('skips seeding when skills already exist (crash-safe idempotency)', () => {
    const db = createTestDb();

    // Simulate skills already inserted (e.g., previous launch seeded successfully)
    seedSkillCatalog(db);
    const countAfterFirst = db.select().from(skills).all().length;

    // Second call must be a no-op
    seedSkillCatalog(db);
    const countAfterSecond = db.select().from(skills).all().length;

    expect(countAfterFirst).toBe(countAfterSecond);
  });

  it('does not insert any skill_progress rows', () => {
    const db = createTestDb();
    seedSkillCatalog(db);

    const progressRows = db.select().from(schema.skill_progress).all();
    expect(progressRows).toHaveLength(0);
  });

  it('does not write to the settings table', () => {
    const db = createTestDb();
    seedSkillCatalog(db);

    const settingRows = db.select().from(schema.settings).all();
    expect(settingRows).toHaveLength(0);
  });
});
