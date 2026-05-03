import React, { useState } from 'react';
import { View, Linking, StyleSheet, TextInput } from 'react-native';
import {
  Text,
  Button,
  useTheme,
  Modal,
  Portal,
  Dialog,
  Snackbar,
  Switch,
  TouchableRipple,
} from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import TierBadge from '@/components/TierBadge';
import { db } from '@/lib/db/client';
import {
  getSkillById,
  getSkillProgressById,
  getSessionsForSkillWithEquipment,
  updateSession,
  deleteSession,
  bulkInsertSkillProgress,
  setSkillMastered,
} from '@/lib/db/queries';
import { bulkInit } from '@/lib/fsrs/scheduler';
import type { SessionWithEquipment } from '@/lib/db/queries';
import useQueueStore from '@/store/queueStore';

const RATING_LABELS: Record<number, string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
};

const RATINGS: { label: string; value: 1 | 2 | 3 | 4 }[] = [
  { label: 'Again', value: 1 },
  { label: 'Hard',  value: 2 },
  { label: 'Good',  value: 3 },
  { label: 'Easy',  value: 4 },
];

function formatSessionDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isValidTutorialUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

type SessionHistoryRowProps = {
  session: SessionWithEquipment;
  theme: ReturnType<typeof useTheme>;
  onPress: () => void;
};

