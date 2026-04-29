import React, { useEffect, useState } from 'react';
import { SectionList, StyleSheet, View, useColorScheme } from 'react-native';
import { Surface, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import EmptyQueueState from '@/components/EmptyQueueState';
import SkillQueueItem from '@/components/SkillQueueItem';
import { db } from '@/lib/db/client';
import { getMasteredCount, getSessionsThisWeek, getSetting, setSetting } from '@/lib/db/queries';
import { requestAndConfigureNotifications } from '@/lib/notifications';
import { customColors } from '@/lib/theme';
import useQueueStore from '@/store/queueStore';
import type { QueueItem } from '@/store/queueStore';

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sunday, 1=Monday, ...
  const daysToMon = day === 0 ? 6 : day - 1;
  const mon = new Date(now);
  mon.setDate(now.getDate() - daysToMon);
  mon.setHours(0, 0, 0, 0);
  return mon.toISOString();
}

function computeDaysOverdue(dueIso: string, todayStr: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor(
    (new Date(todayStr).getTime() - new Date(dueIso.slice(0, 10)).getTime()) / msPerDay
  );
}

type Section = { title: string; data: QueueItem[]; key: string };

export default function TodayScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const overdueColor = customColors[colorScheme ?? 'light'].overdue;

  const queue = useQueueStore(state => state.queue);
  const [masteredCount, setMasteredCount] = useState(0);
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0);
  const [isFirstCompletion, setIsFirstCompletion] = useState(false);

  useEffect(() => {
    try {
      setMasteredCount(getMasteredCount(db));
      setSessionsThisWeek(getSessionsThisWeek(db, getWeekStart()));
    } catch {
      // DB unavailable — stat chips remain at initial 0
    }
  }, []);

  useEffect(() => {
    if (queue.length !== 0) return;
    try {
      const seen = getSetting(db, 'first_completion_shown');
      if (seen === undefined) {
        setSetting(db, 'first_completion_shown', 'true');
        setIsFirstCompletion(true);
      }
    } catch {
      // silently ignore — emptyState will show standard variant
    }
  }, [queue.length]);

  useEffect(() => {
    try {
      const pending = getSetting(db, 'pending_notification_prompt');
      if (pending === 'true') {
        setSetting(db, 'pending_notification_prompt', 'false');
        requestAndConfigureNotifications(db).catch(() => {
          // Silently ignore notification errors — queue must render regardless
        });
      }
    } catch {
      // silently ignore — queue render is never blocked
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date().toLocaleDateString('sv');

  const overdueItems = queue.filter(i => i.state !== 0 && i.due.slice(0, 10) < today);
  const dueItems     = queue.filter(i => i.state !== 0 && i.due.slice(0, 10) >= today);
  const newItems     = queue.filter(i => i.state === 0);

  const sections: Section[] = [];
  if (overdueItems.length > 0) sections.push({ title: 'Overdue',    data: overdueItems, key: 'overdue' });
  if (dueItems.length     > 0) sections.push({ title: 'Due Today',  data: dueItems,     key: 'due-today' });
  if (newItems.length     > 0) sections.push({ title: 'New Skills', data: newItems,      key: 'new' });

  const dueTodayCount = overdueItems.length + dueItems.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Stat chips row */}
      <View style={styles.chipsRow}>
        {/* Due today chip — non-interactive */}
        <View style={styles.chipWrapper}>
          <Surface style={styles.chip} elevation={1}>
            <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
              {dueTodayCount}
            </Text>
            <Text variant="labelSmall" numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.colors.onSurfaceVariant }}>
              due today
            </Text>
          </Surface>
        </View>

        {/* Mastered chip — tappable */}
        <TouchableRipple
          style={styles.chipWrapper}
          onPress={() => router.push('/(tabs)/practice/progress')}
          accessibilityRole="button"
          accessibilityLabel={`View progress — ${masteredCount} skills mastered`}
        >
          <Surface style={styles.chip} elevation={1}>
            <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
              {masteredCount}
            </Text>
            <Text variant="labelSmall" numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.colors.onSurfaceVariant }}>
              mastered
            </Text>
          </Surface>
        </TouchableRipple>

        {/* Sessions this week chip — non-interactive */}
        <View style={styles.chipWrapper}>
          <Surface style={styles.chip} elevation={1}>
            <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
              {sessionsThisWeek}
            </Text>
            <Text variant="labelSmall" numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.colors.onSurfaceVariant }}>
              this week
            </Text>
          </Surface>
        </View>
      </View>

      {sections.length === 0 ? (
        <EmptyQueueState
          isFirstCompletion={isFirstCompletion}
          onStartNewSkill={() => router.navigate('/(tabs)/skills')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => String(item.skill_id)}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text
                variant="labelLarge"
                style={{
                  color: section.key === 'overdue'
                    ? overdueColor
                    : theme.colors.onSurfaceVariant,
                }}
              >
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item, section }) => {
            const isOverdue = section.key === 'overdue';
            const isNew = section.key === 'new';

            if (isOverdue) {
              return (
                <SkillQueueItem
                  skillName={item.skill_name}
                  tier={item.tier as 'beginner' | 'intermediate' | 'advanced'}
                  variant="overdue"
                  daysOverdue={computeDaysOverdue(item.due, today)}
                  onPress={() => router.push({ pathname: '/(tabs)/practice/[skillId]', params: { skillId: item.skill_id } })}
                />
              );
            }

            if (isNew) {
              return (
                <SkillQueueItem
                  skillName={item.skill_name}
                  tier={item.tier as 'beginner' | 'intermediate' | 'advanced'}
                  variant="new"
                  onPress={() => router.push({ pathname: '/(tabs)/practice/[skillId]', params: { skillId: item.skill_id } })}
                />
              );
            }

            return (
              <SkillQueueItem
                skillName={item.skill_name}
                tier={item.tier as 'beginner' | 'intermediate' | 'advanced'}
                variant="review"
                onPress={() => router.push({ pathname: '/(tabs)/practice/[skillId]', params: { skillId: item.skill_id } })}
              />
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chipWrapper: {
    flex: 1,
  },
  chip: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listContent: {
    paddingBottom: 16,
  },
});
