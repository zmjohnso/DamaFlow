import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function PracticeLayout() {
  const theme = useTheme();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[skillId]"
        options={{
          title: 'Practice',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onSurface,
        }}
      />
      <Stack.Screen
        name="progress"
        options={{
          title: 'Progress',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onSurface,
        }}
      />
    </Stack>
  );
}
