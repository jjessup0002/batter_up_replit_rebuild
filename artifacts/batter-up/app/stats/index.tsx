import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { GameState, PlayerStats, Season, SEASON_TYPE_LABELS } from '@/models/types';
import { calculatePlayerStats, formatStat } from '@/services/statsCalculator';
import { getGames, getLineups, getSeasons } from '@/services/storage';
import { useColors } from '@/hooks/useColors';

export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [allGames, setAllGames] = useState<GameState[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [allPlayerStats, setAllPlayerStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null); // null = all time

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const load = useCallback(async () => {
    const [gs, , ss] = await Promise.all([getGames(), getLineups(), getSeasons()]);
    setAllGames(gs);
    setSeasons(ss);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Filter games by selected season (excluding demo games always)
  const games = allGames.filter((g) => {
    if (g.setup.isDemoMode) return false;
    if (selectedSeasonId === null) return true;
    return g.setup.seasonId === selectedSeasonId;
  });

  // Recompute player stats for the filtered game set
  const computedPlayerStats = (() => {
    const playerMap = new Map<string, string>();
    for (const g of games) {
      for (const p of g.setup.lineupSnapshot) {
        playerMap.set(p.id, p.name);
      }
    }
    return Array.from(playerMap.entries())
      .map(([id, name]) => calculatePlayerStats(id, name, games))
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed || b.hits - a.hits);
  })();

  const wins = games.filter((g) => g.myScore > g.opponentScore).length;
  const losses = games.filter((g) => g.myScore < g.opponentScore).length;
  const ties = games.filter((g) => g.myScore === g.opponentScore).length;
  const totalRuns = games.reduce((s, g) => s + g.myScore, 0);
  const avgRuns = games.length > 0 ? (totalRuns / games.length).toFixed(1) : '—';

  const topHitter = [...computedPlayerStats]
    .sort((a, b) => b.battingAverage - a.battingAverage)
    .find((p) => p.atBats >= 3);
  const topRbi = [...computedPlayerStats].sort((a, b) => b.rbis - a.rbis)[0];

  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId);

  const seasonTypeColor = (type: Season['type']) => {
    if (type === 'tournament') return { bg: '#FFF8E1', fg: '#E65100' };
    if (type === 'preseason') return { bg: colors.muted, fg: colors.mutedForeground };
    return { bg: colors.secondary, fg: colors.primary };
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <ThemedText variant="h2">Stats & History</ThemedText>
        <View style={{ width: 30 }} />
      </View>

      {/* Season filter — only show when there are seasons */}
      {seasons.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.seasonTabs, { borderBottomColor: colors.border }]}
          style={{ backgroundColor: colors.card }}
        >
          <TouchableOpacity
            style={[styles.seasonTab, selectedSeasonId === null && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setSelectedSeasonId(null)}
          >
            <ThemedText variant="label" color={selectedSeasonId === null ? colors.primary : colors.mutedForeground}>
              All Time
            </ThemedText>
          </TouchableOpacity>
          {seasons.map((s) => {
            const tc = seasonTypeColor(s.type);
            const isSelected = selectedSeasonId === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.seasonTab, isSelected && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                onPress={() => setSelectedSeasonId(s.id)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ThemedText variant="label" color={isSelected ? colors.primary : colors.mutedForeground} numberOfLines={1}>
                    {s.name}
                  </ThemedText>
                  <View style={[styles.typePill, { backgroundColor: tc.bg }]}>
                    <ThemedText style={{ fontSize: 9, fontWeight: '700', color: tc.fg }}>
                      {SEASON_TYPE_LABELS[s.type]}
                    </ThemedText>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Season context banner */}
      {selectedSeason && (
        <View style={[styles.seasonBanner, { backgroundColor: colors.secondary, borderBottomColor: colors.border }]}>
          <Feather name="layers" size={14} color={colors.primary} />
          <ThemedText variant="caption" color={colors.primary} style={{ marginLeft: 6 }}>
            Showing stats for <ThemedText variant="caption" style={{ fontWeight: '700', color: colors.primary }}>{selectedSeason.name}</ThemedText>
            {' '}({selectedSeason.year})
          </ThemedText>
        </View>
      )}

      {games.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Feather name="bar-chart-2" size={48} color={colors.mutedForeground} />
          <ThemedText variant="h3" align="center" style={{ marginTop: 16 }}>
            {selectedSeason ? `No games in ${selectedSeason.name}` : 'No games yet'}
          </ThemedText>
          <ThemedText variant="caption" align="center" style={{ marginTop: 6 }}>
            {selectedSeason
              ? 'Play a game assigned to this season to see stats here.'
              : 'Play a game to start tracking stats'}
          </ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 20 }]}>
          {/* Team record */}
          <Card>
            <ThemedText variant="h3" style={{ marginBottom: 14 }}>
              {selectedSeason ? `${selectedSeason.name} Record` : 'Team Record'}
            </ThemedText>
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
                { label: 'Total Hits', value: computedPlayerStats.reduce((s, p) => s + p.hits, 0) },
                { label: 'Total Walks', value: computedPlayerStats.reduce((s, p) => s + p.walks, 0) },
                { label: 'Total Ks', value: computedPlayerStats.reduce((s, p) => s + p.strikeouts, 0) },
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
              <ThemedText variant="h3" style={{ marginBottom: 12 }}>
                {selectedSeason ? `${selectedSeason.name} Leaders` : 'Season Leaders'}
              </ThemedText>
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
          {computedPlayerStats.length > 0 && (
            <Card>
              <ThemedText variant="h3" style={{ marginBottom: 12 }}>Player Stats</ThemedText>
              <View style={[styles.tableRow, { backgroundColor: colors.muted, borderRadius: 6, marginBottom: 4 }]}>
                <ThemedText variant="caption" style={[styles.nameCell, { fontWeight: '700' }]}>Player</ThemedText>
                {['G', 'H', 'R', 'RBI', 'BB', 'AVG'].map((h) => (
                  <ThemedText key={h} variant="caption" style={[styles.statCell, { fontWeight: '700' }]}>{h}</ThemedText>
                ))}
              </View>
              {computedPlayerStats.map((p) => (
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
                const gSeason = g.setup.seasonId ? seasons.find((s) => s.id === g.setup.seasonId) : null;
                return (
                  <View key={g.id} style={[styles.gameRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.resultDot, { backgroundColor: resultColor }]} />
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="body">vs. {g.setup.opponentName}</ThemedText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <ThemedText variant="caption">
                          {new Date(g.setup.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </ThemedText>
                        {gSeason && selectedSeasonId === null && (
                          <View style={[styles.typePill, { backgroundColor: seasonTypeColor(gSeason.type).bg }]}>
                            <ThemedText style={{ fontSize: 9, fontWeight: '700', color: seasonTypeColor(gSeason.type).fg }}>
                              {gSeason.name}
                            </ThemedText>
                          </View>
                        )}
                      </View>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { padding: 4, marginRight: 8 },
  seasonTabs: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 0 },
  seasonTab: { paddingHorizontal: 14, paddingVertical: 12, marginRight: 4 },
  typePill: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  seasonBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
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
