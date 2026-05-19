import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { useApp } from '@/context/AppContext';
import { Lineup } from '@/models/types';
import { getGames, getLineups } from '@/services/storage';
import { useColors } from '@/hooks/useColors';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings } = useApp();
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [gameCount, setGameCount] = useState(0);
  const [lastLineup, setLastLineup] = useState<Lineup | null>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const loadData = useCallback(async () => {
    const [ls, games] = await Promise.all([getLineups(), getGames()]);
    setLineups(ls);
    setGameCount(games.length);
    // Find most recently used lineup
    const sorted = [...ls].sort((a, b) => {
      if (!a.lastUsedAt && !b.lastUsedAt) return 0;
      if (!a.lastUsedAt) return 1;
      if (!b.lastUsedAt) return -1;
      return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
    });
    setLastLineup(sorted[0] ?? null);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Re-load when navigating back
  const unsubscribe = router;

  const activePlayers = lastLineup?.players.filter((p) => p.isActive) ?? [];

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: botPad + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo + tagline */}
        <View style={styles.logoSection}>
          <Image
            source={require('@/assets/images/batter-up-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText variant="caption" align="center" style={{ marginTop: 6 }}>
            Build your lineup. Track the next batter. Keep the game moving.
          </ThemedText>
        </View>

        {/* Mode badge */}
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={[styles.modeBadge, { backgroundColor: colors.secondary, borderColor: colors.primary }]}
        >
          <Feather name={settings.mode === 'basic' ? 'zap' : 'activity'} size={14} color={colors.primary} />
          <ThemedText variant="caption" color={colors.primary} style={{ marginLeft: 5, fontWeight: '600' }}>
            {settings.mode === 'basic' ? 'Basic Mode' : 'Advanced Mode'}
          </ThemedText>
          <Feather name="chevron-right" size={12} color={colors.primary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        {/* Quick-start card */}
        {lastLineup ? (
          <Card style={styles.quickCard}>
            <View style={styles.quickCardHeader}>
              <Image
                source={require('@/assets/images/batter-up-logo-small.png')}
                style={{ width: 28, height: 28 }}
                resizeMode="contain"
              />
              <ThemedText variant="label" style={{ marginLeft: 8 }}>Last Used Lineup</ThemedText>
            </View>
            <ThemedText variant="h2" style={{ marginTop: 8 }}>{lastLineup.name}</ThemedText>
            {lastLineup.teamName ? <ThemedText variant="caption">{lastLineup.teamName}</ThemedText> : null}
            <View style={styles.quickMeta}>
              <View style={styles.metaChip}>
                <Feather name="users" size={12} color={colors.mutedForeground} />
                <ThemedText variant="caption" style={{ marginLeft: 4 }}>{activePlayers.length} players</ThemedText>
              </View>
              {lastLineup.lastUsedAt && (
                <View style={styles.metaChip}>
                  <Feather name="clock" size={12} color={colors.mutedForeground} />
                  <ThemedText variant="caption" style={{ marginLeft: 4 }}>Used {formatDate(lastLineup.lastUsedAt)}</ThemedText>
                </View>
              )}
            </View>
            <View style={styles.quickActions}>
              <Button
                title="Start Game"
                size="md"
                style={{ flex: 1 }}
                onPress={() => router.push({ pathname: '/game/setup', params: { lineupId: lastLineup.id } })}
                icon={<Feather name="play" size={16} color="#fff" />}
              />
              <TouchableOpacity
                style={[styles.editBtn, { borderColor: colors.border }]}
                onPress={() => router.push({ pathname: '/lineups/editor', params: { lineupId: lastLineup.id } })}
              >
                <Feather name="edit-2" size={18} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </Card>
        ) : (
          <Card style={[styles.emptyCard, { borderStyle: 'dashed', borderColor: colors.border }]}>
            <Feather name="users" size={32} color={colors.mutedForeground} />
            <ThemedText variant="h3" align="center" style={{ marginTop: 12 }}>No lineups yet</ThemedText>
            <ThemedText variant="caption" align="center" style={{ marginTop: 4, marginBottom: 16 }}>
              Create your first lineup to get started
            </ThemedText>
            <Button title="Create Lineup" size="md" onPress={() => router.push('/lineups/editor')} />
          </Card>
        )}

        {/* Primary action */}
        <Button
          title="Start Game"
          size="xl"
          fullWidth
          style={styles.primaryBtn}
          icon={<Feather name="play" size={18} color="#fff" />}
          onPress={() => router.push('/game/setup')}
        />

        {/* Secondary actions */}
        <View style={styles.grid}>
          {[
            { icon: 'plus-circle', label: 'Create Lineup', route: '/lineups/editor' },
            { icon: 'bookmark', label: 'Saved Lineups', route: '/lineups' },
            { icon: 'bar-chart-2', label: 'Stats & History', route: '/stats' },
            { icon: 'settings', label: 'Settings', route: '/settings' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.gridIcon, { backgroundColor: colors.secondary }]}>
                <Feather name={item.icon as any} size={22} color={colors.primary} />
              </View>
              <ThemedText variant="label" align="center" style={{ marginTop: 8, color: colors.foreground }}>
                {item.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats strip */}
        {(lineups.length > 0 || gameCount > 0) && (
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <ThemedText variant="h2" color={colors.primary}>{lineups.length}</ThemedText>
              <ThemedText variant="caption">Lineup{lineups.length !== 1 ? 's' : ''}</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <ThemedText variant="h2" color={colors.primary}>{gameCount}</ThemedText>
              <ThemedText variant="caption">Game{gameCount !== 1 ? 's' : ''}</ThemedText>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  logoSection: { alignItems: 'center', marginBottom: 4 },
  logo: { width: 200, height: 80 },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickCard: {},
  quickCardHeader: { flexDirection: 'row', alignItems: 'center' },
  quickMeta: { flexDirection: 'row', gap: 12, marginVertical: 10 },
  metaChip: { flexDirection: 'row', alignItems: 'center' },
  quickActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  editBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: { alignItems: 'center', padding: 28, borderWidth: 1.5 },
  primaryBtn: { marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: {
    width: '47.5%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  gridIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statsStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 32,
  },
  statItem: { alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 32 },
});
