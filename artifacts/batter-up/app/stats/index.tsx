import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { GameState, PlayerStats } from '@/models/types';
import { calculatePlayerStats, formatStat } from '@/services/statsCalculator';
import { getGames, getLineups } from '@/services/storage';
import { useColors } from '@/hooks/useColors';

export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [games, setGames] = useState<GameState[]>([]);
  const [allPlayerStats, setAllPlayerStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    Promise.all([getGames(), getLineups()]).then(([gs, ls]) => {
      setGames(gs);
      // Gather all unique players from all games
      const playerMap = new Map<string, string>();
      for (const g of gs) {
        for (const p of g.setup.lineupSnapshot) {
          playerMap.set(p.id, p.name);
        }
      }
      const stats = Array.from(playerMap.entries()).map(([id, name]) =>
        calculatePlayerStats(id, name, gs)
      );
      setAllPlayerStats(stats.sort((a, b) => b.gamesPlayed - a.gamesPlayed || b.hits - a.hits));
      setLoading(false);
    });
  }, []);

  const wins = games.filter((g) => g.myScore > g.opponentScore).length;
  const losses = games.filter((g) => g.myScore < g.opponentScore).length;
  const ties = games.filter((g) => g.myScore === g.opponentScore).length;
  const totalRuns = games.reduce((s, g) => s + g.myScore, 0);
  const avgRuns = games.length > 0 ? (totalRuns / games.length).toFixed(1) : '—';

  const topHitter = [...allPlayerStats].sort((a, b) => b.battingAverage - a.battingAverage)
    .find((p) => p.atBats >= 3);
  const topRbi = [...allPlayerStats].sort((a, b) => b.rbis - a.rbis)[0];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <ThemedText variant="h2">Stats & History</ThemedText>
        <View style={{ width: 30 }} />
      </View>

      {games.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Feather name="bar-chart-2" size={48} color={colors.mutedForeground} />
          <ThemedText variant="h3" align="center" style={{ marginTop: 16 }}>No games yet</ThemedText>
          <ThemedText variant="caption" align="center" style={{ marginTop: 6 }}>
            Play a game to start tracking stats
          </ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 20 }]}>
          {/* Team record */}
          <Card>
            <ThemedText variant="h3" style={{ marginBottom: 14 }}>Team Record</ThemedText>
            <View style={styles.recordRow}>
              <View style={styles.recordBox}>
                <ThemedText style={{ fontSize: 36, fontWeight: '800', color: colors.success }}>{wins}</ThemedText>
                <ThemedText variant="caption">Wins</ThemedText>
              </View>
              <View style={styles.recordBox}>
                <ThemedText style={{ fontSize: 36, fontWeight: '800', color: colors.destructive }}>{losses}</ThemedText>
                <ThemedText variant="caption">Losses</ThemedText>
              </View>
              {ties > 0 && (
                <View style={styles.recordBox}>
                  <ThemedText style={{ fontSize: 36, fontWeight: '800', color: colors.accent }}>{ties}</ThemedText>
                  <ThemedText variant="caption">Ties</ThemedText>
                </View>
              )}
            </View>
          </Card>

          {/* Team stats */}
          <Card>
            <ThemedText variant="h3" style={{ marginBottom: 12 }}>Team Totals</ThemedText>
            <View style={styles.statsGrid}>
              {[
                { label: 'Games Played', value: games.length },
                { label: 'Total Runs', value: totalRuns },
                { label: 'Avg Runs/Game', value: avgRuns },
                { label: 'Total Hits', value: allPlayerStats.reduce((s, p) => s + p.hits, 0) },
                { label: 'Total Walks', value: allPlayerStats.reduce((s, p) => s + p.walks, 0) },
                { label: 'Total Ks', value: allPlayerStats.reduce((s, p) => s + p.strikeouts, 0) },
              ].map((s) => (
                <View key={s.label} style={[styles.statBox, { backgroundColor: colors.muted }]}>
                  <ThemedText variant="h2" color={colors.primary}>{s.value}</ThemedText>
                  <ThemedText variant="caption" align="center">{s.label}</ThemedText>
                </View>
              ))}
            </View>
          </Card>

          {/* Top performers */}
          {(topHitter || topRbi) && (
            <Card>
              <ThemedText variant="h3" style={{ marginBottom: 12 }}>Season Leaders</ThemedText>
              {topHitter && (
                <View style={[styles.leaderRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.leaderIcon, { backgroundColor: colors.secondary }]}>
                    <Feather name="award" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="body" style={{ fontWeight: '600' }}>{topHitter.playerName}</ThemedText>
                    <ThemedText variant="caption">Batting Average Leader</ThemedText>
                  </View>
                  <ThemedText variant="h3" color={colors.primary}>{formatStat(topHitter.battingAverage)}</ThemedText>
                </View>
              )}
              {topRbi && topRbi.rbis > 0 && (
                <View style={styles.leaderRow}>
                  <View style={[styles.leaderIcon, { backgroundColor: colors.secondary }]}>
                    <Feather name="star" size={16} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="body" style={{ fontWeight: '600' }}>{topRbi.playerName}</ThemedText>
                    <ThemedText variant="caption">RBI Leader</ThemedText>
                  </View>
                  <ThemedText variant="h3" color={colors.accent}>{topRbi.rbis} RBI</ThemedText>
                </View>
              )}
            </Card>
          )}

          {/* Player stats table */}
          {allPlayerStats.length > 0 && (
            <Card>
              <ThemedText variant="h3" style={{ marginBottom: 12 }}>Player Stats</ThemedText>
              <View style={[styles.tableRow, { backgroundColor: colors.muted, borderRadius: 6, marginBottom: 4 }]}>
                <ThemedText variant="caption" style={[styles.nameCell, { fontWeight: '700' }]}>Player</ThemedText>
                {['G', 'H', 'R', 'RBI', 'BB', 'AVG'].map((h) => (
                  <ThemedText key={h} variant="caption" style={[styles.statCell, { fontWeight: '700' }]}>{h}</ThemedText>
                ))}
              </View>
              {allPlayerStats.map((p) => (
                <View key={p.playerId} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <ThemedText variant="caption" style={styles.nameCell} numberOfLines={1}>{p.playerName}</ThemedText>
                  <ThemedText variant="caption" style={styles.statCell}>{p.gamesPlayed}</ThemedText>
                  <ThemedText variant="caption" style={styles.statCell}>{p.hits}</ThemedText>
                  <ThemedText variant="caption" style={styles.statCell}>{p.runs}</ThemedText>
                  <ThemedText variant="caption" style={styles.statCell}>{p.rbis}</ThemedText>
                  <ThemedText variant="caption" style={styles.statCell}>{p.walks}</ThemedText>
                  <ThemedText variant="caption" style={styles.statCell}>
                    {p.atBats >= 3 ? formatStat(p.battingAverage) : '—'}
                  </ThemedText>
                </View>
              ))}
            </Card>
          )}

          {/* Game history */}
          {games.length > 0 && (
            <Card>
              <ThemedText variant="h3" style={{ marginBottom: 12 }}>Game History</ThemedText>
              {[...games].reverse().map((g) => {
                const isWin = g.myScore > g.opponentScore;
                const isTie = g.myScore === g.opponentScore;
                const resultColor = isWin ? colors.success : isTie ? colors.accent : colors.destructive;
                return (
                  <View key={g.id} style={[styles.gameRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.resultDot, { backgroundColor: resultColor }]} />
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="body">vs. {g.setup.opponentName}</ThemedText>
                      <ThemedText variant="caption">
                        {new Date(g.setup.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </ThemedText>
                    </View>
                    <ThemedText variant="h3">
                      {g.myScore} — {g.opponentScore}
                    </ThemedText>
                  </View>
                );
              })}
            </Card>
          )}
        </ScrollView>
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
  content: { padding: 16, gap: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  recordRow: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  recordBox: { alignItems: 'center', gap: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { flex: 1, minWidth: '30%', alignItems: 'center', padding: 12, borderRadius: 10 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  leaderIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  nameCell: { flex: 2, paddingRight: 4 },
  statCell: { flex: 1, textAlign: 'center' },
  gameRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  resultDot: { width: 10, height: 10, borderRadius: 5 },
});
