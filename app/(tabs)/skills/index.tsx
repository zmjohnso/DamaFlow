import React, { useCallback, useState } from 'react';
import { StyleSheet, useColorScheme, View, ScrollView, Pressable, FlatList } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Chip, Searchbar, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import TierBadge from '@/components/TierBadge';
import { db } from '@/lib/db/client';
import { getSkillsWithMastery } from '@/lib/db/queries';
import type { SkillWithMastery } from '@/lib/db/queries';
import { customColors } from '@/lib/theme';

type TierFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';

const TIER_FILTERS: { key: TierFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
];

type SkillRowProps = {
  skill: SkillWithMastery;
  masteredColor: string;
  outlineColor: string;
};

function SkillRow({ skill, masteredColor, outlineColor }: SkillRowProps) {
  const theme = useTheme();
  const label = `${skill.name}, ${skill.tier}, ${skill.mastered ? 'mastered' : 'not yet mastered'}`;
  return (
    <Pressable
      style={[styles.row, { borderBottomColor: theme.colors.outlineVariant }]}
      accessible={true}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={() => router.push(`/(tabs)/skills/${skill.id}`)}
    >
      <FontAwesome
        name={skill.mastered ? 'check-circle' : 'circle-o'}
        size={20}
        color={skill.mastered ? masteredColor : outlineColor}
        style={styles.masteryIcon}
      />
      <Text variant="bodyLarge" style={styles.skillName} numberOfLines={1}>
        {skill.name}
      </Text>
      <TierBadge tier={skill.tier as 'beginner' | 'intermediate' | 'advanced'} />
    </Pressable>
  );
}

export default function SkillsScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const colors = customColors[colorScheme ?? 'light'];

  const [allSkills, setAllSkills] = useState<SkillWithMastery[]>([]);
  const [activeFilter, setActiveFilter] = useState<TierFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadError, setLoadError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      try {
        setAllSkills(getSkillsWithMastery(db));
        setLoadError(false);
      } catch {
        setLoadError(true);
      }
    }, [])
  );

  const tierFiltered =
    activeFilter === 'all' ? allSkills : allSkills.filter(s => s.tier === activeFilter);
  const filteredSkills = searchQuery.trim() === ''
    ? tierFiltered
    : tierFiltered.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );

  const listHeader = (
    <>
      <Searchbar
        placeholder="Search skills"
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClearIconPress={() => setSearchQuery('')}
        accessibilityLabel="Search skills"
        style={styles.searchBar}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {TIER_FILTERS.map(({ key, label }) => (
          <Chip
            key={key}
            mode="outlined"
            selected={activeFilter === key}
            onPress={() => setActiveFilter(key)}
            style={styles.filterChip}
          >
            {label}
          </Chip>
        ))}
      </ScrollView>
    </>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      {loadError ? (
        <>
          {listHeader}
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onBackground }}>
              Could not load skills.
            </Text>
          </View>
        </>
      ) : filteredSkills.length === 0 ? (
        <FlatList
          data={[]}
          keyExtractor={item => item.id.toString()}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onBackground }}>
                No skills match this filter.
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.clearFilter, { color: theme.colors.primary }]}
                onPress={() => { setActiveFilter('all'); setSearchQuery(''); }}
                accessibilityRole="button"
                accessibilityLabel="Clear filter"
              >
                Clear filter
              </Text>
            </View>
          }
          renderItem={() => null}
        />
      ) : (
        <FlatList
          data={filteredSkills}
          keyExtractor={item => item.id.toString()}
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => (
            <SkillRow
              skill={item}
              masteredColor={colors.mastered}
              outlineColor={theme.colors.outline}
            />
          )}
          style={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  filterRow: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: { marginRight: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 72,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  masteryIcon: { marginRight: 12 },
  skillName: { flex: 1, marginRight: 8 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  clearFilter: { marginTop: 4 },
  list: { flex: 1 },
});
