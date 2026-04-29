import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';

type Props = {
  isFirstCompletion: boolean;
  onStartNewSkill: () => void;
};

export default function EmptyQueueState({ isFirstCompletion, onStartNewSkill }: Props) {
  const theme = useTheme();

  const subtext = isFirstCompletion
    ? "You've cleared your queue for the first time. Come back tomorrow for your next review."
    : 'Come back tomorrow for your next review.';

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.headline}>
        You're all caught up.
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.subtext, { color: theme.colors.onSurfaceVariant }]}
      >
        {subtext}
      </Text>
      <Button mode="text" onPress={onStartNewSkill}>
        Start a new skill →
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  headline: {
    textAlign: 'center',
    marginBottom: 12,
  },
  subtext: {
    textAlign: 'center',
    marginBottom: 24,
  },
});
