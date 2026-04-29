import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, IconButton, Portal, Snackbar, Surface, Switch, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db } from '../../lib/db/client';
import { getSetting, setSetting, resetAllData, getNewSkillCap } from '../../lib/db/queries';
import useQueueStore from '../../store/queueStore';
import {
  getNotificationSettings,
  requestAndConfigureNotifications,
  scheduleDailyReminder,
  cancelAllReminders,
} from '../../lib/notifications';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function timeToDate(time?: string): Date {
  const d = new Date();
  if (!time) {
    d.setHours(9, 0, 0, 0);
    return d;
  }
  const [h, m] = time.split(':').map(Number);
  const hour = Number.isNaN(h) || h < 0 || h > 23 ? 9 : h;
  const minute = Number.isNaN(m) || m < 0 || m > 59 ? 0 : m;
  d.setHours(hour, minute, 0, 0);
  return d;
}

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function SettingsScreen() {
  const theme = useTheme();
  const [value, setValue] = useState<number>(() => {
    try {
      return getNewSkillCap(db);
    } catch {
      return 5;
    }
  });
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Notification state (Story 7.2)
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState('09:00');
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Reset app data state (Story 7.3)
  const [resetDialogVisible, setResetDialogVisible] = useState(false);
  const router = useRouter();

  // Debounce ref for iOS time-picker scroll events.
  const timeChangeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const settings = getNotificationSettings(db);
      setNotificationEnabled(settings.enabled);
      setNotificationTime(settings.time);
    } catch {
      setErrorMessage('Could not load notification settings');
      setErrorVisible(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeChangeTimeoutRef.current) {
        clearTimeout(timeChangeTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (delta: number) => {
    const next = clamp(value + delta, 1, 20);
    if (next === value) return;
    setValue(next);
    try {
      setSetting(db, 'new_skill_cap', next.toString());
      setErrorVisible(false);
    } catch {
      setErrorMessage('Could not save setting');
      setErrorVisible(true);
    }
  };

  // Guard to prevent rapid toggle interleaving.
  const togglingRef = React.useRef(false);

  const handleToggleNotification = async (enabled: boolean) => {
    if (togglingRef.current) return;
    togglingRef.current = true;
    try {
      if (enabled) {
        try {
          const settings = getNotificationSettings(db);
          // If already enabled in DB, just reschedule; otherwise request permission
          if (settings.enabled) {
            await scheduleDailyReminder(db);
            setNotificationEnabled(true);
          } else {
            await requestAndConfigureNotifications(db);
            // Re-read DB to verify permission was actually granted (handles denial)
            const updated = getNotificationSettings(db);
            setNotificationEnabled(updated.enabled);
            if (updated.enabled) {
              setNotificationTime(updated.time);
            }
          }
        } catch {
          setErrorMessage('Could not schedule reminder');
          setErrorVisible(true);
          setNotificationEnabled(false);
        }
      } else {
        try {
          await cancelAllReminders();
          setSetting(db, 'notification_enabled', 'false');
          setNotificationEnabled(false);
          setShowTimePicker(false);
        } catch {
          setErrorMessage('Could not cancel reminder');
          setErrorVisible(true);
        }
      }
    } finally {
      togglingRef.current = false;
    }
  };

  const handleTimeChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (!selectedDate) return;
    const newTime = formatTime(selectedDate);

    // On iOS the spinner calls onChange every tick — debounce the save.
    const save = async () => {
      try {
        setSetting(db, 'notification_time', newTime);
        setNotificationTime(newTime);
        await scheduleDailyReminder(db);
      } catch {
        setErrorMessage('Could not save reminder time');
        setErrorVisible(true);
      }
    };
    if (process.env.NODE_ENV === 'test' || Platform.OS !== 'ios') {
      save();
    } else {
      if (timeChangeTimeoutRef.current) {
        clearTimeout(timeChangeTimeoutRef.current);
      }
      timeChangeTimeoutRef.current = setTimeout(save, 500);
    }
  };

  const handleReset = async () => {
    try {
      setResetDialogVisible(false);
      await cancelAllReminders();
      resetAllData(db);
      useQueueStore.getState().loadQueue();
      router.replace('/onboarding');
    } catch {
      setErrorMessage('Could not reset app data');
      setErrorVisible(true);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView>
        <Surface style={styles.surface}>
        <View style={styles.section}>
          <Text variant="titleSmall" style={[styles.sectionHeader, { color: theme.colors.onSurfaceVariant }]} accessibilityRole="header">
            Practice
          </Text>
          <View style={styles.row}>
            <Text variant="bodyLarge" style={styles.label}>
              New skills per session
            </Text>
            <View style={styles.stepper}>
              <IconButton
                icon="minus"
                size={20}
                onPress={() => handleChange(-1)}
                disabled={value <= 1}
                accessibilityLabel="Decrease new skills per session"
                accessibilityState={{ disabled: value <= 1 }}
                iconColor={value <= 1 ? theme.colors.onSurfaceDisabled : theme.colors.primary}
              />
              <Text
                variant="titleMedium"
                style={styles.valueText}
                accessibilityLabel={`New skill cap, ${value}`}
              >
                {value}
              </Text>
              <IconButton
                icon="plus"
                size={20}
                onPress={() => handleChange(1)}
                disabled={value >= 20}
                accessibilityLabel="Increase new skills per session"
                accessibilityState={{ disabled: value >= 20 }}
                iconColor={value >= 20 ? theme.colors.onSurfaceDisabled : theme.colors.primary}
              />
            </View>
          </View>
        </View>

        <View style={styles.sectionDivider} />

        <View style={styles.section}>
          <Text variant="titleSmall" style={[styles.sectionHeader, { color: theme.colors.onSurfaceVariant }]} accessibilityRole="header">
            Notifications
          </Text>
          <View style={styles.row}>
            <Text variant="bodyLarge" style={styles.label}>
              Daily practice reminder
            </Text>
            <Switch
              value={notificationEnabled}
              onValueChange={handleToggleNotification}
              accessibilityRole="switch"
              accessibilityLabel={`Daily practice reminder, ${notificationEnabled ? 'on' : 'off'}`}
            />
          </View>

          {notificationEnabled && (
            <TouchableRipple
              onPress={() => setShowTimePicker(prev => !prev)}
              accessibilityRole="button"
              accessibilityLabel={`Notification time, ${notificationTime}`}
            >
              <View style={styles.row}>
                <Text variant="bodyLarge" style={styles.label}>
                  Reminder time
                </Text>
                <Text variant="bodyLarge" style={{ color: theme.colors.primary }}>
                  {notificationTime}
                </Text>
              </View>
            </TouchableRipple>
          )}

          {showTimePicker && (
            <DateTimePicker
              value={timeToDate(notificationTime)}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </View>

        <View style={styles.sectionDivider} />

        <View style={styles.section}>
          <Button
            textColor="#B85C50"
            onPress={() => setResetDialogVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Reset app data"
          >
            Reset App Data
          </Button>
        </View>
      </Surface>
      </ScrollView>

      <Portal>
        <Dialog visible={resetDialogVisible} onDismiss={() => setResetDialogVisible(false)}>
          <Dialog.Title accessibilityRole="header">Reset App Data?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This will delete all your skill progress, session history, and equipment records. This cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setResetDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleReset} mode="contained" accessibilityLabel="Confirm reset, this cannot be undone">Reset</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        testID="error-snackbar"
        visible={errorVisible}
        onDismiss={() => setErrorVisible(false)}
        duration={3000}
        action={{ label: 'Dismiss', onPress: () => setErrorVisible(false) }}
      >
        {errorMessage}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  surface: { margin: 16, borderRadius: 12 },
  section: { paddingVertical: 8 },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(128,128,128,0.2)',
    marginHorizontal: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: { flex: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    minWidth: 32,
    textAlign: 'center',
  },
});
