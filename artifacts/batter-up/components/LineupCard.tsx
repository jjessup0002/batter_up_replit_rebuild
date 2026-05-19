import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Lineup } from '@/models/types';
import { Card } from './ui/Card';
import { ThemedText } from './ui/ThemedText';

interface LineupCardProps {
  lineup: Lineup;
  onStartGame: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onFavorite: () => void;
}

export function LineupCard({
  lineup,
  onStartGame,
  onEdit,
  onDuplicate,
  onDelete,
  onFavorite,
}: LineupCardProps) {
  const colors = useColors();
  const activePlayers = lineup.players.filter((p) => p.isActive);

  const formatDate = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Lineup',
      `Remove "${lineup.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <ThemedText variant="h3">{lineup.name}</ThemedText>
            {lineup.isFavorite && (
              <Feather name="star" size={14} color={colors.accent} style={{ marginLeft: 4 }} />
            )}
          </View>
          {lineup.teamName ? (
            <ThemedText variant="caption" style={{ marginTop: 1 }}>{lineup.teamName}</ThemedText>
          ) : null}
        </View>
        <TouchableOpacity onPress={onFavorite} style={styles.starBtn}>
          <Feather
            name={lineup.isFavorite ? 'star' : 'star'}
            size={20}
            color={lineup.isFavorite ? colors.accent : colors.muted}
          />
        </TouchableOpacity>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Feather name="users" size={13} color={colors.mutedForeground} />
          <ThemedText variant="caption" style={{ marginLeft: 4 }}>
            {activePlayers.length} player{activePlayers.length !== 1 ? 's' : ''}
            {activePlayers.length !== lineup.players.length ? ` (${lineup.players.length} total)` : ''}
          </ThemedText>
        </View>
        {lineup.lastUsedAt && (
          <View style={styles.metaItem}>
            <Feather name="clock" size={13} color={colors.mutedForeground} />
            <ThemedText variant="caption" style={{ marginLeft: 4 }}>
              Last used {formatDate(lineup.lastUsedAt)}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: colors.primary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); onStartGame(); }}
        >
          <Feather name="play" size={14} color="#fff" />
          <ThemedText variant="button" color="#fff" style={{ marginLeft: 6, fontSize: 14 }}>Start Game</ThemedText>
        </TouchableOpacity>

        <View style={styles.iconActions}>
          <TouchableOpacity style={[styles.iconBtn, { borderColor: colors.border }]} onPress={onEdit}>
            <Feather name="edit-2" size={16} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { borderColor: colors.border }]} onPress={onDuplicate}>
            <Feather name="copy" size={16} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { borderColor: colors.border }]} onPress={handleDelete}>
            <Feather name="trash-2" size={16} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerLeft: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  starBtn: { padding: 4, marginLeft: 8 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  meta: { gap: 4, marginBottom: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  startBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  iconActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
