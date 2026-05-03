import React, { useEffect, useState } from 'react';
import { View, ScrollView, TextInput, StyleSheet, Linking, FlatList, Keyboard } from 'react-native';
import { Button, Text, useTheme, Modal, Portal, TouchableRipple } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import TierBadge from '@/components/TierBadge';
import RatingRow from '@/components/RatingRow';
import { db } from '@/lib/db/client';
import {
  getSkillById,
  getSkillProgressById,
  getLastSession,
  updateSkillProgress,
  insertSession,
  getAllEquipmentForPicker,
  setSetting,
} from '@/lib/db/queries';
import useSessionStore from '@/store/sessionStore';
import useQueueStore from '@/store/queueStore';
import { reschedule, scheduleNew } from '@/lib/fsrs/scheduler';
import { bulkInsertSkillProgress } from '@/lib/db/queries';
import type { Grade } from '@/lib/fsrs/types';
import type { EquipmentPickerItem } from '@/lib/db/queries';

function isValidTutorialUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function daysSince(isoString: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / msPerDay));
}

function formatDueDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PracticeScreen() {
  const { skillId } = useLocalSearchParams<{ skillId: string | string[] }>();
  const theme = useTheme();

  const parsedSkillId =
    typeof skillId === 'string' && /^\d+$/.test(skillId)
      ? parseInt(skillId, 10)
      : NaN;

  const [skill, setSkill] = useState<ReturnType<typeof getSkillById>>(undefined);
  const [progress, setProgress] = useState<ReturnType<typeof getSkillProgressById>>(undefined);
  const [lastSession, setLastSession] = useState<ReturnType<typeof getLastSession>>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [repsInput, setRepsInput] = useState('');
  const [showRating, setShowRating] = useState(false);

  // Equipment picker state
  const [equipmentList, setEquipmentList] = useState<EquipmentPickerItem[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    if (Number.isNaN(parsedSkillId)) {
      setLoaded(true);
      return;
    }
    try {
      setSkill(getSkillById(db, parsedSkillId));
      setProgress(getSkillProgressById(db, parsedSkillId));
      setLastSession(getLastSession(db, parsedSkillId));
      // Load equipment for picker
      const equipment = getAllEquipmentForPicker(db);
      setEquipmentList(equipment);
      // Prime session store for Story 4.5
      useSessionStore.getState().setCurrentSkill(parsedSkillId);
      useSessionStore.getState().setReps(null);
    } catch {
      // DB error — skill will be undefined, fallback renders
    }
    setLoaded(true);
  // parsedSkillId is derived from route params and won't change while mounted
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRepsChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setRepsInput(cleaned);
    const parsed = cleaned === '' ? null : parseInt(cleaned, 10);
    useSessionStore.getState().setReps(parsed);
  };

  const handleDecrement = () => {
    const current = repsInput === '' ? 0 : parseInt(repsInput, 10);
    if (current > 0) {
      const next = String(current - 1);
      setRepsInput(next);
      useSessionStore.getState().setReps(current - 1);
    }
  };

  const handleIncrement = () => {
    const current = repsInput === '' ? 0 : parseInt(repsInput, 10);
    const next = String(current + 1);
    setRepsInput(next);
    useSessionStore.getState().setReps(current + 1);
  };

  const handleRate = (rating: 1 | 2 | 3 | 4) => {
    const { currentSkillId, reps } = useSessionStore.getState();
    if (currentSkillId === null) {
      router.back();
      return;
    }
    try {
      // Reschedule FSRS — pure JS, guaranteed < 100ms (NFR2)
      if (progress) {
        const update = reschedule(progress, rating as Grade);
        if (update) {
          updateSkillProgress(db, currentSkillId, update);
        }
      } else {
        // First-ever practice of this skill — create initial FSRS record
        bulkInsertSkillProgress(db, [scheduleNew(currentSkillId, rating as Grade)]);
      }
      // Insert session — DB write before navigation (NFR4)
      // Guard: if selected equipment was deleted since picker opened, fall back to null
      const equipmentIdToLog = selectedEquipmentId !== null && !equipmentList.some(e => e.id === selectedEquipmentId)
        ? null
        : selectedEquipmentId;
      insertSession(db, {
        skill_id: currentSkillId,
        equipment_id: equipmentIdToLog,
        reps,
        self_rating: rating,
        logged_at: new Date().toISOString(),
      });
      // Flag for notification prompt on next Today tab mount (Story 7.2)
      setSetting(db, 'pending_notification_prompt', 'true');
      // Invalidate queue so Today tab reflects new schedule
      useQueueStore.getState().loadQueue();
      // Clear active session from store
      useSessionStore.getState().clearSession();
    } catch (e) {
      // DB error — log but don't block user; session data may be lost
      console.error('[RatingRow] handleRate failed:', e);
    }
    // Always navigate back — no loading state, no toast (UX-DR10)
    router.back();
  };

  const handleWatchTutorial = async () => {
    if (skill?.video_url) {
      try {
        await Linking.openURL(skill.video_url);
      } catch {
        // Ignore malformed or unsupported URLs so the screen stays usable.
      }
    }
  };

  const handleSelectEquipment = (id: number | null) => {
    setSelectedEquipmentId(id);
    setPickerVisible(false);
  };

  const selectedEquipmentName = selectedEquipmentId !== null
    ? equipmentList.find(e => e.id === selectedEquipmentId)?.name ?? 'None'
    : 'None';

  if (!loaded) {
    return null;
  }

  if (!skill) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['bottom']}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="bodyLarge">Skill not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tutorialUrl = skill.video_url?.trim() ?? '';
  const showTutorialButton = tutorialUrl !== '' && isValidTutorialUrl(tutorialUrl);

  const daysPracticed = lastSession ? daysSince(lastSession.logged_at) : null;
  const lastPracticedText =
    daysPracticed === null
      ? null
      : daysPracticed === 0
      ? 'Practiced earlier today'
      : daysPracticed === 1
      ? 'Last practiced 1 day ago'
      : `Last practiced ${daysPracticed} days ago`;

  const nextReviewText = progress
    ? `Next review: ${formatDueDate(progress.due)}`
    : null;

  const pickerData = [{ id: null as number | null, name: 'None' }, ...equipmentList];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          variant="titleLarge"
          accessibilityRole="header"
          style={styles.skillName}
        >
          {skill.name}
        </Text>

        {lastPracticedText ? (
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {lastPracticedText}
          </Text>
        ) : null}

        <TierBadge tier={skill.tier as 'beginner' | 'intermediate' | 'advanced'} />

        {nextReviewText ? (
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {nextReviewText}
          </Text>
        ) : null}

        {showTutorialButton ? (
          <Button
            mode="outlined"
            onPress={handleWatchTutorial}
          >
            Watch Tutorial
          </Button>
        ) : null}

        <View style={styles.repRow}>
          <Button
            mode="outlined"
            onPress={handleDecrement}
            accessibilityLabel="Decrease rep count"
            style={styles.repButton}
          >
            −
          </Button>
          <TextInput
            style={[
              styles.repInput,
              { color: theme.colors.onSurface, borderColor: theme.colors.outline },
            ]}
            value={repsInput}
            onChangeText={handleRepsChange}
            keyboardType="numeric"
            placeholder="Reps (optional)"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            accessibilityLabel="Rep count input"
          />
          <Button
            mode="outlined"
            onPress={handleIncrement}
            accessibilityLabel="Increase rep count"
            style={styles.repButton}
          >
            +
          </Button>
        </View>

        {equipmentList.length > 0 ? (
          <Button
            mode="outlined"
            onPress={() => setPickerVisible(true)}
            accessibilityLabel={`Equipment used: ${selectedEquipmentName}`}
            accessibilityRole="button"
            style={styles.equipmentButton}
          >
            Kendama: {selectedEquipmentName}
          </Button>
        ) : null}
      </ScrollView>

      <Portal>
        <Modal
          visible={pickerVisible}
          onDismiss={() => setPickerVisible(false)}
          contentContainerStyle={[
            styles.pickerModal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="titleMedium" style={styles.pickerTitle}>
            Select Equipment
          </Text>
          <FlatList
            data={pickerData}
            keyExtractor={(item, index) => (item.id?.toString() ?? 'none') + index}
            renderItem={({ item }) => {
              const isSelected =
                (item.id === null && selectedEquipmentId === null) ||
                item.id === selectedEquipmentId;
              return (
                <TouchableRipple
                  onPress={() => handleSelectEquipment(item.id)}
                  accessibilityRole="radio"
                  accessibilityLabel={`${item.name}, ${isSelected ? 'selected' : 'not selected'}`}
                  style={[
                    styles.pickerRow,
                    isSelected && {
                      backgroundColor: theme.colors.primaryContainer,
                    },
                  ]}
                >
                  <Text
                    variant="bodyLarge"
                    style={{
                      color: isSelected
                        ? theme.colors.onPrimaryContainer
                        : theme.colors.onSurface,
                    }}
                  >
                    {item.name}
                  </Text>
                </TouchableRipple>
              );
            }}
          />
        </Modal>
      </Portal>

      <View style={styles.footer}>
        {showRating ? (
          <RatingRow skillProgress={progress} onRate={handleRate} />
        ) : (
          <Button
            mode="contained"
            onPress={() => { Keyboard.dismiss(); setShowRating(true); }}
            accessibilityLabel={`Done practicing ${skill.name}`}
            style={styles.doneButton}
          >
            Done
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  skillName: { marginBottom: 4 },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  doneButton: { width: '100%' },
  repRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  repButton: { minWidth: 48 },
  repInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    textAlign: 'center',
    fontSize: 16, // EXCEPTION: TextInput cannot use Paper Text variant
  },
  equipmentButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  pickerModal: {
    margin: 16,
    borderRadius: 12,
    padding: 0,
    maxHeight: '60%',
  },
  pickerTitle: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pickerRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
