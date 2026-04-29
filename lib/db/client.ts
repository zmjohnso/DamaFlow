import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from './migrations/migrations';
import * as schema from './schema';

// Single SQLite connection for the entire app lifetime.
// enableChangeListener: drizzle-orm uses it for real-time query updates.
const expo = openDatabaseSync('damaflow.db', { enableChangeListener: true });
expo.execSync('PRAGMA foreign_keys = ON');

export const db = drizzle(expo, { schema });

// Called once on app start (in app/_layout.tsx) before any screen renders.
// Runs all pending Drizzle migrations in order.
export async function runMigrations(): Promise<void> {
  await migrate(db, migrations);
}
