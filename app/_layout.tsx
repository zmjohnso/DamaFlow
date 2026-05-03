import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Redirect, Stack, ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, StyleSheet, useColorScheme as useRNColorScheme } from 'react-native';
import { PaperProvider, Text, Button, useTheme } from 'react-native-paper';
import 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { db, runMigrations } from '@/lib/db/client';
import { seedSkillCatalog } from '@/lib/db/seed';
import { getSetting } from '@/lib/db/queries';
import { lightTheme, darkTheme } from '@/lib/theme';
import useQueueStore from '@/store/queueStore';
import useAppStore from '@/store/appStore';

function ErrorContent({ retry }: { retry: () => void }) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
      <FontAwesome name="exclamation-circle" size={48} color={theme.colors.error} style={styles.errorIcon} />
      <Text variant="headlineSmall" style={[styles.errorTitle, { color: theme.colors.onBackground }]}>
        Oops
      </Text>
      <Text variant="bodyMedium" style={[styles.errorMessage, { color: theme.colors.onSurfaceVariant }]}>
        Something went wrong. Your data is safe.
      </Text>
      <Button mode="contained" onPress={retry} style={styles.errorButton}>
        Restart the app
      </Button>
    </SafeAreaView>
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  console.error('[ErrorBoundary]', error);
  const scheme = useRNColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;
  return (
    <PaperProvider theme={theme}>
      <ErrorContent retry={retry} />
    </PaperProvider>
  );
}

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [dbReady, setDbReady] = useState(false);
  const onboardingComplete = useAppStore(state => state.onboardingComplete);
  const [dbError, setDbError] = useState<Error | null>(null);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (dbError) throw dbError;
  }, [dbError]);

  useEffect(() => {
    if (!loaded) return;
    runMigrations()
      .then(() => {
        seedSkillCatalog(db);
        const setting = getSetting(db, 'onboarding_complete');
        useAppStore.getState().setOnboardingComplete(!!setting);
        try {
          const rawTheme = getSetting(db, 'theme_preference');
          const validTheme = rawTheme === 'light' || rawTheme === 'dark' ? rawTheme : 'system';
          useAppStore.getState().setThemePreference(validTheme);
        } catch { /* leave default 'system' */ }
        useQueueStore.getState().loadQueue();
        setDbReady(true);
      })
      .catch((e) => setDbError(e instanceof Error ? e : new Error(String(e))));
  }, [loaded]);

  useEffect(() => {
    if (dbReady) SplashScreen.hideAsync();
  }, [dbReady]);

  if (!loaded || !dbReady) return null;
  return <RootLayoutNav onboardingComplete={onboardingComplete} />;
}

function RootLayoutNav({ onboardingComplete }: { onboardingComplete: boolean }) {
  const colorScheme = useColorScheme();
  const themePreference = useAppStore(state => state.themePreference);
  const activeTheme =
    themePreference === 'light' ? lightTheme :
    themePreference === 'dark'  ? darkTheme  :
    colorScheme === 'dark'      ? darkTheme  : lightTheme;
  return (
    <PaperProvider theme={activeTheme}>
      {!onboardingComplete && <Redirect href="/onboarding" />}
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorIcon: { marginBottom: 16 },
  errorTitle: { marginBottom: 8 },
  errorMessage: { textAlign: 'center', marginBottom: 32 },
  errorButton: { alignSelf: 'stretch' },
});
