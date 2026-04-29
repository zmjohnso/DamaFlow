import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { and, eq, like } from 'drizzle-orm';
import { SKILL_CATALOG } from '../../assets/skillCatalog';
import { skills } from './schema';
import type * as schema from './schema';

// Accepts BaseSQLiteDatabase so the function is testable with both expo-sqlite
// (ExpoSQLiteDatabase) and better-sqlite3 (BetterSQLite3Database) adapters.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = BaseSQLiteDatabase<'sync', any, typeof schema>;

// Seeds the skill catalog into SQLite on first launch.
//
// Idempotency gate: if any row already exists in the `skills` table, the seed
// has already run and we skip. This is more robust than checking `settings`
// because it handles app crashes between seed and onboarding completion.
//
// All inserts run in a single transaction — if anything fails the DB is left
// with zero rows (all-or-nothing).
export function seedSkillCatalog(db: DB): void {
  const existing = db.select().from(skills).all();
  if (existing.length > 0) {
    const existingSortOrders = new Set(existing.map(s => s.sort_order));
    db.transaction((tx) => {
      for (const skill of SKILL_CATALOG) {
        if (!existingSortOrders.has(skill.sort_order)) {
          tx.insert(skills).values(skill).run();
        } else {
          tx.update(skills)
            .set({ name: skill.name, tier: skill.tier, description: skill.description, video_url: skill.video_url })
            .where(eq(skills.sort_order, skill.sort_order))
            .run();
        }
      }
    });
    return;
  }

  db.transaction((tx) => {
    for (const skill of SKILL_CATALOG) {
      tx.insert(skills).values(skill).run();
    }
  });
}
