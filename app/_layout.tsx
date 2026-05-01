import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Redirect, Stack, ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { PaperProvider, Text, Button } from 'react-native-paper';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { db, runMigrations } from '@/lib/db/client';
import { seedSkillCatalog } from '@/lib/db/seed';
import { getSetting } from '@/lib/db/queries';
import { lightTheme, darkTheme } from '@/lib/theme';
import useQueueStore from '@/store/queueStore';
import useAppStore from '@/store/appStore';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  console.error('[ErrorBoundary]', error);
  return (
    <PaperProvider>
      <View style={styles.errorContainer}>
        <Text variant="headlineSmall">Something went wrong</Text>
        <Text variant="bodyMedium" style={styles.errorMessage}>
          An unexpected error occurred. Your data is safe.
        </Text>
        <Button mode="contained" onPress={retry} style={styles.errorButton}>
          Restart the app
        </Button>
      </View>
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
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorMessage: { marginTop: 8, marginBottom: 24, textAlign: 'center' },
  errorButton: { marginTop: 8 },
});
