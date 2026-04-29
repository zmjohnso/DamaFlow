import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { TouchableRipple, Text, useTheme } from 'react-native-paper';
import { customColors } from '@/lib/theme';
import TierBadge from './TierBadge';

type Tier = 'beginner' | 'intermediate' | 'advanced';

type SkillQueueItemProps = {
  skillName: string;
  tier: Tier;
  onPress: () => void;
} & (
  | { variant: 'overdue'; daysOverdue: number }
  | { variant: 'review'; daysOverdue?: never }
  | { variant: 'new'; daysOverdue?: never }
);

export default function SkillQueueItem({
  skillName,
  tier,
  variant,
  daysOverdue,
  onPress,
}: SkillQueueItemProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const overdueColor = customColors[colorScheme ?? 'light'].overdue;
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

  let accessibilityLabel: string;
  if (variant === 'overdue') {
    accessibilityLabel = `${skillName}, ${tierLabel}, overdue ${daysOverdue} days ago`;
  } else if (variant === 'review') {
    accessibilityLabel = `${skillName}, ${tierLabel}, review`;
  } else {
    accessibilityLabel = `${skillName}, ${tierLabel}, new skill`;
  }

  const rightIndicator = () => {
    if (variant === 'overdue') {
      return (
        <Text style={[styles.overdueTag, { color: overdueColor }]}>
          {daysOverdue}d ago
        </Text>
      );
    }
    if (variant === 'review') {
      return (
        <Text style={[styles.chevron, { color: theme.colors.onSurfaceVariant }]}>
          ›
        </Text>
      );
    }
    // new
    return (
      <View style={[styles.newTag, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.newTagText, { color: theme.colors.onPrimary }]}>
          New
        </Text>
      </View>
    );
  };

  const metadataText = () => {
    if (variant === 'overdue') {
      return `Due ${daysOverdue} days ago`;
    }
    if (variant === 'review') {
      return 'Review';
    }
    return 'New';
  };

  return (
    <TouchableRipple
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.row}>
        {variant === 'overdue' && (
          <View style={[styles.leftBorder, { backgroundColor: overdueColor }]} />
        )}
        <View style={styles.content}>
          <Text variant="bodyLarge" numberOfLines={1}>
            {skillName}
          </Text>
          <View style={styles.metadataRow}>
            <TierBadge tier={tier} />
            {variant === 'overdue' ? (
              <Text
                variant="labelMedium"
                style={[styles.metadataLabel, { color: theme.colors.onSurfaceVariant }]}
              >
                {metadataText()}
              </Text>
            ) : (
              <Text
                variant="labelMedium"
                style={[styles.metadataLabel, { color: theme.colors.onSurfaceVariant }]}
              >
                · {metadataText()}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.rightIndicator}>
          {rightIndicator()}
        </View>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    minHeight: 68,
    alignItems: 'center',
  },
  leftBorder: {
    width: 3,
    alignSelf: 'stretch',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metadataLabel: {
    marginLeft: 6,
  },
  rightIndicator: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overdueTag: {
    fontWeight: '600',
  },
  chevron: {
    fontSize: 24,
    lineHeight: 28,
  },
  newTag: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  newTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
