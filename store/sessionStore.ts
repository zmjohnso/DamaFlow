import { create } from 'zustand';

type SessionState = {
  currentSkillId: number | null;
  reps: number | null;
  pendingRating: number | null;  // 1=Again, 2=Hard, 3=Good, 4=Easy — null until selected
  setCurrentSkill: (skillId: number) => void;
  setReps: (reps: number | null) => void;
  setPendingRating: (rating: number | null) => void;
  clearSession: () => void;
};

const INITIAL_STATE = Object.freeze({
  currentSkillId: null,
  reps: null,
  pendingRating: null,
} as const);

const useSessionStore = create<SessionState>((set) => ({
  ...INITIAL_STATE,
  setCurrentSkill: (skillId) => set({ currentSkillId: skillId }),
  setReps: (reps) => set({ reps }),
  setPendingRating: (rating) => set({ pendingRating: rating }),
  clearSession: () => set(INITIAL_STATE),
}));

export default useSessionStore;
