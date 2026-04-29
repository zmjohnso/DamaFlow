import { create } from 'zustand';
import { db } from '../lib/db/client';
import { getQueueRows, getNewSkillCap } from '../lib/db/queries';
import type { QueueRow } from '../lib/db/queries';
import { getNotificationSettings, scheduleDailyReminder } from '../lib/notifications';

// Matches the shape returned by getQueueRows().
// Includes enough data for queue list rendering without additional Drizzle queries.
export type QueueItem = {
  skill_id: number;
  skill_name: string;
  tier: string;       // 'beginner' | 'intermediate' | 'advanced'
  due: string;        // ISO 8601 string — used for section grouping and display
  state: number;      // FSRS State: 0=New, 1=Learning, 2=Review, 3=Relearning
};

// Pure sort function — exported so queueStore.test.ts can test sorting in isolation.
// Three sections: Overdue (state!=0, due<today) | Due Today (state!=0, due==today) | New (state==0)
// Within each section, sorted ascending by due date.
// PRECONDITION: all non-new rows (state !== 0) must have due <= today.
//   getQueueRows() enforces this via WHERE due <= today; direct callers must pre-filter.
export function sortQueueItems(rows: QueueRow[], today: string): QueueItem[] {
  function section(row: QueueRow): number {
    if (row.state === 0) return 2;
    if (row.due.slice(0, 10) < today) return 0;
    return 1;
  }
  return [...rows].sort((a, b) => {
    const sectionDiff = section(a) - section(b);
    if (sectionDiff !== 0) return sectionDiff;
    // ISO 8601 strings are lexicographically sortable — use string comparison for stability.
    return a.due < b.due ? -1 : a.due > b.due ? 1 : 0;
  });
}

// Pure function: caps only New-state (state === 0) items while preserving order.
// Overdue and Due Today items are never capped.
export function capNewSkills(sorted: QueueItem[], cap: number): QueueItem[] {
  const safeCap = Number.isNaN(cap) ? 5 : Math.max(1, cap);
  let newCount = 0;
  return sorted.filter((item) => {
    if (item.state !== 0) return true;
    newCount++;
    return newCount <= safeCap;
  });
}

type QueueState = {
  queue: QueueItem[];
  loadQueue: () => void;
};

const useQueueStore = create<QueueState>((set) => ({
  queue: [],
  loadQueue: () => {
    // Use local calendar date (not UTC) so skills due today are visible regardless of timezone.
    // 'sv' locale produces YYYY-MM-DD format reliably across platforms.
    const today = new Date().toLocaleDateString('sv');
    try {
      const rows = getQueueRows(db, today);
      const sorted = sortQueueItems(rows, today);
      const cap = getNewSkillCap(db);
      const capped = capNewSkills(sorted, cap);
      set({ queue: capped });

      // Refresh scheduled notification with updated due count (Story 7.2)
      try {
        const settings = getNotificationSettings(db);
        if (settings.enabled) {
          scheduleDailyReminder(db).catch(() => {
            // Silently ignore notification refresh errors
          });
        }
      } catch {
        // Silently ignore notification refresh errors
      }
    } catch (e) {
      // DB error (uninitialized, locked, schema mismatch) — leave queue unchanged.
      // The root layout ensures migrations run before loadQueue() is called.
      console.error('[queueStore] loadQueue failed:', e);
    }
  },
}));

export default useQueueStore;
