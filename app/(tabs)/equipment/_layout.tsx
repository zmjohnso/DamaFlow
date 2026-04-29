import { Stack } from 'expo-router';

export default function EquipmentLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[equipmentId]"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
