import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';

type AppState = {
  onboardingComplete: boolean;
  setOnboardingComplete: (value: boolean) => void;
  themePreference: ThemePreference;
  setThemePreference: (value: ThemePreference) => void;
};

const useAppStore = create<AppState>((set) => ({
  onboardingComplete: false,
  setOnboardingComplete: (value) => set({ onboardingComplete: value }),
  themePreference: 'system',
  setThemePreference: (value) => set({ themePreference: value }),
}));

export default useAppStore;
