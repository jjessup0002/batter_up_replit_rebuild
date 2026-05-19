import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { GameState, InningScore, Player, PlayerStatOverride } from '@/models/types';
import { getGames, updateGame } from '@/services/storage';
import { calculatePlayerStats } from '@/services/statsCalculator';
import { useColors } from '@/hooks/useColors';

// Stat fields a coach can override per player. Kept narrow — the breakdown of
// hits (singles/doubles/etc) is not editable from this screen; coaches who
// need that precision should use Undo during the game instead.
type StatKey = 'atBats' | 'hits' | 'runs' | 'rbis' | 'walks' | 'strikeouts';
const STAT_LABELS: { key: StatKey; label: string }[] = [
  { key: 'atBats', label: 'AB' },
  { key: 'hits', label: 'H' },
  { key: 'runs', label: 'R' },
  { key: 'rbis', label: 'RBI' },
  { key: 'walks', label: 'BB' },
  { key: 'strikeouts', label: 'K' },
];

type Draft = {
  innings: InningScore[];
  perPlayer: Record<string, Record<StatKey, number>>;
};

function buildInitialDraft(game: GameState): Draft {
  // Seed per-player stats from the existing event-derived numbers so the coach
  // sees the current values and only edits what needs changing. If the game
  // already has overrides, those take precedence (this screen is idempotent).
  const perPlayer: Record<string, Record<StatKey, number>> = {};
  for (const p of game.setup.lineupSnapshot) {
    const existing = game.statOverrides?.[p.id];
    if (existing) {
      perPlayer[p.id] = {
        atBats: existing.atBats ?? 0,
        hits: existing.hits ?? 0,
        runs: existing.runs ?? 0,
        rbis: existing.rbis ?? 0,
        walks: existing.walks ?? 0,
        strikeouts: existing.strikeouts ?? 0,
      };
    } else {
      const s = calculatePlayerStats(p.id, p.name, [game]);
      perPlayer[p.id] = {
        atBats: s.atBats,
        hits: s.hits,
        runs: s.runs,
        rbis: s.rbis,
        walks: s.walks,
        strikeouts: s.strikeouts,
      };
    }
  }
  return {
    innings: game.inningScores.map((s) => ({ ...s })),
    perPlayer,
  };
}

