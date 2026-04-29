import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { db } from '@/lib/db/client';
import { getSkillsByTier, bulkInsertSkillProgress, getSkillsWithoutProgress, setSetting, type Skill } from '@/lib/db/queries';
import { bulkInit } from '@/lib/fsrs/scheduler';
import useAppStore from '@/store/appStore';
import useQueueStore from '@/store/queueStore';
import OnboardingSkillRow from '@/components/OnboardingSkillRow';

type Step = 'welcome' | 'beginner' | 'intermediate' | 'advanced' | 'complete';

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>('welcome');
  const [markedIds, setMarkedIds] = useState<Set<number>>(new Set());
  const [hasMarked, setHasMarked] = useState(false);

  // Load all skills once — sync Drizzle, no useEffect needed
  const beginnerSkills = getSkillsByTier(db, 'beginner');
  const intermediateSkills = getSkillsByTier(db, 'intermediate');
  const advancedSkills = getSkillsByTier(db, 'advanced');

  function toggleSkill(id: number) {
    setMarkedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function skipTier(tierSkills: Skill[]) {
    setMarkedIds(prev => {
      const next = new Set(prev);
      tierSkills.forEach(s => next.delete(s.id));
      return next;
    });
    advanceStep();
  }

  function advanceStep() {
    setStep(prev =>
      prev === 'welcome' ? 'beginner'
      : prev === 'beginner' ? 'intermediate'
      : 'advanced',
    );
  }

  function handleDone(markedSkillIds: Set<number>) {
    const now = new Date().toISOString();

    try {
      // 1. Bulk-init marked skills into FSRS Review state
      // Truncate ISO datetime to YYYY-MM-DD so the queue date comparison works correctly.
      if (markedSkillIds.size > 0) {
        const results = bulkInit(Array.from(markedSkillIds), now);
        bulkInsertSkillProgress(db, results.map(r => ({ ...r, due: r.due.slice(0, 10) })));
      }

      // 2. Fill up to 5 beginner New-state slots for skills with no progress row yet
      const newSkills = getSkillsWithoutProgress(db, 'beginner', 5);
      if (newSkills.length > 0) {
        const today = new Date().toLocaleDateString('sv');
        bulkInsertSkillProgress(db, newSkills.map(skill => ({
          skill_id: skill.id,
          stability: 0,
          difficulty: 0,
          elapsed_days: 0,
          scheduled_days: 0,
          reps: 0,
          lapses: 0,
          state: 0, // FSRS New
          due: today,
        })));
      }

      // 3. Persist onboarding completion flag
      setSetting(db, 'onboarding_complete', 'true');
      useAppStore.getState().setOnboardingComplete(true);
    } catch (e) {
      console.error('[handleDone] Failed to initialize queue:', e);
      return;
    }

    // 4. Show explanation card
    setHasMarked(markedSkillIds.size > 0);
    setStep('complete');
  }

  if (step === 'welcome') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.welcomeContent}>
          <Text variant="displaySmall" style={styles.welcomeMessage}>
            DamaFlow tracks your skills and tells you what to practice today
          </Text>
          <Button
            mode="contained"
            onPress={advanceStep}
            style={styles.getStartedButton}
            accessibilityLabel="Get Started"
          >
            Get Started
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'complete') {
    const message = hasMarked
      ? "Based on what you've practiced, here are your first reviews. Rate each session and the app will schedule your next one."
      : "Here are your first skills to learn. Practice each one, then rate how it went.";
    const buttonLabel = hasMarked ? 'Start Reviewing →' : 'Start Learning →';

    function handleStart() {
      useQueueStore.getState().loadQueue();
      router.replace('/(tabs)/practice');
    }

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.welcomeContent}>
          <Text variant="headlineMedium" style={styles.completeHeading}>
            Here's what happens next
          </Text>
          <Text variant="bodyLarge" style={styles.completeBody}>
            {message}
          </Text>
          <Button
            mode="contained"
            onPress={handleStart}
            style={styles.getStartedButton}
            accessibilityLabel={buttonLabel}
          >
            {buttonLabel}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const tierMap: Record<Exclude<Step, 'welcome' | 'complete'>, { skills: Skill[]; label: string; nextLabel: string | null }> = {
    beginner: { skills: beginnerSkills, label: 'Beginner', nextLabel: 'Next: Intermediate →' },
    intermediate: { skills: intermediateSkills, label: 'Intermediate', nextLabel: 'Next: Advanced →' },
    advanced: { skills: advancedSkills, label: 'Advanced', nextLabel: null },
  };

  const currentTier = tierMap[step as Exclude<Step, 'welcome' | 'complete'>];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tierContainer}>
        <Text variant="headlineMedium" style={styles.tierHeading}>
          {currentTier.label} Skills
        </Text>
        <FlatList
          data={currentTier.skills}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <OnboardingSkillRow
              skillName={item.name}
              marked={markedIds.has(item.id)}
              onToggle={() => toggleSkill(item.id)}
            />
          )}
          style={styles.list}
        />
        <View style={styles.ctaRow}>
          {step !== 'advanced' && (
            <Button
              mode="text"
              onPress={() => skipTier(currentTier.skills)}
              accessibilityLabel="Skip Tier"
            >
              Skip Tier →
            </Button>
          )}
          {currentTier.nextLabel !== null ? (
            <Button
              mode="outlined"
              onPress={advanceStep}
              accessibilityLabel={currentTier.nextLabel}
            >
              {currentTier.nextLabel}
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={() => handleDone(markedIds)}
              accessibilityLabel="Done — I've marked what I know"
            >
              Done — I've marked what I know
            </Button>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  welcomeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeMessage: {
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  completeHeading: {
    textAlign: 'center',
    marginBottom: 16,
  },
  completeBody: {
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  getStartedButton: {
    marginTop: 8,
  },
  tierContainer: {
    flex: 1,
  },
  tierHeading: {
    marginBottom: 8,
  },
  list: {
    flex: 1,
  },
  ctaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingBottom: 8,
  },
});
