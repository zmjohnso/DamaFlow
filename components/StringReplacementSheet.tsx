import React, { useState, useCallback, useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Button, Modal, Portal, Text, useTheme } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';

export type StringReplacementSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  onSave: (data: { equipment_id: number; replaced_at: string }) => void;
  equipmentId: number;
};

function dateToIso(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function StringReplacementSheet({
  visible,
  onDismiss,
  onSave,
  equipmentId,
}: StringReplacementSheetProps) {
  const theme = useTheme();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedDate(new Date());
      setShowDatePicker(false);
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    setShowDatePicker(false);
    onDismiss();
  }, [onDismiss]);

  const handleSave = useCallback(() => {
    onSave({
      equipment_id: equipmentId,
      replaced_at: dateToIso(selectedDate),
    });
  }, [equipmentId, selectedDate, onSave]);

  const handleDateChange = useCallback(
    (_event: unknown, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
      }
      if (selectedDate) {
        setSelectedDate(selectedDate);
      }
    },
    [],
  );

  const toggleDatePicker = useCallback(() => {
    setShowDatePicker((prev) => !prev);
  }, []);

  const displayDate = selectedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={[
          styles.sheet,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text variant="titleMedium" style={styles.title}>
          Log String Replacement
        </Text>

        <Button
          mode="outlined"
          onPress={toggleDatePicker}
          accessibilityLabel="Replacement date"
          accessibilityRole="button"
          style={styles.dateButton}
        >
          {displayDate}
        </Button>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={handleDateChange}
          />
        )}

        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          accessibilityLabel="Save string replacement"
        >
          Save
        </Button>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  title: {
    marginBottom: 16,
  },
  dateButton: {
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 4,
  },
});