export default function EditStatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameId } = useLocalSearchParams<{ gameId?: string }>();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [game, setGame] = useState<GameState | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGames().then((games) => {
      const g = games.find((x) => x.id === gameId) ?? null;
      if (g) {
        setGame(g);
        setDraft(buildInitialDraft(g));
      }
    });
  }, [gameId]);

  const totals = useMemo(() => {
    if (!draft) return { my: 0, opp: 0 };
    return draft.innings.reduce(
      (acc, s) => ({
        my: acc.my + (game?.setup.isHome ? s.bottomRuns : s.topRuns),
        opp: acc.opp + (game?.setup.isHome ? s.topRuns : s.bottomRuns),
      }),
      { my: 0, opp: 0 }
    );
  }, [draft, game]);

  if (!game || !draft) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ThemedText variant="h3">Loading...</ThemedText>
        </View>
      </View>
    );
  }

  const setInningScore = (idx: number, half: 'topRuns' | 'bottomRuns', delta: number) => {
    setDraft((d) => {
      if (!d) return d;
      const innings = d.innings.map((s, i) =>
        i === idx ? { ...s, [half]: Math.max(0, s[half] + delta) } : s
      );
      return { ...d, innings };
    });
  };

  const setStat = (playerId: string, key: StatKey, delta: number) => {
    setDraft((d) => {
      if (!d) return d;
      const cur = d.perPlayer[playerId] ?? { atBats: 0, hits: 0, runs: 0, rbis: 0, walks: 0, strikeouts: 0 };
      const next = Math.max(0, (cur[key] ?? 0) + delta);
      return {
        ...d,
        perPlayer: { ...d.perPlayer, [playerId]: { ...cur, [key]: next } },
      };
    });
  };

  const setStatRaw = (playerId: string, key: StatKey, value: string) => {
    const n = Math.max(0, parseInt(value, 10) || 0);
    setDraft((d) => {
      if (!d) return d;
      const cur = d.perPlayer[playerId] ?? { atBats: 0, hits: 0, runs: 0, rbis: 0, walks: 0, strikeouts: 0 };
      return { ...d, perPlayer: { ...d.perPlayer, [playerId]: { ...cur, [key]: n } } };
    });
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const overrides: Record<string, PlayerStatOverride> = {};
    for (const [pid, stats] of Object.entries(draft.perPlayer)) {
      overrides[pid] = { ...stats };
    }
    const updated: GameState = {
      ...game,
      inningScores: draft.innings,
      myScore: totals.my,
      opponentScore: totals.opp,
      statOverrides: overrides,
      manuallyCorrected: true,
    };
    await updateGame(updated);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <ThemedText variant="h2">Edit Game Stats</ThemedText>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 100 }]}>
        <ThemedText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 4 }}>
          {game.setup.teamName} vs {game.setup.opponentName}
        </ThemedText>

        {/* Score summary */}
        <Card style={[styles.scoreCard, { backgroundColor: colors.navy }]}>
          <View style={styles.scoreRow}>
            <View style={styles.scoreTeam}>
              <ThemedText variant="caption" color="#fff" style={{ opacity: 0.7 }}>{game.setup.teamName}</ThemedText>
              <ThemedText variant="h1" color="#fff">{totals.my}</ThemedText>
            </View>
            <ThemedText variant="h3" color="#fff" style={{ opacity: 0.6 }}>—</ThemedText>
            <View style={styles.scoreTeam}>
              <ThemedText variant="caption" color="#fff" style={{ opacity: 0.7 }}>{game.setup.opponentName}</ThemedText>
              <ThemedText variant="h1" color="#fff">{totals.opp}</ThemedText>
            </View>
          </View>
        </Card>

        {/* Inning scores */}
        <ThemedText variant="h3" style={{ marginTop: 8 }}>Inning-by-Inning</ThemedText>
        <Card style={{ padding: 12 }}>
          {draft.innings.map((s, idx) => (
            <View key={s.inning} style={[styles.inningRow, { borderBottomColor: colors.border }]}>
              <ThemedText variant="body" style={{ width: 70, fontWeight: '700' }}>
                Inning {s.inning}
              </ThemedText>
              <View style={styles.halfBlock}>
                <ThemedText variant="caption" color={colors.mutedForeground} style={{ width: 50 }}>Top</ThemedText>
                <Stepper
                  value={s.topRuns}
                  onDelta={(d) => setInningScore(idx, 'topRuns', d)}
                  colors={colors}
                />
              </View>
              <View style={styles.halfBlock}>
                <ThemedText variant="caption" color={colors.mutedForeground} style={{ width: 50 }}>Bot</ThemedText>
                <Stepper
                  value={s.bottomRuns}
                  onDelta={(d) => setInningScore(idx, 'bottomRuns', d)}
                  colors={colors}
                />
              </View>
            </View>
          ))}
        </Card>

        {/* Per-player stats */}
        <ThemedText variant="h3" style={{ marginTop: 12 }}>Player Stats</ThemedText>
        <ThemedText variant="caption" color={colors.mutedForeground} style={{ marginTop: -8 }}>
          Tap a number to edit, or use +/− to adjust.
        </ThemedText>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {game.setup.lineupSnapshot.map((p: Player) => {
            const s = draft.perPlayer[p.id] ?? { atBats: 0, hits: 0, runs: 0, rbis: 0, walks: 0, strikeouts: 0 };
            return (
              <View key={p.id} style={[styles.playerBlock, { borderBottomColor: colors.border }]}>
                <ThemedText variant="body" style={{ fontWeight: '700', marginBottom: 8 }}>
                  {p.name}
                  {p.jerseyNumber ? ` #${p.jerseyNumber}` : ''}
                </ThemedText>
                <View style={styles.statsGrid}>
                  {STAT_LABELS.map(({ key, label }) => (
                    <View key={key} style={styles.statCell}>
                      <ThemedText variant="caption" color={colors.mutedForeground} style={{ fontWeight: '700' }}>
                        {label}
                      </ThemedText>
                      <View style={[styles.statStepper, { borderColor: colors.border }]}>
                        <TouchableOpacity
                          onPress={() => setStat(p.id, key, -1)}
                          style={styles.stepperBtn}
                          hitSlop={4}
                        >
                          <Feather name="minus" size={14} color={colors.foreground} />
                        </TouchableOpacity>
                        <TextInput
                          value={String(s[key])}
                          onChangeText={(v) => setStatRaw(p.id, key, v)}
                          keyboardType="number-pad"
                          style={[styles.statInput, { color: colors.foreground }]}
                          selectTextOnFocus
                        />
                        <TouchableOpacity
                          onPress={() => setStat(p.id, key, 1)}
                          style={styles.stepperBtn}
                          hitSlop={4}
                        >
                          <Feather name="plus" size={14} color={colors.foreground} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </Card>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: botPad + 8 }]}>
        <Button title="Cancel" variant="outline" size="lg" onPress={() => router.back()} style={{ flex: 1 }} />
        <Button title={saving ? 'Saving...' : 'Save Changes'} variant="primary" size="lg" onPress={handleSave} disabled={saving} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function Stepper({
  value, onDelta, colors,
}: {
  value: number;
  onDelta: (d: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.statStepper, { borderColor: colors.border }]}>
      <TouchableOpacity onPress={() => onDelta(-1)} style={styles.stepperBtn} hitSlop={4}>
        <Feather name="minus" size={14} color={colors.foreground} />
      </TouchableOpacity>
      <ThemedText variant="body" style={[styles.stepperValue, { color: colors.foreground }]}>
        {value}
      </ThemedText>
      <TouchableOpacity onPress={() => onDelta(1)} style={styles.stepperBtn} hitSlop={4}>
        <Feather name="plus" size={14} color={colors.foreground} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { padding: 4, marginRight: 8 },
  content: { padding: 16, gap: 12 },
  scoreCard: { paddingVertical: 18, paddingHorizontal: 20 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  scoreTeam: { alignItems: 'center', flex: 1 },
  inningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  halfBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  playerBlock: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCell: {
    width: '31%',
    alignItems: 'center',
    gap: 4,
  },
  statStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  stepperBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  stepperValue: { minWidth: 30, textAlign: 'center', fontWeight: '700' },
  statInput: {
    minWidth: 38,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 15,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
