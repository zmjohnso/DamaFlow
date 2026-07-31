import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    background: '#FAF7F2',
    surface: '#F0EBE3',
    surfaceVariant: '#E5DDD4',
    onBackground: '#1E1C1A',
    onSurface: '#2A2725',
    onSurfaceVariant: '#6B5C52',
    outline: '#7A6A5E',
    outlineVariant: '#C8BAB0',
    primary: '#88603E', // darkened from #A0724A — restores WCAG AA (4.5:1+) against background/surface and for white button text
    onPrimary: '#FFFFFF',
    primaryContainer: '#F0DEC8',
    onPrimaryContainer: '#3D2410',
    inverseSurface: '#2A2725',
    inverseOnSurface: '#F0EBE3',
    error: '#9C4E44', // darkened from #B85C50 — restores WCAG AA (4.5:1+) for destructive-action text
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    background: '#1E1C1A',
    surface: '#2A2725',
    surfaceVariant: '#353029',
    onBackground: '#EDE8E2',
    onSurface: '#D8D0C8',
    onSurfaceVariant: '#C0B4AA',
    outline: '#6E6058',
    outlineVariant: '#4A4038',
    primary: '#D4A882',
    onPrimary: '#1E1C1A',
    primaryContainer: '#5A3E28',
    onPrimaryContainer: '#F0DEC8',
    inverseSurface: '#EDE8E2',
    inverseOnSurface: '#2A2725',
    error: '#D48A82',
  },
};

// Semantic tokens not in the MD3 palette. Import and use directly where needed.
// Always pair with a non-color signal (tag text, icon) — color is never the sole indicator.
// Usage: const colors = customColors[colorScheme ?? 'light'];
export const customColors = {
  light: {
    overdue: '#905B0F',  // amber, darkened from #C17A14 — restores WCAG AA (4.5:1+) against background/surface for tag/header text
    mastered: '#5A8A5E', // muted green — mastered checkmarks, tier progress indicators
  },
  dark: {
    overdue: '#D48E1A',  // lighter amber — ~5.5:1 on dark surface (#2A2725)
    mastered: '#72B077', // lighter green — ~5.9:1 on dark surface (#2A2725)
  },
} as const;
