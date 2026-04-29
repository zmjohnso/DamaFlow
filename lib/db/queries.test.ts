/**
 * @jest-environment node
 *
 * Uses better-sqlite3 (in-memory) + drizzle-orm/better-sqlite3 to test query
 * helpers without a real device or expo-sqlite native module.
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { SKILL_CATALOG } from '../../assets/skillCatalog';
import {
  getAllSkills, getSkillById, getSkillsByTier, getSetting, setSetting, getSkillsWithMastery,
  bulkInsertSkillProgress, getSkillsWithoutProgress, getMasteredCount, getSessionsThisWeek,
  getAllEquipment, getEquipmentById, getStringReplacementCount, insertEquipment,
  updateEquipment, deleteEquipment, getAllEquipmentWithReplacementCount,
  getStringReplacementsForEquipment, insertStringReplacement, deleteStringReplacement,
  getAllEquipmentForPicker, getSessionsForSkillWithEquipment, resetAllData,
} from './queries';
import { skills } from './schema';
import * as schema from './schema';

function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const db = drizzle(sqlite, { schema });

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
      purchase_date TEXT,
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

  // Pre-populate skills for query tests
  for (const skill of SKILL_CATALOG) {
    db.insert(skills).values(skill).run();
  }

  return db;
}

describe('getAllSkills', () => {
  it('returns all 42 skills', () => {
    const db = createTestDb();
    const result = getAllSkills(db);
    expect(result).toHaveLength(42);
  });

  it('returns skills ordered by sort_order ascending', () => {
    const db = createTestDb();
    const result = getAllSkills(db);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].sort_order).toBeGreaterThan(result[i - 1].sort_order);
    }
  });

  it('returns empty array when no skills exist', () => {
    const sqlite = new Database(':memory:');
    const db = drizzle(sqlite, { schema });
    sqlite.exec(`CREATE TABLE IF NOT EXISTS skills (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, name TEXT NOT NULL, tier TEXT NOT NULL, description TEXT, video_url TEXT, sort_order INTEGER NOT NULL);`);
    const result = getAllSkills(db);
    expect(result).toHaveLength(0);
  });
});

describe('getSkillsByTier', () => {
  it('returns only beginner skills', () => {
    const db = createTestDb();
    const result = getSkillsByTier(db, 'beginner');
    expect(result).toHaveLength(10);
    expect(result.every((s) => s.tier === 'beginner')).toBe(true);
  });

  it('returns only intermediate skills', () => {
    const db = createTestDb();
    const result = getSkillsByTier(db, 'intermediate');
    expect(result).toHaveLength(15);
    expect(result.every((s) => s.tier === 'intermediate')).toBe(true);
  });

  it('returns only advanced skills', () => {
    const db = createTestDb();
    const result = getSkillsByTier(db, 'advanced');
    expect(result).toHaveLength(17);
    expect(result.every((s) => s.tier === 'advanced')).toBe(true);
  });

  it('returns skills ordered by sort_order', () => {
    const db = createTestDb();
    const result = getSkillsByTier(db, 'beginner');
    for (let i = 1; i < result.length; i++) {
      expect(result[i].sort_order).toBeGreaterThan(result[i - 1].sort_order);
    }
  });
});

describe('getSkillById', () => {
  it('returns the correct skill by id', () => {
    const db = createTestDb();
    const all = getAllSkills(db);
    const firstSkill = all[0];

    const result = getSkillById(db, firstSkill.id);
    expect(result).toBeDefined();
    expect(result!.name).toBe(firstSkill.name);
  });

  it('returns undefined for a non-existent id', () => {
    const db = createTestDb();
    const result = getSkillById(db, 99999);
    expect(result).toBeUndefined();
  });
});

describe('getSetting / setSetting', () => {
  it('returns undefined for a key that does not exist', () => {
    const db = createTestDb();
    const result = getSetting(db, 'nonexistent_key');
    expect(result).toBeUndefined();
  });

  it('setSetting stores a value and getSetting retrieves it', () => {
    const db = createTestDb();
    setSetting(db, 'onboarding_complete', 'true');
    const result = getSetting(db, 'onboarding_complete');
    expect(result).toBe('true');
  });

  it('setSetting upserts — updating an existing key replaces the value', () => {
    const db = createTestDb();
    setSetting(db, 'notification_enabled', 'false');
    setSetting(db, 'notification_enabled', 'true');
    const result = getSetting(db, 'notification_enabled');
    expect(result).toBe('true');
  });

  it('stores multiple independent settings', () => {
    const db = createTestDb();
    setSetting(db, 'key_a', 'value_a');
    setSetting(db, 'key_b', 'value_b');
    expect(getSetting(db, 'key_a')).toBe('value_a');
    expect(getSetting(db, 'key_b')).toBe('value_b');
  });
});

describe('getSkillsWithMastery', () => {
  it('returns mastered: false when no skill_progress row exists (LEFT JOIN null → false)', () => {
    const mockRows = [
      { id: 1, name: 'Big Cup', tier: 'beginner', description: null, video_url: null, sort_order: 1, mastered: null },
    ];
    const mockDb = {
      select: () => ({
        from: () => ({
          leftJoin: () => ({
            orderBy: () => ({ all: () => mockRows }),
          }),
        }),
      }),
    } as any;
    const result = getSkillsWithMastery(mockDb);
    expect(result[0].mastered).toBe(false);
  });

  it('returns mastered: true when skill_progress row has mastered=true', () => {
    const mockRows = [
      { id: 1, name: 'Big Cup', tier: 'beginner', description: null, video_url: null, sort_order: 1, mastered: true },
    ];
    const mockDb = {
      select: () => ({
        from: () => ({
          leftJoin: () => ({
            orderBy: () => ({ all: () => mockRows }),
          }),
        }),
      }),
    } as any;
    const result = getSkillsWithMastery(mockDb);
    expect(result[0].mastered).toBe(true);
  });

  it('returns all skills ordered by sort_order with real DB', () => {
    const db = createTestDb();
    const result = getSkillsWithMastery(db);
    expect(result).toHaveLength(42);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].sort_order).toBeGreaterThan(result[i - 1].sort_order);
    }
  });

  it('returns mastered: false for all skills when no skill_progress rows exist', () => {
    const db = createTestDb();
    const result = getSkillsWithMastery(db);
    expect(result.every(s => s.mastered === false)).toBe(true);
  });
});

describe('bulkInsertSkillProgress', () => {
  function makeRow(skillId: number, due = '2026-04-15') {
    return {
      skill_id: skillId,
      stability: 1.5,
      difficulty: 0.3,
      elapsed_days: 0,
      scheduled_days: 1,
      reps: 1,
      lapses: 0,
      state: 2, // Review
      due,
    };
  }

  it('no-ops on empty array', () => {
    const db = createTestDb();
    expect(() => bulkInsertSkillProgress(db, [])).not.toThrow();
  });

  it('inserts rows into skill_progress', () => {
    const db = createTestDb();
    const allSkills = getAllSkills(db);
    const row = makeRow(allSkills[0].id);
    bulkInsertSkillProgress(db, [row]);
    const result = db.select().from(schema.skill_progress).all();
    expect(result).toHaveLength(1);
    expect(result[0].skill_id).toBe(allSkills[0].id);
    expect(result[0].state).toBe(2);
    expect(result[0].due).toBe('2026-04-15');
  });

  it('inserts multiple rows', () => {
    const db = createTestDb();
    const allSkills = getAllSkills(db);
    const rows = allSkills.slice(0, 3).map(s => makeRow(s.id));
    bulkInsertSkillProgress(db, rows);
    const result = db.select().from(schema.skill_progress).all();
    expect(result).toHaveLength(3);
  });

  it('is idempotent — re-running with same skill_id updates the row', () => {
    const db = createTestDb();
    const allSkills = getAllSkills(db);
    const row = makeRow(allSkills[0].id, '2026-04-15');
    bulkInsertSkillProgress(db, [row]);
    const updated = { ...row, due: '2026-04-20', state: 2 };
    bulkInsertSkillProgress(db, [updated]);
    const result = db.select().from(schema.skill_progress).all();
    expect(result).toHaveLength(1);
    expect(result[0].due).toBe('2026-04-20');
  });

  it('sets mastered to false on insert', () => {
    const db = createTestDb();
    const allSkills = getAllSkills(db);
    bulkInsertSkillProgress(db, [makeRow(allSkills[0].id)]);
    const result = db.select().from(schema.skill_progress).all();
    expect(result[0].mastered).toBe(false);
  });
});

describe('getMasteredCount', () => {
  it('returns 0 when no skill_progress rows exist', () => {
    const db = createTestDb();
    expect(getMasteredCount(db)).toBe(0);
  });

  it('returns 0 when no rows are mastered', () => {
    const db = createTestDb();
    const allSkills = getAllSkills(db);
    bulkInsertSkillProgress(db, allSkills.slice(0, 3).map(s => ({
      skill_id: s.id, stability: 0, difficulty: 0, elapsed_days: 0,
      scheduled_days: 0, reps: 0, lapses: 0, state: 2, due: '2026-04-15',
    })));
    expect(getMasteredCount(db)).toBe(0);
  });

  it('returns correct count with 3 mastered and 2 unmastered rows', () => {
    const db = createTestDb();
    const allSkills = getAllSkills(db);
    // Insert 5 skills with progress
    bulkInsertSkillProgress(db, allSkills.slice(0, 5).map(s => ({
      skill_id: s.id, stability: 0, difficulty: 0, elapsed_days: 0,
      scheduled_days: 0, reps: 0, lapses: 0, state: 2, due: '2026-04-15',
    })));
    // Mark first 3 as mastered
    for (const skill of allSkills.slice(0, 3)) {
      db.update(schema.skill_progress)
        .set({ mastered: true })
        .where(eq(schema.skill_progress.skill_id, skill.id))
        .run();
    }
    expect(getMasteredCount(db)).toBe(3);
  });
});

describe('getSessionsThisWeek', () => {
  const WEEK_START = '2026-04-13T00:00:00.000Z'; // Monday

  function insertSession(db: ReturnType<typeof createTestDb>, skillId: number, logged_at: string) {
    db.insert(schema.sessions).values({
      skill_id: skillId,
      self_rating: 3,
      logged_at,
    }).run();
  }

  it('returns 0 when no sessions exist', () => {
    const db = createTestDb();
    expect(getSessionsThisWeek(db, WEEK_START)).toBe(0);
  });

  it('does not count sessions logged before weekStart', () => {
    const db = createTestDb();
    const skillId = getAllSkills(db)[0].id;
    insertSession(db, skillId, '2026-04-12T23:59:59.000Z'); // Sunday before
    expect(getSessionsThisWeek(db, WEEK_START)).toBe(0);
  });

  it('counts sessions logged exactly at weekStart', () => {
    const db = createTestDb();
    const skillId = getAllSkills(db)[0].id;
    insertSession(db, skillId, WEEK_START);
    expect(getSessionsThisWeek(db, WEEK_START)).toBe(1);
  });

  it('counts sessions logged after weekStart', () => {
    const db = createTestDb();
    const skillId = getAllSkills(db)[0].id;
    insertSession(db, skillId, '2026-04-14T10:00:00.000Z');
    insertSession(db, skillId, '2026-04-15T18:30:00.000Z');
    expect(getSessionsThisWeek(db, WEEK_START)).toBe(2);
  });

  it('only counts sessions within the current week window', () => {
    const db = createTestDb();
    const skillId = getAllSkills(db)[0].id;
    insertSession(db, skillId, '2026-04-12T23:59:59.000Z'); // before — not counted
    insertSession(db, skillId, WEEK_START);                   // at start — counted
    insertSession(db, skillId, '2026-04-16T09:00:00.000Z'); // mid-week — counted
    expect(getSessionsThisWeek(db, WEEK_START)).toBe(2);
  });
});

describe('getSkillsWithoutProgress', () => {
  it('returns all beginner skills when no progress rows exist', () => {
    const db = createTestDb();
    const result = getSkillsWithoutProgress(db, 'beginner', 10);
    expect(result).toHaveLength(10);
    expect(result.every(s => s.tier === 'beginner')).toBe(true);
  });

  it('respects the limit', () => {
    const db = createTestDb();
    const result = getSkillsWithoutProgress(db, 'beginner', 5);
    expect(result).toHaveLength(5);
  });

  it('excludes skills that already have a skill_progress row', () => {
    const db = createTestDb();
    const beginnerSkills = getSkillsByTier(db, 'beginner');
    // Insert progress for first 3 beginner skills
    const rows = beginnerSkills.slice(0, 3).map(s => ({
      skill_id: s.id,
      stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0,
      reps: 0, lapses: 0, state: 0, due: '2026-04-15',
    }));
    bulkInsertSkillProgress(db, rows);

    const result = getSkillsWithoutProgress(db, 'beginner', 10);
    expect(result).toHaveLength(7); // 10 beginner - 3 with progress = 7
    const resultIds = result.map(s => s.id);
    expect(resultIds).not.toContain(beginnerSkills[0].id);
    expect(resultIds).not.toContain(beginnerSkills[1].id);
    expect(resultIds).not.toContain(beginnerSkills[2].id);
  });

  it('returns skills ordered by sort_order', () => {
    const db = createTestDb();
    const result = getSkillsWithoutProgress(db, 'beginner', 10);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].sort_order).toBeGreaterThan(result[i - 1].sort_order);
    }
  });

  it('returns empty array when all skills in tier have progress rows', () => {
    const db = createTestDb();
    const beginnerSkills = getSkillsByTier(db, 'beginner');
    const rows = beginnerSkills.map(s => ({
      skill_id: s.id,
      stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0,
      reps: 0, lapses: 0, state: 0, due: '2026-04-15',
    }));
    bulkInsertSkillProgress(db, rows);

    const result = getSkillsWithoutProgress(db, 'beginner', 5);
    expect(result).toHaveLength(0);
  });
});

describe('getAllEquipment', () => {
  it('returns empty array when no equipment exists', () => {
    const db = createTestDb();
    expect(getAllEquipment(db)).toHaveLength(0);
  });

  it('returns all equipment ordered by added_at DESC', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Kendama A', added_at: '2026-04-01T00:00:00.000Z' });
    insertEquipment(db, { name: 'Kendama B', added_at: '2026-04-03T00:00:00.000Z' });
    insertEquipment(db, { name: 'Kendama C', added_at: '2026-04-02T00:00:00.000Z' });
    const result = getAllEquipment(db);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Kendama B');
    expect(result[1].name).toBe('Kendama C');
    expect(result[2].name).toBe('Kendama A');
  });
});

describe('getAllEquipmentWithReplacementCount', () => {
  it('returns empty array when no equipment exists', () => {
    const db = createTestDb();
    expect(getAllEquipmentWithReplacementCount(db)).toHaveLength(0);
  });

  it('returns equipment with replacement counts in a single query', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Kendama A', added_at: '2026-04-01T00:00:00.000Z' });
    insertEquipment(db, { name: 'Kendama B', added_at: '2026-04-02T00:00:00.000Z' });
    const rows = getAllEquipment(db);
    db.insert(schema.string_replacements).values({
      equipment_id: rows[0].id,
      replaced_at: '2026-04-05T00:00:00.000Z',
    }).run();
    db.insert(schema.string_replacements).values({
      equipment_id: rows[0].id,
      replaced_at: '2026-04-10T00:00:00.000Z',
    }).run();

    const result = getAllEquipmentWithReplacementCount(db);
    expect(result).toHaveLength(2);
    const a = result.find((r) => r.name === 'Kendama A');
    const b = result.find((r) => r.name === 'Kendama B');
    expect(a).toBeDefined();
    expect(a!.replacementCount).toBe(0);
    expect(b).toBeDefined();
    expect(b!.replacementCount).toBe(2);
  });

  it('orders results by added_at DESC', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Kendama A', added_at: '2026-04-01T00:00:00.000Z' });
    insertEquipment(db, { name: 'Kendama B', added_at: '2026-04-03T00:00:00.000Z' });
    const result = getAllEquipmentWithReplacementCount(db);
    expect(result[0].name).toBe('Kendama B');
    expect(result[1].name).toBe('Kendama A');
  });
});

describe('getEquipmentById', () => {
  it('returns the correct equipment by id', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Kendama A', added_at: '2026-04-01T00:00:00.000Z' });
    const all = getAllEquipment(db);
    const result = getEquipmentById(db, all[0].id);
    expect(result).toBeDefined();
    expect(result!.name).toBe('Kendama A');
  });

  it('returns undefined for non-existent id', () => {
    const db = createTestDb();
    expect(getEquipmentById(db, 99999)).toBeUndefined();
  });
});

describe('getStringReplacementCount', () => {
  it('returns 0 when no replacements exist', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Kendama A', added_at: '2026-04-01T00:00:00.000Z' });
    const eqRow = getAllEquipment(db)[0];
    expect(getStringReplacementCount(db, eqRow.id)).toBe(0);
  });

  it('returns correct count for multiple replacements', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Kendama A', added_at: '2026-04-01T00:00:00.000Z' });
    const eqRow = getAllEquipment(db)[0];
    db.insert(schema.string_replacements).values({
      equipment_id: eqRow.id,
      replaced_at: '2026-04-05T00:00:00.000Z',
    }).run();
    db.insert(schema.string_replacements).values({
      equipment_id: eqRow.id,
      replaced_at: '2026-04-10T00:00:00.000Z',
    }).run();
    expect(getStringReplacementCount(db, eqRow.id)).toBe(2);
  });
});

describe('insertEquipment', () => {
  it('inserts equipment with all fields', () => {
    const db = createTestDb();
    insertEquipment(db, {
      name: 'Kendama A',
      notes: 'Red tama',
      purchase_date: '2026-03-15T00:00:00.000Z',
      added_at: '2026-04-01T00:00:00.000Z',
    });
    const result = getAllEquipment(db)[0];
    expect(result.name).toBe('Kendama A');
    expect(result.notes).toBe('Red tama');
    expect(result.purchase_date).toBe('2026-03-15T00:00:00.000Z');
    expect(result.added_at).toBe('2026-04-01T00:00:00.000Z');
  });

  it('inserts equipment with optional fields null', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Kendama B', added_at: '2026-04-01T00:00:00.000Z' });
    const result = getAllEquipment(db)[0];
    expect(result.name).toBe('Kendama B');
    expect(result.notes).toBeNull();
    expect(result.purchase_date).toBeNull();
  });
});

describe('updateEquipment', () => {
  it('updates name only', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Old Name', added_at: '2026-04-01T00:00:00.000Z' });
    const id = getAllEquipment(db)[0].id;
    updateEquipment(db, id, { name: 'New Name' });
    const result = getEquipmentById(db, id);
    expect(result!.name).toBe('New Name');
  });

  it('updates purchase_date', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Kendama A', added_at: '2026-04-01T00:00:00.000Z' });
    const id = getAllEquipment(db)[0].id;
    updateEquipment(db, id, { purchase_date: '2026-02-01T00:00:00.000Z' });
    const result = getEquipmentById(db, id);
    expect(result!.purchase_date).toBe('2026-02-01T00:00:00.000Z');
  });

  it('updates notes to null', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Kendama A', notes: 'Note', added_at: '2026-04-01T00:00:00.000Z' });
    const id = getAllEquipment(db)[0].id;
    updateEquipment(db, id, { notes: null });
    const result = getEquipmentById(db, id);
    expect(result!.notes).toBeNull();
  });

  it('no-ops on empty update object', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Kendama A', notes: 'Note', added_at: '2026-04-01T00:00:00.000Z' });
    const id = getAllEquipment(db)[0].id;
    expect(() => updateEquipment(db, id, {})).not.toThrow();
    const result = getEquipmentById(db, id);
    expect(result!.name).toBe('Kendama A');
    expect(result!.notes).toBe('Note');
  });
});

describe('deleteEquipment', () => {
  it('deletes equipment by id', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Kendama A', added_at: '2026-04-01T00:00:00.000Z' });
    const id = getAllEquipment(db)[0].id;
    deleteEquipment(db, id);
    expect(getAllEquipment(db)).toHaveLength(0);
  });

  it('nulls sessions.equipment_id and deletes string replacements and equipment via manual transaction', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Kendama A', added_at: '2026-04-01T00:00:00.000Z' });
    const id = getAllEquipment(db)[0].id;
    db.insert(schema.string_replacements).values({
      equipment_id: id,
      replaced_at: '2026-04-05T00:00:00.000Z',
    }).run();
    db.insert(schema.sessions).values({
      skill_id: 1,
      equipment_id: id,
      self_rating: 3,
      logged_at: '2026-04-06T00:00:00.000Z',
    }).run();
    deleteEquipment(db, id);
    expect(db.select().from(schema.string_replacements).all()).toHaveLength(0);
    expect(getAllEquipment(db)).toHaveLength(0);
    const sessionsRows = db.select().from(schema.sessions).all();
    expect(sessionsRows).toHaveLength(1);
    expect(sessionsRows[0].equipment_id).toBeNull();
  });
});

describe('getStringReplacementsForEquipment', () => {
  it('returns empty array when no replacements exist', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Kendama A', added_at: '2026-04-01T00:00:00.000Z' });
    const eqRow = getAllEquipment(db)[0];
    expect(getStringReplacementsForEquipment(db, eqRow.id)).toHaveLength(0);
  });

  it('returns replacements ordered by replaced_at DESC', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Kendama A', added_at: '2026-04-01T00:00:00.000Z' });
    const eqRow = getAllEquipment(db)[0];
    db.insert(schema.string_replacements).values({
      equipment_id: eqRow.id,
      replaced_at: '2026-04-05',
    }).run();
    db.insert(schema.string_replacements).values({
      equipment_id: eqRow.id,
      replaced_at: '2026-04-10',
    }).run();
    db.insert(schema.string_replacements).values({
      equipment_id: eqRow.id,
      replaced_at: '2026-04-03',
    }).run();

    const result = getStringReplacementsForEquipment(db, eqRow.id);
    expect(result).toHaveLength(3);
    expect(result[0].replaced_at).toBe('2026-04-10');
    expect(result[1].replaced_at).toBe('2026-04-05');
    expect(result[2].replaced_at).toBe('2026-04-03');
  });

  it('only returns replacements for the specified equipment id', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Kendama A', added_at: '2026-04-01T00:00:00.000Z' });
    insertEquipment(db, { name: 'Kendama B', added_at: '2026-04-02T00:00:00.000Z' });
    const [eqA, eqB] = getAllEquipment(db);

    db.insert(schema.string_replacements).values({
      equipment_id: eqA.id,
      replaced_at: '2026-04-05',
    }).run();
    db.insert(schema.string_replacements).values({
      equipment_id: eqB.id,
      replaced_at: '2026-04-06',
    }).run();

    const resultA = getStringReplacementsForEquipment(db, eqA.id);
    expect(resultA).toHaveLength(1);
    expect(resultA[0].replaced_at).toBe('2026-04-05');

    const resultB = getStringReplacementsForEquipment(db, eqB.id);
    expect(resultB).toHaveLength(1);
    expect(resultB[0].replaced_at).toBe('2026-04-06');
  });
});

describe('insertStringReplacement', () => {
  it('inserts a string replacement with required fields', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Kendama A', added_at: '2026-04-01T00:00:00.000Z' });
    const eqRow = getAllEquipment(db)[0];

    insertStringReplacement(db, { equipment_id: eqRow.id, replaced_at: '2026-04-05' });
    const result = db.select().from(schema.string_replacements).all();
    expect(result).toHaveLength(1);
    expect(result[0].equipment_id).toBe(eqRow.id);
    expect(result[0].replaced_at).toBe('2026-04-05');
    expect(result[0].notes).toBeNull();
  });

  it('inserts a string replacement with optional notes', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Kendama A', added_at: '2026-04-01T00:00:00.000Z' });
    const eqRow = getAllEquipment(db)[0];

    insertStringReplacement(db, { equipment_id: eqRow.id, replaced_at: '2026-04-05', notes: 'Red string' });
    const result = db.select().from(schema.string_replacements).all();
    expect(result[0].notes).toBe('Red string');
  });
});

describe('deleteStringReplacement', () => {
  it('deletes a string replacement by id', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Kendama A', added_at: '2026-04-01T00:00:00.000Z' });
    const eqRow = getAllEquipment(db)[0];

    db.insert(schema.string_replacements).values({
      equipment_id: eqRow.id,
      replaced_at: '2026-04-05',
    }).run();
    const replacement = db.select().from(schema.string_replacements).all()[0];

    deleteStringReplacement(db, replacement.id);
    expect(db.select().from(schema.string_replacements).all()).toHaveLength(0);
  });
});

// Story 6.4: Equipment picker and session history queries

describe('getAllEquipmentForPicker', () => {
  it('returns empty array when no equipment exists', () => {
    const db = createTestDb();
    expect(getAllEquipmentForPicker(db)).toHaveLength(0);
  });

  it('returns only id and name fields', () => {
    const db = createTestDb();
    insertEquipment(db, {
      name: 'Kendama A',
      notes: 'Red tama',
      purchase_date: '2026-03-15T00:00:00.000Z',
      added_at: '2026-04-01T00:00:00.000Z',
    });
    const result = getAllEquipmentForPicker(db);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('name');
    expect(result[0]).not.toHaveProperty('notes');
    expect(result[0]).not.toHaveProperty('purchase_date');
    expect(result[0].name).toBe('Kendama A');
  });

  it('orders results by added_at DESC', () => {
    const db = createTestDb();
    insertEquipment(db, { name: 'Kendama A', added_at: '2026-04-01T00:00:00.000Z' });
    insertEquipment(db, { name: 'Kendama B', added_at: '2026-04-03T00:00:00.000Z' });
    insertEquipment(db, { name: 'Kendama C', added_at: '2026-04-02T00:00:00.000Z' });
    const result = getAllEquipmentForPicker(db);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Kendama B');
    expect(result[1].name).toBe('Kendama C');
    expect(result[2].name).toBe('Kendama A');
  });
});

describe('insertSession with equipment_id', () => {
  it('inserts session with equipment_id', () => {
    const db = createTestDb();
    const skillId = getAllSkills(db)[0].id;
    insertEquipment(db, { name: 'Ozora', added_at: '2026-04-01T00:00:00.000Z' });
    const eqRow = getAllEquipment(db)[0];

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { insertSession } = require('./queries');
    insertSession(db, {
      skill_id: skillId,
      equipment_id: eqRow.id,
      reps: 5,
      self_rating: 3,
      logged_at: '2026-04-05T10:00:00.000Z',
    });

    const result = db.select().from(schema.sessions).all();
    expect(result).toHaveLength(1);
    expect(result[0].equipment_id).toBe(eqRow.id);
  });

  it('inserts session with null equipment_id when omitted', () => {
    const db = createTestDb();
    const skillId = getAllSkills(db)[0].id;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { insertSession } = require('./queries');
    insertSession(db, {
      skill_id: skillId,
      reps: null,
      self_rating: 3,
      logged_at: '2026-04-05T10:00:00.000Z',
    });

    const result = db.select().from(schema.sessions).all();
    expect(result).toHaveLength(1);
    expect(result[0].equipment_id).toBeNull();
  });
});

describe('getSessionsForSkillWithEquipment', () => {
  it('returns empty array when no sessions exist', () => {
    const db = createTestDb();
    const skillId = getAllSkills(db)[0].id;
    expect(getSessionsForSkillWithEquipment(db, skillId)).toHaveLength(0);
  });

  it('returns session with null equipment_name when no equipment associated', () => {
    const db = createTestDb();
    const skillId = getAllSkills(db)[0].id;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { insertSession } = require('./queries');
    insertSession(db, {
      skill_id: skillId,
      reps: 5,
      self_rating: 3,
      logged_at: '2026-04-05T10:00:00.000Z',
    });

    const result = getSessionsForSkillWithEquipment(db, skillId);
    expect(result).toHaveLength(1);
    expect(result[0].equipment_name).toBeNull();
  });

  it('returns session with equipment_name when equipment is associated', () => {
    const db = createTestDb();
    const skillId = getAllSkills(db)[0].id;
    insertEquipment(db, { name: 'Ozora', added_at: '2026-04-01T00:00:00.000Z' });
    const eqRow = getAllEquipment(db)[0];

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { insertSession } = require('./queries');
    insertSession(db, {
      skill_id: skillId,
      equipment_id: eqRow.id,
      reps: 5,
      self_rating: 3,
      logged_at: '2026-04-05T10:00:00.000Z',
    });

    const result = getSessionsForSkillWithEquipment(db, skillId);
    expect(result).toHaveLength(1);
    expect(result[0].equipment_name).toBe('Ozora');
  });

  it('orders results by logged_at DESC', () => {
    const db = createTestDb();
    const skillId = getAllSkills(db)[0].id;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { insertSession } = require('./queries');
    insertSession(db, {
      skill_id: skillId,
      reps: 1,
      self_rating: 3,
      logged_at: '2026-04-03T10:00:00.000Z',
    });
    insertSession(db, {
      skill_id: skillId,
      reps: 2,
      self_rating: 3,
      logged_at: '2026-04-05T10:00:00.000Z',
    });

    const result = getSessionsForSkillWithEquipment(db, skillId);
    expect(result).toHaveLength(2);
    expect(result[0].reps).toBe(2);
    expect(result[1].reps).toBe(1);
  });

  it('only returns sessions for the specified skill', () => {
    const db = createTestDb();
    const allSkills = getAllSkills(db);
    const skillA = allSkills[0].id;
    const skillB = allSkills[1].id;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { insertSession } = require('./queries');
    insertSession(db, {
      skill_id: skillA,
      reps: 1,
      self_rating: 3,
      logged_at: '2026-04-03T10:00:00.000Z',
    });
    insertSession(db, {
      skill_id: skillB,
      reps: 2,
      self_rating: 3,
      logged_at: '2026-04-05T10:00:00.000Z',
    });

    const resultA = getSessionsForSkillWithEquipment(db, skillA);
    expect(resultA).toHaveLength(1);
    expect(resultA[0].reps).toBe(1);
  });
});

// Story 7.3: Reset app data

describe('resetAllData', () => {
  it('deletes all rows from skill_progress, sessions, equipment, string_replacements, and settings', () => {
    const db = createTestDb();
    const allSkills = getAllSkills(db);

    // Seed data across all user tables
    bulkInsertSkillProgress(db, allSkills.slice(0, 3).map(s => ({
      skill_id: s.id,
      stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0,
      reps: 0, lapses: 0, state: 0, due: '2026-04-15',
    })));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { insertSession } = require('./queries');
    insertSession(db, {
      skill_id: allSkills[0].id,
      reps: 1,
      self_rating: 3,
      logged_at: '2026-04-05T10:00:00.000Z',
    });

    insertEquipment(db, { name: 'Kendama A', added_at: '2026-04-01T00:00:00.000Z' });
    const eqRow = getAllEquipment(db)[0];
    db.insert(schema.string_replacements).values({
      equipment_id: eqRow.id,
      replaced_at: '2026-04-05T00:00:00.000Z',
    }).run();

    setSetting(db, 'onboarding_complete', 'true');
    setSetting(db, 'notification_enabled', 'true');

    resetAllData(db);

    expect(db.select().from(schema.skill_progress).all()).toHaveLength(0);
    expect(db.select().from(schema.sessions).all()).toHaveLength(0);
    expect(db.select().from(schema.equipment).all()).toHaveLength(0);
    expect(db.select().from(schema.string_replacements).all()).toHaveLength(0);
    expect(db.select().from(schema.settings).all()).toHaveLength(0);
  });

  it('preserves skills catalog rows', () => {
    const db = createTestDb();
    expect(getAllSkills(db)).toHaveLength(42);

    resetAllData(db);

    expect(getAllSkills(db)).toHaveLength(42);
  });
});
