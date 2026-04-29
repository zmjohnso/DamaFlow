import { create } from 'zustand';

type AppState = {
  onboardingComplete: boolean;
  setOnboardingComplete: (value: boolean) => void;
};

const useAppStore = create<AppState>((set) => ({
  onboardingComplete: false,
  setOnboardingComplete: (value) => set({ onboardingComplete: value }),
}));

export default useAppStore;
