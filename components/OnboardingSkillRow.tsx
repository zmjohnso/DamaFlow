import React from 'react';
import { Pressable, StyleSheet, useColorScheme } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { customColors } from '@/lib/theme';

type OnboardingSkillRowProps = {
  skillName: string;
  marked: boolean;
  onToggle: () => void;
};

export default function OnboardingSkillRow({ skillName, marked, onToggle }: OnboardingSkillRowProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const iconColor = marked
    ? customColors[colorScheme ?? 'light'].mastered
    : theme.colors.outline;

  return (
    <Pressable
      style={[styles.row, { borderBottomColor: theme.colors.outlineVariant }]}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityLabel={`${skillName}, ${marked ? 'marked' : 'not marked'} as mastered`}
      accessibilityState={{ checked: marked }}
    >
      <Text variant="bodyLarge" style={styles.skillName} numberOfLines={1}>
        {skillName}
      </Text>
      <FontAwesome
        name={marked ? 'check-circle' : 'circle-o'}
        size={24}
        color={iconColor}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  skillName: {
    flex: 1,
    marginRight: 12,
  },
});
