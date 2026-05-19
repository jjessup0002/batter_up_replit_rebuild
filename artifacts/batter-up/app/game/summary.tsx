import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { GameState, Player, PlayerStats } from '@/models/types';
import { calculatePlayerStats, formatStat } from '@/services/statsCalculator';
import { getGames } from '@/services/storage';
import { useColors } from '@/hooks/useColors';

export default function GameSummaryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameId } = useLocalSearchParams<{ gameId?: string }>();
  const [game, setGame] = useState<GameState | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    getGames().then((games) => {
      const g = games.find((g) => g.id === gameId) ?? games[games.length - 1];
      if (!g) return;
      setGame(g);
      const players = g.setup.lineupSnapshot;
      const stats = players.map((p) => calculatePlayerStats(p.id, p.name, [g]));
      setPlayerStats(stats);
    });
  }, [gameId]);

  if (!game) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ThemedText variant="h3">Loading summary...</ThemedText>
        </View>
      </View>
    );
  }

  const isWin = game.myScore > game.opponentScore;
  const isTie = game.myScore === game.opponentScore;
  const resultLabel = isWin ? 'WIN' : isTie ? 'TIE' : 'LOSS';
  const resultColor = isWin ? colors.success : isTie ? colors.accent : colors.destructive;

  const gameDate = new Date(game.setup.date).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });

  const topHitters = [...playerStats].sort((a, b) => b.hits - a.hits).slice(0, 3);
  const topRbis = [...playerStats].sort((a, b) => b.rbis - a.rbis).slice(0, 2);

  const totalHits = playerStats.reduce((s, p) => s + p.hits, 0);
  const totalWalks = playerStats.reduce((s, p) => s + p.walks, 0);
  const totalKs = playerStats.reduce((s, p) => s + p.strikeouts, 0);

  const shareText = `Game Summary — ${game.setup.teamName} vs ${game.setup.opponentName}\n${gameDate}\n\n${game.setup.teamName}: ${game.myScore}\n${game.setup.opponentName}: ${game.opponentScore}\n\nTotal Hits: ${totalHits}\nResult: ${resultLabel}`;

  const handleShare = () => {
    Share.share({ message: shareText }).catch(() => {});
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtn}>
          <Feather name="home" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <ThemedText variant="h2">Game Summary</ThemedText>
        <TouchableOpacity onPress={handleShare} style={{ marginLeft: 'auto' }}>
          <Feather name="share" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 20 }]}>
        {/* Final score card */}
        <Card style={[styles.scoreCard, { backgroundColor: colors.navy }]}>
          <View style={[styles.resultBadge, { backgroundColor: resultColor }]}>
            <ThemedText variant="label" color="#fff" style={{ fontWeight: '700' }}>{resultLabel}</ThemedText>
          </View>
          <ThemedText variant="caption" color="rgba(255,255,255,0.6)" align="center" style={{ marginBottom: 16 }}>{gameDate}</ThemedText>

          <View style={styles.finalScore}>
            <View style={styles.teamScore}>
              <ThemedText variant="caption" color="rgba(255,255,255,0.7)" numberOfLines={1}>{game.setup.teamName}</ThemedText>
              <ThemedText style={{ fontSize: 52, fontWeight: '800', color: colors.accent }}>{game.myScore}</ThemedText>
            </View>
            <ThemedText variant="h1" color="rgba(255,255,255,0.4)">—</ThemedText>
            <View style={styles.teamScore}>
              <ThemedText variant="caption" color="rgba(255,255,255,0.7)" numberOfLines={1}>{game.setup.opponentName}</ThemedText>
              <ThemedText style={{ fontSize: 52, fontWeight: '800', color: '#fff' }}>{game.opponentScore}</ThemedText>
            </View>
          </View>
        </Card>

        {/* Team totals */}
        <Card>
          <ThemedText variant="h3" style={{ marginBottom: 12 }}>Team Stats</ThemedText>
          <View style={styles.statsGrid}>
            {[
              { label: 'Hits', value: totalHits },
              { label: 'Walks', value: totalWalks },
              { label: 'Strikeouts', value: totalKs },
              { label: 'Runs', value: game.myScore },
            ].map((s) => (
              <View key={s.label} style={[styles.statBox, { backgroundColor: colors.muted }]}>
                <ThemedText variant="h2" color={colors.primary}>{s.value}</ThemedText>
                <ThemedText variant="caption">{s.label}</ThemedText>
              </View>
            ))}
          </View>
        </Card>

        {/* Inning by inning */}
        {game.inningScores.length > 0 && (
          <Card>
            <ThemedText variant="h3" style={{ marginBottom: 12 }}>Inning Scores</ThemedText>
            <View style={styles.inningTable}>
              <View style={styles.inningHeader}>
                <ThemedText variant="caption" style={styles.inningCell}>Team</ThemedText>
                {game.inningScores.map((s) => (
                  <ThemedText key={s.inning} variant="caption" style={styles.inningCell}>{s.inning}</ThemedText>
                ))}
                <ThemedText variant="caption" style={[styles.inningCell, { fontWeight: '700' }]}>R</ThemedText>
              </View>
              {/* User team row */}
              <View style={[styles.inningRow, { backgroundColor: colors.secondary }]}>
                <ThemedText variant="caption" style={[styles.inningCell, { fontWeight: '600' }]} numberOfLines={1}>
                  {game.setup.teamName.slice(0, 8)}
                </ThemedText>
                {game.inningScores.map((s) => (
                  <ThemedText key={s.inning} variant="caption" style={styles.inningCell}>
                    {game.setup.isHome ? s.bottomRuns : s.topRuns}
                  </ThemedText>
                ))}
                <ThemedText variant="caption" style={[styles.inningCell, { fontWeight: '700', color: colors.primary }]}>
                  {game.myScore}
                </ThemedText>
              </View>
              {/* Opponent row */}
              <View style={styles.inningRow}>
                <ThemedText variant="caption" style={[styles.inningCell, { fontWeight: '600' }]} numberOfLines={1}>
                  {game.setup.opponentName.slice(0, 8)}
                </ThemedText>
                {game.inningScores.map((s) => (
                  <ThemedText key={s.inning} variant="caption" style={styles.inningCell}>
                    {game.setup.isHome ? s.topRuns : s.bottomRuns}
                  </ThemedText>
                ))}
                <ThemedText variant="caption" style={[styles.inningCell, { fontWeight: '700' }]}>
                  {game.opponentScore}
                </ThemedText>
              </View>
            </View>
          </Card>
        )}

        {/* Top performers */}
        {topHitters.some((p) => p.hits > 0) && (
          <Card>
            <ThemedText variant="h3" style={{ marginBottom: 12 }}>Top Performers</ThemedText>
            {topHitters.filter((p) => p.hits > 0).map((p) => (
              <View key={p.playerId} style={[styles.perfRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.perfIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="trending-up" size={14} color={colors.primary} />
                </View>
                <ThemedText variant="body" style={{ flex: 1 }}>{p.playerName}</ThemedText>
                <ThemedText variant="body" style={{ fontWeight: '600' }}>
                  {p.hits} hit{p.hits !== 1 ? 's' : ''}
                  {p.runs > 0 ? `, ${p.runs} run${p.runs !== 1 ? 's' : ''}` : ''}
                  {p.rbis > 0 ? `, ${p.rbis} RBI` : ''}
                </ThemedText>
              </View>
            ))}
          </Card>
        )}

        {/* Player stats table */}
        {playerStats.length > 0 && game.setup.rules.mode === 'advanced' && (
          <Card>
            <ThemedText variant="h3" style={{ marginBottom: 12 }}>Player Stats</ThemedText>
            {/* Header */}
            <View style={[styles.tableRow, { backgroundColor: colors.muted, borderRadius: 6 }]}>
              <ThemedText variant="caption" style={[styles.nameCell, { fontWeight: '700' }]}>Player</ThemedText>
              {['AB', 'H', 'R', 'RBI', 'BB', 'K', 'AVG'].map((h) => (
                <ThemedText key={h} variant="caption" style={[styles.statCell, { fontWeight: '700' }]}>{h}</ThemedText>
              ))}
            </View>
            {playerStats.map((p) => (
              <View key={p.playerId} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <ThemedText variant="caption" style={styles.nameCell} numberOfLines={1}>{p.playerName}</ThemedText>
                <ThemedText variant="caption" style={styles.statCell}>{p.atBats}</ThemedText>
                <ThemedText variant="caption" style={styles.statCell}>{p.hits}</ThemedText>
                <ThemedText variant="caption" style={styles.statCell}>{p.runs}</ThemedText>
                <ThemedText variant="caption" style={styles.statCell}>{p.rbis}</ThemedText>
                <ThemedText variant="caption" style={styles.statCell}>{p.walks}</ThemedText>
                <ThemedText variant="caption" style={styles.statCell}>{p.strikeouts}</ThemedText>
                <ThemedText variant="caption" style={styles.statCell}>{p.atBats > 0 ? formatStat(p.battingAverage) : '—'}</ThemedText>
              </View>
            ))}
          </Card>
        )}

        <View style={styles.buttons}>
          <Button title="Back to Home" size="lg" fullWidth onPress={() => router.replace('/home')} />
          <Button title="Share Summary" variant="outline" size="lg" fullWidth onPress={handleShare} style={{ marginTop: 10 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4, marginRight: 8 },
  content: { padding: 16, gap: 14 },
  scoreCard: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  resultBadge: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 12 },
  finalScore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 8 },
  teamScore: { alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { flex: 1, minWidth: '45%', alignItems: 'center', padding: 12, borderRadius: 10 },
  inningTable: { gap: 4 },
  inningHeader: { flexDirection: 'row', paddingBottom: 4 },
  inningRow: { flexDirection: 'row', paddingVertical: 6, borderRadius: 6, paddingHorizontal: 4 },
  inningCell: { flex: 1, textAlign: 'center', fontSize: 12 },
  perfRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  perfIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  nameCell: { flex: 2, paddingRight: 4 },
  statCell: { flex: 1, textAlign: 'center' },
  buttons: { marginTop: 8 },
});