function SessionHistoryRow({ session, theme, onPress }: SessionHistoryRowProps) {
  const dateStr = formatSessionDate(session.logged_at);
  const repsStr = session.reps !== null ? session.reps.toString() : '—';
  const ratingStr = RATING_LABELS[session.self_rating] ?? '—';
  const equipmentLabel = session.equipment_name
    ? `, using ${session.equipment_name}`
    : '';

  return (
    <TouchableRipple
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Edit session from ${dateStr}${equipmentLabel}`}
    >
      <View style={[styles.sessionRow, { borderBottomColor: theme.colors.outlineVariant }]}>
        <Text variant="bodyMedium" style={styles.sessionDate}>{dateStr}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {repsStr} reps · {ratingStr}
          {session.equipment_name ? ` · ${session.equipment_name}` : ''}
        </Text>
      </View>
    </TouchableRipple>
  );
}

export default function SkillDetailScreen() {
  const { skillId } = useLocalSearchParams<{ skillId: string | string[] }>();
  const theme = useTheme();
  const parsedSkillId = typeof skillId === 'string' && /^\d+$/.test(skillId) ? parseInt(skillId, 10) : NaN;

  let skill: ReturnType<typeof getSkillById>;
  try {
    skill = Number.isNaN(parsedSkillId) ? undefined : getSkillById(db, parsedSkillId);
  } catch {
    skill = undefined;
  }

  const [sessionHistory, setSessionHistory] = useState<SessionWithEquipment[]>(() => {
    try {
      return Number.isNaN(parsedSkillId) ? [] : getSessionsForSkillWithEquipment(db, parsedSkillId);
    } catch {
      return [];
    }
  });

  const [progress, setProgress] = useState<ReturnType<typeof getSkillProgressById>>(() => {
    try {
      return Number.isNaN(parsedSkillId) ? undefined : getSkillProgressById(db, parsedSkillId);
    } catch {
      return undefined;
    }
  });

  // Edit sheet state
  const [editingSession, setEditingSession] = useState<SessionWithEquipment | null>(null);
  const [editReps, setEditReps] = useState('');
  const [editRating, setEditRating] = useState<1 | 2 | 3 | 4>(3);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Error snackbar state
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function reloadSessions() {
    try {
      setSessionHistory(Number.isNaN(parsedSkillId) ? [] : getSessionsForSkillWithEquipment(db, parsedSkillId));
    } catch {
      setSessionHistory([]);
    }
  }

  function reloadProgress() {
    try {
      setProgress(Number.isNaN(parsedSkillId) ? undefined : getSkillProgressById(db, parsedSkillId));
    } catch {
      setProgress(undefined);
    }
  }

  function handleToggleMastered() {
    if (Number.isNaN(parsedSkillId)) return;
    const newMastered = !(progress?.mastered ?? false);
    const nowIso = new Date().toISOString();
    try {
      if (newMastered && !progress) {
        const results = bulkInit([parsedSkillId], nowIso);
        if (results.length === 0) {
          setSnackbarMessage('Could not update mastery. Please try again.');
          return;
        }
        bulkInsertSkillProgress(db, results);
      }
      setSkillMastered(db, parsedSkillId, newMastered);
      reloadProgress();
      useQueueStore.getState().loadQueue();
    } catch {
      reloadProgress();
      setSnackbarMessage('Could not update mastery. Please try again.');
    }
  }

  function openEditSheet(session: SessionWithEquipment) {
    setEditingSession(session);
    setEditReps(session.reps !== null ? String(session.reps) : '');
    const rating = session.self_rating;
    setEditRating((rating >= 1 && rating <= 4 ? rating : 3) as 1 | 2 | 3 | 4);
  }

  function handleSaveEdit() {
    if (!editingSession || isSaving) return;
    setIsSaving(true);
    const repInt = parseInt(editReps, 10);
    const parsedReps = editReps === '' || Number.isNaN(repInt) ? null : repInt;
    try {
      updateSession(db, editingSession.id, { reps: parsedReps, self_rating: editRating });
      useQueueStore.getState().loadQueue();
      reloadSessions();
      setEditingSession(null);
    } catch {
      reloadSessions();
      setSnackbarMessage('Could not save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleDeleteSession() {
    if (!editingSession) return;
    try {
      deleteSession(db, editingSession.id);
      useQueueStore.getState().loadQueue();
      reloadSessions();
      setShowDeleteDialog(false);
      setEditingSession(null);
    } catch {
      setShowDeleteDialog(false);
      setEditingSession(null);
      reloadSessions();
      setSnackbarMessage('Could not delete session. Please try again.');
    }
  }

  const tutorialUrl = skill?.video_url?.trim() ?? '';
  const showTutorialButton = tutorialUrl !== '' && isValidTutorialUrl(tutorialUrl);

  const handleWatchTutorial = async () => {
    try {
      await Linking.openURL(tutorialUrl);
    } catch {
      // Ignore malformed or unsupported URLs so the screen stays usable.
    }
  };

  if (!skill) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['bottom']}
      >
        <View style={styles.notFound}>
          <Text variant="bodyLarge">Skill not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const listHeader = (
    <View style={styles.header}>
      <Text
        variant="titleLarge"
        accessibilityRole="header"
        style={styles.skillName}
      >
        {skill.name}
      </Text>
      <TierBadge tier={skill.tier as 'beginner' | 'intermediate' | 'advanced'} />
      {skill.description ? (
        <Text variant="bodyLarge" style={styles.description}>
          {skill.description}
        </Text>
      ) : null}
      {progress && sessionHistory.length > 0 ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Next review: {formatSessionDate(progress.due)}
        </Text>
      ) : null}
      {showTutorialButton ? (
        <Button
          mode="outlined"
          onPress={handleWatchTutorial}
          accessibilityLabel={`Watch tutorial for ${skill.name} in browser`}
          style={styles.tutorialButton}
        >
          Watch Tutorial
        </Button>
      ) : null}
      <Button
        mode="contained"
        onPress={() => router.push({ pathname: '/(tabs)/practice/[skillId]', params: { skillId: parsedSkillId } })}
        accessibilityLabel={`Practice ${skill.name}`}
        style={styles.practiceButton}
      >
        Practice
      </Button>
      <View style={styles.masteryRow}>
        <Text variant="bodyMedium" style={{ flex: 1 }}>
          {progress?.mastered ? 'Mastered' : 'Not mastered'}
        </Text>
        <Switch
          value={progress?.mastered ?? false}
          onValueChange={handleToggleMastered}
          accessibilityRole="switch"
          accessibilityLabel={
            progress?.mastered
              ? `${skill.name} is mastered — tap to unmark`
              : `${skill.name} is not mastered — tap to mark as mastered`
          }
        />
      </View>
      <Text variant="titleSmall" style={styles.historyHeading}>Session History</Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['bottom']}
    >
      <Portal>
        {/* Edit bottom sheet */}
        <Modal
          visible={editingSession !== null}
          onDismiss={() => { if (!showDeleteDialog) setEditingSession(null); }}
          contentContainerStyle={[styles.editSheet, { backgroundColor: theme.colors.surface }]}
        >
          {editingSession ? (
            <View>
              <Text variant="titleMedium" style={styles.editTitle}>Edit Session</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatSessionDate(editingSession.logged_at)}
              </Text>
              <TextInput
                style={[
                  styles.editRepsInput,
                  { color: theme.colors.onSurface, borderColor: theme.colors.outline },
                ]}
                value={editReps}
                onChangeText={text => setEditReps(text.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                placeholder="Reps (optional)"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                accessibilityLabel="Edit rep count"
              />
              <View style={styles.editRatingRow}>
                {RATINGS.map(({ label, value }) => (
                  <Button
                    key={value}
                    mode={editRating === value ? 'contained' : 'outlined'}
                    onPress={() => setEditRating(value)}
                    style={styles.editRatingButton}
                    accessibilityLabel={`Rate ${label}`}
                    accessibilityRole="button"
                  >
                    {label}
                  </Button>
                ))}
              </View>

              <Button mode="contained" onPress={handleSaveEdit} style={styles.editSaveButton} disabled={isSaving}>
                Save
              </Button>
              <Button
                mode="text"
                onPress={() => setShowDeleteDialog(true)}
                textColor={theme.colors.error}
                accessibilityLabel="Delete this session"
              >
                Delete session
              </Button>
            </View>
          ) : null}
        </Modal>

        {/* Delete confirmation dialog */}
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)} testID="delete-dialog">
          <Dialog.Title>Delete this session?</Dialog.Title>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)} testID="dialog-cancel-btn">Cancel</Button>
            <Button onPress={handleDeleteSession} textColor={theme.colors.primary} testID="dialog-delete-btn">Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FlashList
        data={sessionHistory}
        keyExtractor={item => item.id.toString()}
        estimatedItemSize={56}
        renderItem={({ item }) => (
          <SessionHistoryRow
            session={item}
            theme={theme}
            onPress={() => openEditSheet(item)}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <Text
            variant="bodyMedium"
            style={[styles.emptyState, { color: theme.colors.onSurfaceVariant }]}
          >
            No sessions logged yet. Practice this skill and rate your session to start tracking.
          </Text>
        }
        contentContainerStyle={styles.listContent}
      />

      <Snackbar
        visible={snackbarMessage !== ''}
        onDismiss={() => setSnackbarMessage('')}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingBottom: 24 },
  header: { padding: 16, gap: 12 },
  skillName: { marginBottom: 4 },
  description: { marginTop: 8 },
  tutorialButton: { marginTop: 8, alignSelf: 'flex-start' },
  practiceButton: { alignSelf: 'flex-start' },
  historyHeading: { marginTop: 16, marginBottom: 4 },
  masteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  sessionDate: {},
  emptyState: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Edit sheet styles
  editSheet: {
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  editTitle: { marginBottom: 4 },
  editRepsInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 12,
    fontSize: 16, // EXCEPTION: TextInput cannot use Paper Text variant
  },
  editRatingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  editRatingButton: { flexBasis: '47%', flexGrow: 1 },
  editSaveButton: { marginBottom: 8 },
});
