import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { db } from '@/lib/db/client';
import {
  getAllEquipmentWithReplacementCount,
  insertEquipment,
} from '@/lib/db/queries';
import type { EquipmentWithCount } from '@/lib/db/queries';
import EquipmentFormSheet from '@/components/EquipmentFormSheet';
import type { EquipmentFormData } from '@/components/EquipmentFormSheet';

function formatDate(isoString: string): string {
  // Append UTC midnight for date-only strings to avoid local-timezone off-by-one
  const parseString = isoString.includes('T') ? isoString : isoString + 'T00:00:00Z';
  const d = new Date(parseString);
  if (Number.isNaN(d.getTime())) return isoString;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

type GearRowProps = {
  item: EquipmentWithCount;
  onPress: (item: EquipmentWithCount) => void;
};

function GearRow({ item, onPress }: GearRowProps) {
  const theme = useTheme();
  const dateText = item.purchase_date
    ? formatDate(item.purchase_date)
    : formatDate(item.added_at);
  const replacementWord = item.replacementCount === 1 ? 'string replacement' : 'string replacements';
  const label = `${item.name}, ${item.replacementCount} ${replacementWord}`;

  return (
    <Pressable
      style={[styles.row, { borderBottomColor: theme.colors.outlineVariant }]}
      accessible={true}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={() => onPress(item)}
    >
      <Text variant="bodyLarge" style={styles.rowName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text variant="bodyMedium" style={[styles.rowDate, { color: theme.colors.onSurfaceVariant }]}>
        {dateText}
      </Text>
      <View style={[styles.countBadge, { backgroundColor: theme.colors.primaryContainer }]}>
        <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer }}>
          {item.replacementCount}
        </Text>
      </View>
    </Pressable>
  );
}

export default function GearScreen() {
  const theme = useTheme();
  const [equipmentList, setEquipmentList] = useState<EquipmentWithCount[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const reloadEquipment = useCallback(() => {
    try {
      const rows = getAllEquipmentWithReplacementCount(db);
      setEquipmentList(rows);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadEquipment();
    }, [reloadEquipment])
  );

  const openAddSheet = useCallback(() => {
    setSheetVisible(true);
  }, []);

  const handleDismiss = useCallback(() => {
    setSheetVisible(false);
  }, []);

  const handleSave = useCallback(
    (data: EquipmentFormData) => {
      setIsSaving(true);
      setSaveError(false);
      try {
        insertEquipment(db, {
          name: data.name,
          notes: data.notes || null,
          purchase_date: data.purchaseDate,
          added_at: new Date().toISOString(),
        });
        reloadEquipment();
        setSheetVisible(false);
      } catch {
        setSaveError(true);
      } finally {
        setIsSaving(false);
      }
    },
    [reloadEquipment],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <EquipmentFormSheet
        visible={sheetVisible}
        onDismiss={handleDismiss}
        onSave={handleSave}
        isSaving={isSaving}
        saveError={saveError}
      />

      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.headerTitle}>Gear</Text>
        <Button
          mode="outlined"
          onPress={openAddSheet}
          accessibilityLabel="Add Kendama"
        >
          Add Kendama
        </Button>
      </View>

      {loadError ? (
        <View style={styles.emptyState}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onBackground }}>
            Could not load gear.
          </Text>
        </View>
      ) : equipmentList.length === 0 ? (
        <View style={styles.emptyState}>
          <Text variant="headlineSmall" style={{ color: theme.colors.onBackground }}>
            No gear yet.
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            Track your kendamas and string replacements.
          </Text>
          <Button
            mode="outlined"
            onPress={openAddSheet}
            accessibilityLabel="Add Kendama"
            style={styles.emptyButton}
          >
            Add Kendama
          </Button>
        </View>
      ) : (
        <FlashList<EquipmentWithCount>
          data={equipmentList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <GearRow item={item} onPress={() => router.push(`/equipment/${item.id}`)} />}
          estimatedItemSize={72}
          style={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { flex: 1 },
  list: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 72,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowName: { flex: 1, marginRight: 8 },
  rowDate: { marginRight: 8 },
  countBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyButton: { marginTop: 8 },
});
