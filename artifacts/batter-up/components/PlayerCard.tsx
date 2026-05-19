import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Player } from '@/models/types';
import { Card } from './ui/Card';
import { ThemedText } from './ui/ThemedText';

interface PlayerCardProps {
  player: Player;
  index: number;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'EH', 'OF', 'IF'];

export function PlayerCard({
  player,
  index,
  isLast,
  onMoveUp,
  onMoveDown,
  onDelete,
  onToggleActive,
}: PlayerCardProps) {
  const colors = useColors();

  const handleHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

  return (
    <Card style={[styles.card, !player.isActive && { opacity: 0.5 }]} padding={12}>
      <View style={styles.row}>
        {/* Order badge */}
        <View style={[styles.orderBadge, { backgroundColor: player.isActive ? colors.primary : colors.muted }]}>
          <ThemedText variant="label" color={player.isActive ? colors.primaryForeground : colors.mutedForeground} style={styles.orderText}>
            {index + 1}
          </ThemedText>
        </View>

        {/* Player info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <ThemedText variant="h3" style={styles.name}>{player.name}</ThemedText>
            {player.jerseyNumber ? (
              <View style={[styles.jersey, { borderColor: colors.border }]}>
                <ThemedText variant="caption">#{player.jerseyNumber}</ThemedText>
              </View>
            ) : null}
          </View>
          {player.primaryPosition ? (
            <ThemedText variant="caption">{player.primaryPosition}</ThemedText>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => { handleHaptic(); onMoveUp(); }}
            disabled={index === 0}
            style={[styles.iconBtn, { opacity: index === 0 ? 0.3 : 1 }]}
          >
            <Feather name="chevron-up" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { handleHaptic(); onMoveDown(); }}
            disabled={isLast}
            style={[styles.iconBtn, { opacity: isLast ? 0.3 : 1 }]}
          >
            <Feather name="chevron-down" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { handleHaptic(); onToggleActive(); }}
            style={styles.iconBtn}
          >
            <Feather
              name={player.isActive ? 'check-circle' : 'circle'}
              size={20}
              color={player.isActive ? colors.success : colors.mutedForeground}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { handleHaptic(); onDelete(); }}
            style={styles.iconBtn}
          >
            <Feather name="trash-2" size={18} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  orderText: { fontWeight: '700' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15 },
  jersey: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { padding: 6 },
});
