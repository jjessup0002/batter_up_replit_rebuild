import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineupCard } from '@/components/LineupCard';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { Lineup } from '@/models/types';
import { deleteLineup, generateId, getLineups, saveLineup } from '@/services/storage';
import { useColors } from '@/hooks/useColors';

export default function SavedLineupsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [loading, setLoading] = useState(true);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const load = useCallback(async () => {
    const ls = await getLineups();
    setLineups(ls.sort((a, b) => (b.lastUsedAt ?? b.updatedAt) > (a.lastUsedAt ?? a.updatedAt) ? 1 : -1));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    await deleteLineup(id);
    setLineups((prev) => prev.filter((l) => l.id !== id));
  };

  const handleDuplicate = async (lineup: Lineup) => {
    const copy: Lineup = {
      ...lineup,
      id: generateId(),
      name: `${lineup.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUsedAt: undefined,
    };
    await saveLineup(copy);
    setLineups((prev) => [copy, ...prev]);
  };

  const handleFavorite = async (lineup: Lineup) => {
    const updated = { ...lineup, isFavorite: !lineup.isFavorite };
    await saveLineup(updated);
    setLineups((prev) => prev.map((l) => (l.id === lineup.id ? updated : l)));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <ThemedText variant="h2">Saved Lineups</ThemedText>
        <TouchableOpacity onPress={() => router.push('/lineups/editor')} style={styles.addBtn}>
          <Feather name="plus" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {lineups.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Feather name="bookmark" size={48} color={colors.mutedForeground} />
          <ThemedText variant="h3" align="center" style={{ marginTop: 16 }}>No lineups saved yet</ThemedText>
          <ThemedText variant="caption" align="center" style={{ marginTop: 6, marginBottom: 24 }}>
            Create a lineup to get started
          </ThemedText>
          <Button title="Create Lineup" onPress={() => router.push('/lineups/editor')} />
        </View>
      ) : (
        <FlatList
          data={lineups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 20 }]}
          renderItem={({ item }) => (
            <LineupCard
              lineup={item}
              onStartGame={() => router.push({ pathname: '/game/setup', params: { lineupId: item.id } })}
              onEdit={() => router.push({ pathname: '/lineups/editor', params: { lineupId: item.id } })}
              onDuplicate={() => handleDuplicate(item)}
              onDelete={() => handleDelete(item.id)}
              onFavorite={() => handleFavorite(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4, marginRight: 8 },
  addBtn: { padding: 4, marginLeft: 'auto' },
  list: { padding: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
});
