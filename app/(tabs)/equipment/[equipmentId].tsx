import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar, Button, Dialog, Portal, Snackbar, Text, useTheme } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { db } from '@/lib/db/client';
import {
  getEquipmentById,
  getStringReplacementsForEquipment,
  insertStringReplacement,
  deleteEquipment,
} from '@/lib/db/queries';
import type { EquipmentRow, StringReplacementRow } from '@/lib/db/queries';
import StringReplacementSheet from '@/components/StringReplacementSheet';

function formatDate(isoString: string): string {
  // Append UTC midnight for date-only strings to avoid local-timezone off-by-one
  const parseString = isoString.includes('T') ? isoString : isoString + 'T00:00:00Z';
  const d = new Date(parseString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

type ReplacementRowProps = {
  item: StringReplacementRow;
};

function ReplacementRow({ item }: ReplacementRowProps) {
  const theme = useTheme();
  const dateStr = formatDate(item.replaced_at);

  return (
    <View
      style={[styles.replacementRow, { borderBottomColor: theme.colors.outlineVariant }]}
      accessible={true}
      accessibilityLabel={`String replacement on ${dateStr}`}
    >
      <Text variant="bodyMedium">{dateStr}</Text>
    </View>
  );
}

export default function EquipmentDetailScreen() {
  const { equipmentId } = useLocalSearchParams<{ equipmentId: string | string[] }>();
  const theme = useTheme();
  const parsedId = typeof equipmentId === 'string' && /^\d+$/.test(equipmentId) ? parseInt(equipmentId, 10) : NaN;

  const [equipmentItem, setEquipmentItem] = useState<EquipmentRow | undefined>(undefined);
  const [replacements, setReplacements] = useState<StringReplacementRow[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const reload = useCallback(() => {
    if (Number.isNaN(parsedId)) {
      setLoadError(true);
      return;
    }
    try {
      const eq = getEquipmentById(db, parsedId);
      setEquipmentItem(eq);
      const reps = getStringReplacementsForEquipment(db, parsedId);
      setReplacements(reps);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [parsedId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleSaveReplacement = useCallback(
    (data: { equipment_id: number; replaced_at: string }) => {
      try {
        insertStringReplacement(db, data);
      } catch {
        // Silent failure per feedback philosophy
        return;
      }
      try {
        reload();
        setSheetVisible(false);
      } catch {
        setLoadError(true);
      }
    },
    [reload],
  );

  const handleOpenDeleteDialog = useCallback(() => {
    setDialogVisible(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setDialogVisible(false);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (Number.isNaN(parsedId)) return;
    setIsDeleting(true);
    try {
      deleteEquipment(db, parsedId);
      setDialogVisible(false);
      setIsDeleting(false);
      router.back();
    } catch {
      setDialogVisible(false);
      setIsDeleting(false);
      setSnackbarVisible(true);
    }
  }, [parsedId]);

  const handleDismissSnackbar = useCallback(() => {
    setSnackbarVisible(false);
  }, []);

  if (loadError || !equipmentItem) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top']}
      >
        <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
          <Appbar.BackAction onPress={() => router.back()} accessibilityLabel="Go back" />
          <Appbar.Content title="Gear Detail" />
        </Appbar.Header>
        <View style={styles.notFound}>
          <Text variant="bodyLarge">Kendama not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const listHeader = (
    <View style={styles.headerSection}>
      <Text
        variant="titleLarge"
        accessibilityRole="header"
        style={styles.name}
      >
        {equipmentItem.name}
      </Text>
      {equipmentItem.purchase_date ? (
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Purchased: {formatDate(equipmentItem.purchase_date)}
        </Text>
      ) : null}
      {equipmentItem.notes ? (
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {equipmentItem.notes}
        </Text>
      ) : null}
      <Button
        mode="outlined"
        onPress={() => setSheetVisible(true)}
        accessibilityLabel="Log string replacement"
        style={styles.logButton}
      >
        Log String Replacement
      </Button>
    </View>
  );

  const listFooter = (
    <View style={styles.footerSection}>
      <Button
        mode="text"
        textColor="#B85C50"
        onPress={handleOpenDeleteDialog}
        accessibilityLabel="Delete kendama"
        accessibilityRole="button"
        disabled={isDeleting}
      >
        Delete Kendama
      </Button>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} accessibilityLabel="Go back" />
        <Appbar.Content title={equipmentItem.name} />
      </Appbar.Header>

      <StringReplacementSheet
        visible={sheetVisible}
        onDismiss={() => setSheetVisible(false)}
        onSave={handleSaveReplacement}
        equipmentId={equipmentItem.id}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={handleCancelDelete}>
          <Dialog.Title>Delete {equipmentItem.name}?</Dialog.Title>
          <Dialog.Content>
            <Text
              variant="bodyMedium"
              accessibilityLabel="This will remove the kendama and its string replacement history. Sessions logged with this kendama will remain in your practice history."
            >
              This will remove the kendama and its string replacement history. Sessions logged with this kendama will remain in your practice history.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCancelDelete} accessibilityLabel="Cancel delete" disabled={isDeleting}>Cancel</Button>
            <Button onPress={handleConfirmDelete} textColor={theme.colors.error} accessibilityLabel="Confirm delete" disabled={isDeleting}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={handleDismissSnackbar}
        duration={3000}
        action={{ label: 'Dismiss', onPress: handleDismissSnackbar }}
      >
        Could not delete kendama
      </Snackbar>

      <FlashList<StringReplacementRow>
        data={replacements}
        keyExtractor={(item) => item.id.toString()}
        estimatedItemSize={56}
        renderItem={({ item }) => <ReplacementRow item={item} />}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          <Text
            variant="bodyMedium"
            style={[styles.emptyState, { color: theme.colors.onSurfaceVariant }]}
            accessibilityLabel="No string replacements logged yet."
          >
            No string replacements logged yet.
          </Text>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerSection: { padding: 16, gap: 8 },
  name: { marginBottom: 4 },
  logButton: { marginTop: 8, alignSelf: 'flex-start' },
  footerSection: { padding: 16, alignItems: 'center', marginTop: 8 },
  listContent: { paddingBottom: 24 },
  replacementRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
