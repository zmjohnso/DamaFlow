import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, useColorScheme } from 'react-native';
import { Text, ProgressBar, TouchableRipple, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { db } from '@/lib/db/client';
import { getTierMasteryCounts, getOverdueMasteredSkills } from '@/lib/db/queries';
import type { OverdueMasteredSkill } from '@/lib/db/queries';
import { customColors } from '@/lib/theme';
import TierBadge from '@/components/TierBadge';

type TierCount = {
  tier: string;
  mastered: number;
  total: number;
};

const TIER_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

function computeDaysOverdue(dueIso: string, todayStr: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor(
    (new Date(todayStr).getTime() - new Date(dueIso.slice(0, 10)).getTime()) / msPerDay
  );
}

export default function ProgressScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const masteredColor = customColors[colorScheme ?? 'light'].mastered;
  const overdueColor = customColors[colorScheme ?? 'light'].overdue;
  const [counts, setCounts] = useState<TierCount[]>([]);
  const [overdueSkills, setOverdueSkills] = useState<OverdueMasteredSkill[]>([]);

  useEffect(() => {
    try {
      setCounts(getTierMasteryCounts(db));
      const today = new Date().toLocaleDateString('sv'); // YYYY-MM-DD
      setOverdueSkills(getOverdueMasteredSkills(db, today));
    } catch {
      setCounts([]);
      setOverdueSkills([]);
    }
  }, []);

  const today = new Date().toLocaleDateString('sv');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Stack.Screen options={{ title: 'Progress' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {counts.map(({ tier, mastered, total }) => {
          const progress = total > 0 ? mastered / total : 0;
          return (
            <View
              key={tier}
              style={styles.section}
              accessibilityRole="progressbar"
              accessibilityLabel={`${mastered} of ${total} ${TIER_LABELS[tier]} skills mastered`}
            >
              <Text variant="titleMedium">{TIER_LABELS[tier]}</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {mastered} of {total} skills mastered
              </Text>
              <ProgressBar
                progress={progress}
                color={masteredColor}
                style={styles.progressBar}
              />
            </View>
          );
        })}

        {overdueSkills.length > 0 && (
          <View style={styles.overdueSection}>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface }}
            >
              Overdue Mastered Skills
            </Text>
            {overdueSkills.map(skill => {
              const days = computeDaysOverdue(skill.due, today);
              return (
                <TouchableRipple
                  key={skill.skill_id}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/skills/[skillId]',
                      params: { skillId: skill.skill_id },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${skill.skill_name}, ${skill.tier}, ${days} days overdue`}
                >
                  <View style={styles.overdueRow}>
                    <Text variant="bodyLarge">{skill.skill_name}</Text>
                    <View style={styles.overdueMeta}>
                      <TierBadge tier={skill.tier as 'beginner' | 'intermediate' | 'advanced'} />
                      <Text
                        variant="bodyMedium"
                        style={{ color: overdueColor }}
                      >
                        {days} days overdue
                      </Text>
                    </View>
                  </View>
                </TouchableRipple>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 4,
  },
  progressBar: {
    marginTop: 8,
    height: 8,
    borderRadius: 4,
  },
  overdueSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  overdueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  overdueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
