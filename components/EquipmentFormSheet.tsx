import React, { useState, useCallback, useEffect } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { EquipmentRow } from '@/lib/db/queries';

export type EquipmentFormData = {
  name: string;
  purchaseDate: string | null; // YYYY-MM-DD or null
  notes: string;
};

export type EquipmentFormSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  onSave: (data: EquipmentFormData) => void;
  initialData?: EquipmentRow | null;
  isSaving?: boolean;
  saveError?: boolean;
};

function formatDisplayDate(isoDate: string | null): string {
  if (!isoDate) return 'Select date';
  const d = new Date(isoDate + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return isoDate;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function isoDateToDate(isoDate: string | null): Date {
  if (!isoDate) return new Date();
  const d = new Date(isoDate + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function dateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function EquipmentFormSheet({
  visible,
  onDismiss,
  onSave,
  initialData,
  isSaving = false,
  saveError = false,
}: EquipmentFormSheetProps) {
  const theme = useTheme();
  const isEditing = !!initialData;

  const [name, setName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [nameError, setNameError] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialData?.name ?? '');
      setPurchaseDate(initialData?.purchase_date ?? null);
      setNotes(initialData?.notes ?? '');
      setNameError(false);
      setShowDatePicker(false);
    }
  }, [visible, initialData]);

  const handleDismiss = useCallback(() => {
    setShowDatePicker(false);
    onDismiss();
  }, [onDismiss]);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    onSave({
      name: name.trim(),
      purchaseDate,
      notes: notes.trim(),
    });
  }, [name, purchaseDate, notes, onSave]);

  const handleDateChange = useCallback(
    (_event: unknown, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
      }
      if (selectedDate) {
        setPurchaseDate(dateToIso(selectedDate));
      }
    },
    [],
  );

  const toggleDatePicker = useCallback(() => {
    setShowDatePicker((prev) => !prev);
  }, []);

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
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text variant="titleMedium" style={styles.title}>
            {isEditing ? 'Edit Kendama' : 'Add Kendama'}
          </Text>

          <TextInput
            label="Name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (nameError) setNameError(false);
            }}
            mode="outlined"
            error={nameError}
            style={styles.input}
            accessibilityLabel="Kendama name"
            autoFocus
          />

          <View style={styles.dateField}>
            <Button
              mode="outlined"
              onPress={toggleDatePicker}
              accessibilityLabel="Purchase date"
              accessibilityRole="button"
              style={styles.dateButton}
            >
              {formatDisplayDate(purchaseDate)}
            </Button>
            {purchaseDate && (
              <Button
                mode="text"
                onPress={() => {
                  setPurchaseDate(null);
                  setShowDatePicker(false);
                }}
                accessibilityLabel="Clear purchase date"
              >
                Clear
              </Button>
            )}
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={isoDateToDate(purchaseDate)}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}

          <TextInput
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            accessibilityLabel="Notes"
          />

          {saveError && (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>
              Could not save. Please try again.
            </Text>
          )}

          <Button
            mode="contained"
            onPress={handleSave}
            disabled={isSaving}
            style={styles.saveButton}
            accessibilityLabel={isEditing ? 'Save changes' : 'Add kendama'}
          >
            Save
          </Button>
        </ScrollView>
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
  input: {
    marginBottom: 12,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  dateButton: {
    flex: 1,
  },
  saveButton: {
    marginTop: 4,
  },
});
