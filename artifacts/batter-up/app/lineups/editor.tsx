import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlayerCard } from '@/components/PlayerCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { useApp } from '@/context/AppContext';
import { Lineup, Player } from '@/models/types';
import { generateId, getLineups, saveLineup } from '@/services/storage';
import { useColors } from '@/hooks/useColors';

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'EH', 'OF'];

function emptyPlayer(): Omit<Player, 'battingOrder' | 'createdAt'> {
  return { id: generateId(), name: '', jerseyNumber: '', primaryPosition: '', isActive: true };
}

export default function LineupEditorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lineupId } = useLocalSearchParams<{ lineupId?: string }>();
  const { settings } = useApp();
  const isEditing = !!lineupId;

  const [lineupName, setLineupName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState(emptyPlayer());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    if (lineupId) {
      getLineups().then((ls) => {
        const lineup = ls.find((l) => l.id === lineupId);
        if (lineup) {
          setLineupName(lineup.name);
          setTeamName(lineup.teamName);
          setPlayers(lineup.players);
        }
      });
    }
  }, [lineupId]);

  const validateNewPlayer = () => {
    const errs: Record<string, string> = {};
    if (!newPlayer.name.trim()) errs.name = 'Player name is required.';
    if (settings.requireJerseyNumber && !newPlayer.jerseyNumber.trim()) {
      errs.jerseyNumber = 'Jersey number is required.';
    }
    if (settings.preventDuplicateJerseys && newPlayer.jerseyNumber) {
      const dup = players.find((p) => p.jerseyNumber === newPlayer.jerseyNumber && p.id !== newPlayer.id);
      if (dup) errs.jerseyNumber = 'That jersey number is already used.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddPlayer = () => {
    if (!validateNewPlayer()) return;
    const player: Player = {
      ...newPlayer,
      battingOrder: players.length + 1,
      createdAt: new Date().toISOString(),
    };
    setPlayers((prev) => [...prev, player]);
    setNewPlayer(emptyPlayer());
    setShowAddForm(false);
    setErrors({});
  };

  const movePlayer = (index: number, dir: 'up' | 'down') => {
    const arr = [...players];
    const swap = dir === 'up' ? index - 1 : index + 1;
    [arr[index], arr[swap]] = [arr[swap], arr[index]];
    setPlayers(arr.map((p, i) => ({ ...p, battingOrder: i + 1 })));
  };

  const deletePlayer = (id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id).map((p, i) => ({ ...p, battingOrder: i + 1 })));
  };

  const toggleActive = (id: string) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)));
  };

  const handleSave = async () => {
    if (!lineupName.trim()) {
      Alert.alert('Lineup name required', 'Please enter a name for this lineup.');
      return;
    }
    if (players.length === 0) {
      Alert.alert('No players', 'Add at least one player before saving.');
      return;
    }
    setSaving(true);
    const lineup: Lineup = {
      id: lineupId ?? generateId(),
      name: lineupName.trim(),
      teamName: teamName.trim(),
      players,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveLineup(lineup);
    setSaving(false);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/lineups');
    }
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/lineups');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <ThemedText variant="h2">{isEditing ? 'Edit Lineup' : 'New Lineup'}</ThemedText>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={{ marginLeft: 'auto' }}>
          <ThemedText variant="button" color={colors.primary}>Save</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 20 }]} keyboardShouldPersistTaps="handled">
        {/* Lineup info */}
        <Card style={{ marginBottom: 16 }}>
          <ThemedText variant="label" style={{ marginBottom: 6 }}>Lineup Name *</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            placeholder="e.g. Warren County 8U"
            placeholderTextColor={colors.mutedForeground}
            value={lineupName}
            onChangeText={setLineupName}
          />
          <ThemedText variant="label" style={{ marginTop: 12, marginBottom: 6 }}>Team Name</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            placeholder="Optional"
            placeholderTextColor={colors.mutedForeground}
            value={teamName}
            onChangeText={setTeamName}
          />
        </Card>

        {/* Players */}
        <View style={styles.sectionHeader}>
          <ThemedText variant="h3">Batting Order</ThemedText>
          <ThemedText variant="caption">{players.filter((p) => p.isActive).length} active</ThemedText>
        </View>

        {players.map((player, index) => (
          <PlayerCard
            key={player.id}
            player={player}
            index={index}
            isLast={index === players.length - 1}
            onMoveUp={() => movePlayer(index, 'up')}
            onMoveDown={() => movePlayer(index, 'down')}
            onDelete={() => deletePlayer(player.id)}
            onToggleActive={() => toggleActive(player.id)}
          />
        ))}

        {/* Add player form */}
        {showAddForm ? (
          <Card style={{ marginBottom: 12 }}>
            <ThemedText variant="h3" style={{ marginBottom: 12 }}>New Player</ThemedText>

            <ThemedText variant="label" style={{ marginBottom: 4 }}>Name *</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: errors.name ? colors.destructive : colors.border }]}
              placeholder="Player name"
              placeholderTextColor={colors.mutedForeground}
              value={newPlayer.name}
              onChangeText={(t) => setNewPlayer((p) => ({ ...p, name: t }))}
              autoFocus
            />
            {errors.name && <ThemedText variant="caption" color={colors.destructive}>{errors.name}</ThemedText>}

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="label" style={{ marginBottom: 4, marginTop: 10 }}>Jersey #</ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: errors.jerseyNumber ? colors.destructive : colors.border }]}
                  placeholder="#"
                  placeholderTextColor={colors.mutedForeground}
                  value={newPlayer.jerseyNumber}
                  onChangeText={(t) => setNewPlayer((p) => ({ ...p, jerseyNumber: t }))}
                  keyboardType="numeric"
                  maxLength={3}
                />
                {errors.jerseyNumber && <ThemedText variant="caption" color={colors.destructive}>{errors.jerseyNumber}</ThemedText>}
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <ThemedText variant="label" style={{ marginBottom: 4, marginTop: 10 }}>Position</ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                  placeholder="e.g. SS"
                  placeholderTextColor={colors.mutedForeground}
                  value={newPlayer.primaryPosition}
                  onChangeText={(t) => setNewPlayer((p) => ({ ...p, primaryPosition: t }))}
                  autoCapitalize="characters"
                  maxLength={3}
                />
              </View>
            </View>

            {/* Quick position picker */}
            <View style={styles.positionGrid}>
              {POSITIONS.map((pos) => (
                <TouchableOpacity
                  key={pos}
                  style={[
                    styles.posChip,
                    {
                      backgroundColor: newPlayer.primaryPosition === pos ? colors.primary : colors.muted,
                      borderColor: newPlayer.primaryPosition === pos ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setNewPlayer((p) => ({ ...p, primaryPosition: p.primaryPosition === pos ? '' : pos }))}
                >
                  <ThemedText
                    variant="caption"
                    color={newPlayer.primaryPosition === pos ? '#fff' : colors.foreground}
                    style={{ fontWeight: '600' }}
                  >
                    {pos}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formActions}>
              <Button title="Cancel" variant="outline" size="md" style={{ flex: 1 }} onPress={() => { setShowAddForm(false); setErrors({}); }} />
              <Button title="Add Player" size="md" style={{ flex: 2, marginLeft: 10 }} onPress={handleAddPlayer} />
            </View>
          </Card>
        ) : (
          <TouchableOpacity
            style={[styles.addPlayerBtn, { borderColor: colors.primary, borderStyle: 'dashed' }]}
            onPress={() => setShowAddForm(true)}
          >
            <Feather name="plus" size={18} color={colors.primary} />
            <ThemedText variant="button" color={colors.primary} style={{ marginLeft: 8 }}>Add Player</ThemedText>
          </TouchableOpacity>
        )}

        <Button
          title={saving ? 'Saving...' : 'Save Lineup'}
          size="lg"
          fullWidth
          loading={saving}
          style={{ marginTop: 20 }}
          onPress={handleSave}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4, marginRight: 8 },
  content: { padding: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  twoCol: { flexDirection: 'row' },
  positionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, marginBottom: 12 },
  posChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  formActions: { flexDirection: 'row', marginTop: 12 },
  addPlayerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 8,
  },
});
