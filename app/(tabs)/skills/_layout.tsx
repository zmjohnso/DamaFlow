import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function SkillsLayout() {
  const theme = useTheme();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[skillId]"
        options={{
          title: 'Skill Detail',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onSurface,
        }}
      />
    </Stack>
  );
}
