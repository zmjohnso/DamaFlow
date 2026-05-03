import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { reschedule, scheduleNew } from '@/lib/fsrs/scheduler';
import type { SkillProgressRow } from '@/lib/fsrs/types';

type RatingRowProps = {
  skillProgress: SkillProgressRow | undefined;
  onRate: (rating: 1 | 2 | 3 | 4) => void;
};

const RATINGS: { label: string; value: 1 | 2 | 3 | 4 }[] = [
  { label: 'Again', value: 1 },
  { label: 'Hard',  value: 2 },
  { label: 'Good',  value: 3 },
  { label: 'Easy',  value: 4 },
];

function formatIntervalShort(scheduledDays: number): string {
  if (scheduledDays < 1 / 24) {
    return `${Math.max(1, Math.round(scheduledDays * 24 * 60))}m`;
  }
  if (scheduledDays < 1) {
    return `${Math.max(1, Math.round(scheduledDays * 24))}h`;
  }
  return `${Math.round(scheduledDays)}d`;
}

function formatIntervalLong(scheduledDays: number): string {
  if (scheduledDays < 1 / 24) {
    const mins = Math.max(1, Math.round(scheduledDays * 24 * 60));
    return `${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
  }
  if (scheduledDays < 1) {
    const hours = Math.max(1, Math.round(scheduledDays * 24));
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  const days = Math.round(scheduledDays);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

export default function RatingRow({ skillProgress, onRate }: RatingRowProps) {
  // Compute interval preview for all 4 ratings once — pure JS math (NFR2: <100ms)
  const intervals = useMemo(() => {
    return RATINGS.map(({ value }) => {
      const update = skillProgress
        ? reschedule(skillProgress, value)
        : scheduleNew(0, value);
      return update ? update.scheduled_days : null;
    });
  }, [skillProgress]);

  // Slide-up animation on mount
  const slideAnim = useRef(new Animated.Value(40)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.grid,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      {RATINGS.map(({ label, value }, index) => {
        const scheduledDays = intervals ? intervals[index] : null;
        const shortLabel = scheduledDays !== null ? formatIntervalShort(scheduledDays) : '—';
        const longLabel = scheduledDays !== null ? formatIntervalLong(scheduledDays) : 'unknown';
        const a11yLabel = `${label}, schedules review in ${longLabel}`;

        return (
          <Button
            key={value}
            mode="outlined"
            onPress={() => onRate(value)}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            accessibilityRole="button"
            accessibilityLabel={a11yLabel}
          >
            {`${label}  · ${shortLabel}`}
          </Button>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  button: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 56,
  },
  buttonContent: {
    height: 56,
  },
  buttonLabel: {
    textAlign: 'center',
    fontSize: 14,
  },
});
