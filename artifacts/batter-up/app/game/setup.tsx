import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { useApp } from '@/context/AppContext';
import { useGame } from '@/context/GameContext';
import { AppMode, GameRules, GameSetup, GameType, Lineup, Season, SEASON_TYPE_LABELS } from '@/models/types';
import { getLineups, getSeasons, markLineupUsed } from '@/services/storage';
import { useColors } from '@/hooks/useColors';

export default function GameSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lineupId, scheduledGameId, opponent } = useLocalSearchParams<{
    lineupId?: string; scheduledGameId?: string; opponent?: string;
  }>();
  const { settings, presets } = useApp();
  const { startGame } = useGame();

  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedLineupId, setSelectedLineupId] = useState(lineupId ?? '');
  const [opponentName, setOpponentName] = useState(opponent ?? '');
  const [isHome, setIsHome] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [mode, setMode] = useState<AppMode>(settings.mode);
  const [gameType, setGameType] = useState<GameType>(settings.defaultGameType);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(settings.activeSeasonId ?? '');
  const [rules, setRules] = useState<GameRules>({
    mode: settings.mode,
    gameType: settings.defaultGameType,
    innings: settings.defaultInnings,
    maxRunsPerHalfInning: settings.defaultMaxRunsPerHalfInning,
    outsPerHalfInning: settings.defaultOutsPerHalfInning,
    ballsForWalk: settings.defaultBallsForWalk,
    strikesForStrikeout: settings.defaultStrikesForStrikeout,
    maxPitchesPerBatter: settings.defaultMaxPitches,
    foulOnFinalPitch: false,
    mercyRule: null,
    autoAdvanceBatter: true,
    trackBalls: settings.mode === 'advanced',
    trackStrikes: settings.mode === 'advanced',
    trackPitches: settings.mode === 'advanced',
  });

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    Promise.all([getLineups(), getSeasons()]).then(([ls, ss]) => {
      setLineups(ls);
      setSeasons(ss);
    });
  }, []);

  useEffect(() => {
    if (opponent) setOpponentName(opponent);
  }, [opponent]);

  const applyPreset = (type: GameType) => {
    setGameType(type);
    const preset = presets[type];
    setRules((prev) => ({ ...prev, ...preset, gameType: type }));
    if (preset.mode) setMode(preset.mode);
  };

  const selectedLineup = lineups.find((l) => l.id === selectedLineupId);
  const activePlayers = selectedLineup?.players.filter((p) => p.isActive) ?? [];
  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId);

  const handleStart = async () => {
    if (!selectedLineupId) return;
    const lineup = lineups.find((l) => l.id === selectedLineupId);
    if (!lineup) return;

    await markLineupUsed(selectedLineupId);

    const finalRules: GameRules = { ...rules, mode, gameType };
    const setup: GameSetup = {
      lineupId: selectedLineupId,
      lineupSnapshot: activePlayers.length > 0 ? activePlayers : lineup.players,
      teamName: lineup.teamName || lineup.name,
      opponentName: opponentName.trim() || 'Opponent',
      isHome,
      rules: finalRules,
      date: new Date().toISOString(),
      isDemoMode: isDemoMode || undefined,
      scheduledGameId: scheduledGameId || undefined,
      seasonId: selectedSeasonId || undefined,
    };

    startGame(setup);
    router.replace('/game/live');
  };

  const seasonTypeColor = (type: Season['type']) => {
    if (type === 'tournament') return { bg: '#FFF8E1', fg: '#E65100' };
    if (type === 'preseason') return { bg: colors.muted, fg: colors.mutedForeground };
    return { bg: colors.secondary, fg: colors.primary };
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <ThemedText variant="h2">Game Setup</ThemedText>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 20 }]} keyboardShouldPersistTaps="handled">
        {/* Mode selector */}
        <Card style={{ marginBottom: 14 }}>
          <ThemedText variant="label" style={{ marginBottom: 10 }}>Game Mode</ThemedText>
          <View style={styles.modeToggle}>
            {(['basic', 'advanced'] as AppMode[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modeBtn, { backgroundColor: mode === m ? colors.primary : colors.muted, flex: 1 }]}
                onPress={() => setMode(m)}
              >
                <Feather name={m === 'basic' ? 'zap' : 'activity'} size={14} color={mode === m ? '#fff' : colors.mutedForeground} />
                <ThemedText variant="label" color={mode === m ? '#fff' : colors.foreground} style={{ marginLeft: 6 }}>{m === 'basic' ? 'Basic' : 'Advanced'}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Sandbox Mode */}
        <Card style={{ marginBottom: 14 }}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.sandboxIcon, { backgroundColor: isDemoMode ? '#FFF8E1' : colors.muted }]}>
                  <Feather name="activity" size={16} color={isDemoMode ? '#E65100' : colors.mutedForeground} />
                </View>
                <ThemedText variant="body" style={{ fontWeight: '600' }}>Sandbox Mode</ThemedText>
              </View>
              <ThemedText variant="caption" color={colors.mutedForeground} style={{ marginTop: 4 }}>
                Step through a simulated game to test your lineup. Stats are not saved.
              </ThemedText>
            </View>
            <Switch value={isDemoMode} onValueChange={setIsDemoMode} trackColor={{ true: '#E65100' }} />
          </View>
          {isDemoMode && (
            <View style={[styles.sandboxNote, { backgroundColor: '#FFF8E1', borderColor: '#FFE082' }]}>
              <Feather name="info" size={13} color="#E65100" />
              <ThemedText variant="caption" style={{ marginLeft: 6, color: '#E65100', flex: 1 }}>
                Results won't be recorded in your stats or game history.
              </ThemedText>
            </View>
          )}
        </Card>

        {/* Lineup picker */}
        <Card style={{ marginBottom: 14 }}>
          <View style={styles.sectionRow}>
            <ThemedText variant="h3">Lineup</ThemedText>
            <TouchableOpacity onPress={() => router.push('/lineups/editor')}>
              <ThemedText variant="caption" color={colors.primary}>+ New</ThemedText>
            </TouchableOpacity>
          </View>

          {lineups.length === 0 ? (
            <View style={styles.noLineup}>
              <Feather name="users" size={24} color={colors.mutedForeground} />
              <ThemedText variant="caption" align="center" style={{ marginTop: 8 }}>No lineups yet. Create one first.</ThemedText>
              <Button title="Create Lineup" size="sm" style={{ marginTop: 10 }} onPress={() => router.push('/lineups/editor')} />
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {lineups.map((l) => (
                <TouchableOpacity
                  key={l.id}
                  style={[styles.lineupOption, { borderColor: selectedLineupId === l.id ? colors.primary : colors.border, backgroundColor: selectedLineupId === l.id ? colors.secondary : colors.background }]}
                  onPress={() => setSelectedLineupId(l.id)}
                >
                  <View style={[styles.radioOuter, { borderColor: selectedLineupId === l.id ? colors.primary : colors.border }]}>
                    {selectedLineupId === l.id && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="body" style={{ fontWeight: '600' }}>{l.name}</ThemedText>
                    <ThemedText variant="caption">{l.players.filter((p) => p.isActive).length} players</ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* Game info */}
        <Card style={{ marginBottom: 14 }}>
          <ThemedText variant="h3" style={{ marginBottom: 12 }}>Game Info</ThemedText>
          <ThemedText variant="label" style={{ marginBottom: 6 }}>Opponent (optional)</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            placeholder="e.g. Tigers"
            placeholderTextColor={colors.mutedForeground}
            value={opponentName}
            onChangeText={setOpponentName}
          />
          <View style={styles.switchRow}>
            <View>
              <ThemedText variant="body">Home Team</ThemedText>
              <ThemedText variant="caption">We bat in the bottom of innings</ThemedText>
            </View>
            <Switch value={isHome} onValueChange={setIsHome} trackColor={{ true: colors.primary }} />
          </View>
        </Card>

        {/* Season / Tournament — only show if there are seasons */}
        {seasons.length > 0 && !isDemoMode && (
          <Card style={{ marginBottom: 14 }}>
            <View style={styles.sectionRow}>
              <ThemedText variant="h3">Season / Event</ThemedText>
              <TouchableOpacity onPress={() => router.push('/schedule/seasons')}>
                <ThemedText variant="caption" color={colors.primary}>Manage</ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 12 }}>
              Assign this game to a season so stats can be tracked separately.
            </ThemedText>

            {/* No season option */}
            <TouchableOpacity
              style={[styles.lineupOption, { borderColor: !selectedSeasonId ? colors.primary : colors.border, backgroundColor: !selectedSeasonId ? colors.secondary : colors.background }]}
              onPress={() => setSelectedSeasonId('')}
            >
              <View style={[styles.radioOuter, { borderColor: !selectedSeasonId ? colors.primary : colors.border }]}>
                {!selectedSeasonId && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
              </View>
              <ThemedText variant="body" color={colors.mutedForeground}>No season (one-off game)</ThemedText>
            </TouchableOpacity>

            {seasons.map((s) => {
              const tc = seasonTypeColor(s.type);
              const isSelected = selectedSeasonId === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.lineupOption, { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.secondary : colors.background }]}
                  onPress={() => setSelectedSeasonId(s.id)}
                >
                  <View style={[styles.radioOuter, { borderColor: isSelected ? colors.primary : colors.border }]}>
                    {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="body" style={{ fontWeight: '600' }}>{s.name}</ThemedText>
                    <ThemedText variant="caption">{s.year}</ThemedText>
                  </View>
                  <View style={[styles.typeBadge, { backgroundColor: tc.bg }]}>
                    <ThemedText variant="caption" style={{ color: tc.fg, fontWeight: '700', fontSize: 10 }}>
                      {SEASON_TYPE_LABELS[s.type]}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </Card>
        )}

        {/* If no seasons exist, show a quick prompt to create one for tournaments */}
        {seasons.length === 0 && !isDemoMode && (
          <TouchableOpacity
            style={[styles.createSeasonRow, { backgroundColor: colors.secondary, borderColor: colors.primary }]}
            onPress={() => router.push('/schedule/seasons')}
            activeOpacity={0.8}
          >
            <Feather name="plus-circle" size={16} color={colors.primary} />
            <ThemedText variant="caption" color={colors.primary} style={{ marginLeft: 8, fontWeight: '600' }}>
              Create a season or tournament to track stats separately
            </ThemedText>
          </TouchableOpacity>
        )}

        {/* Game type presets */}
        <Card style={{ marginBottom: 14 }}>
          <View style={styles.sectionRow}>
            <ThemedText variant="h3">Game Type</ThemedText>
            <TouchableOpacity onPress={() => router.push('/settings')}>
              <ThemedText variant="caption" color={colors.primary}>Edit presets</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.presetGrid}>
            {([
              { id: 'tball', label: 'T-Ball' },
              { id: 'coach_pitch', label: 'Coach Pitch' },
              { id: 'kid_pitch', label: 'Kid Pitch' },
              { id: 'custom', label: 'Custom' },
            ] as { id: GameType; label: string }[]).map((g) => {
              const p = presets[g.id];
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.presetBtn, { backgroundColor: gameType === g.id ? colors.primary : colors.muted, borderColor: gameType === g.id ? colors.primary : colors.border }]}
                  onPress={() => applyPreset(g.id)}
                >
                  <ThemedText variant="label" color={gameType === g.id ? '#fff' : colors.foreground}>{g.label}</ThemedText>
                  {p.innings !== undefined && (
                    <ThemedText variant="caption" color={gameType === g.id ? 'rgba(255,255,255,0.7)' : colors.mutedForeground}>{p.innings} inn</ThemedText>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Advanced rules */}
        <TouchableOpacity style={[styles.advancedToggle, { borderColor: colors.border }]} onPress={() => setShowAdvanced((v) => !v)}>
          <ThemedText variant="body" style={{ flex: 1 }}>Advanced Rules</ThemedText>
          <Feather name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
        </TouchableOpacity>

        {showAdvanced && (
          <Card style={{ marginBottom: 14 }}>
            {[
              { label: 'Innings', key: 'innings' as const, min: 1, max: 12 },
              { label: 'Outs per half inning', key: 'outsPerHalfInning' as const, min: 1, max: 6 },
            ].map((field) => (
              <View key={field.key} style={styles.ruleRow}>
                <ThemedText variant="body" style={{ flex: 1 }}>{field.label}</ThemedText>
                <View style={styles.stepper}>
                  <TouchableOpacity style={[styles.stepBtn, { borderColor: colors.border }]} onPress={() => setRules((r) => ({ ...r, [field.key]: Math.max(field.min, (r[field.key] as number) - 1) }))}>
                    <Feather name="minus" size={16} color={colors.foreground} />
                  </TouchableOpacity>
                  <ThemedText variant="body" style={{ minWidth: 24, textAlign: 'center' }}>{rules[field.key]}</ThemedText>
                  <TouchableOpacity style={[styles.stepBtn, { borderColor: colors.border }]} onPress={() => setRules((r) => ({ ...r, [field.key]: Math.min(field.max, (r[field.key] as number) + 1) }))}>
                    <Feather name="plus" size={16} color={colors.foreground} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={styles.switchRow}>
              <ThemedText variant="body">Max runs per inning</ThemedText>
              <Switch value={rules.maxRunsPerHalfInning !== null} onValueChange={(v) => setRules((r) => ({ ...r, maxRunsPerHalfInning: v ? 6 : null }))} trackColor={{ true: colors.primary }} />
            </View>
            {rules.maxRunsPerHalfInning !== null && (
              <View style={styles.ruleRow}>
                <ThemedText variant="body" style={{ flex: 1 }}>Run limit</ThemedText>
                <View style={styles.stepper}>
                  <TouchableOpacity style={[styles.stepBtn, { borderColor: colors.border }]} onPress={() => setRules((r) => ({ ...r, maxRunsPerHalfInning: Math.max(1, (r.maxRunsPerHalfInning ?? 6) - 1) }))}>
                    <Feather name="minus" size={16} color={colors.foreground} />
                  </TouchableOpacity>
                  <ThemedText variant="body" style={{ minWidth: 24, textAlign: 'center' }}>{rules.maxRunsPerHalfInning}</ThemedText>
                  <TouchableOpacity style={[styles.stepBtn, { borderColor: colors.border }]} onPress={() => setRules((r) => ({ ...r, maxRunsPerHalfInning: (r.maxRunsPerHalfInning ?? 6) + 1 }))}>
                    <Feather name="plus" size={16} color={colors.foreground} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {mode === 'advanced' && (
              <>
                <View style={styles.switchRow}>
                  <ThemedText variant="body">Track balls & strikes</ThemedText>
                  <Switch value={rules.trackBalls} onValueChange={(v) => setRules((r) => ({ ...r, trackBalls: v, trackStrikes: v }))} trackColor={{ true: colors.primary }} />
                </View>
                {rules.trackBalls && (
                  <View style={styles.ruleRow}>
                    <ThemedText variant="body" style={{ flex: 1 }}>Balls for walk</ThemedText>
                    <View style={styles.stepper}>
                      <TouchableOpacity style={[styles.stepBtn, { borderColor: colors.border }]} onPress={() => setRules((r) => ({ ...r, ballsForWalk: Math.max(1, (r.ballsForWalk ?? 4) - 1) }))}>
                        <Feather name="minus" size={16} color={colors.foreground} />
                      </TouchableOpacity>
                      <ThemedText variant="body" style={{ minWidth: 24, textAlign: 'center' }}>{rules.ballsForWalk ?? 4}</ThemedText>
                      <TouchableOpacity style={[styles.stepBtn, { borderColor: colors.border }]} onPress={() => setRules((r) => ({ ...r, ballsForWalk: (r.ballsForWalk ?? 4) + 1 }))}>
                        <Feather name="plus" size={16} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}
          </Card>
        )}

        {/* Selected season summary */}
        {selectedSeason && !isDemoMode && (
          <View style={[styles.seasonSummary, { backgroundColor: colors.secondary, borderColor: colors.primary }]}>
            <Feather name="tag" size={14} color={colors.primary} />
            <ThemedText variant="caption" color={colors.primary} style={{ marginLeft: 6 }}>
              Game counts toward <ThemedText variant="caption" style={{ fontWeight: '700', color: colors.primary }}>{selectedSeason.name}</ThemedText>
            </ThemedText>
          </View>
        )}

        <Button
          title={isDemoMode ? 'Start Sandbox Session' : 'Start Game'}
          size="xl"
          fullWidth
          disabled={!selectedLineupId || activePlayers.length === 0}
          icon={<Feather name={isDemoMode ? 'activity' : 'play'} size={18} color="#fff" />}
          onPress={handleStart}
          style={{ marginTop: 8 }}
        />
        {!selectedLineupId && (
          <ThemedText variant="caption" align="center" color={colors.destructive} style={{ marginTop: 8 }}>Select a lineup to continue</ThemedText>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { padding: 4, marginRight: 8 },
  content: { padding: 16 },
  modeToggle: { flexDirection: 'row', gap: 8 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  noLineup: { alignItems: 'center', paddingVertical: 16 },
  lineupOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, padding: 12, gap: 10, marginBottom: 8 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: 'Inter_400Regular' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  advancedToggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderRadius: 12, marginBottom: 14 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 32, height: 32, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sandboxIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sandboxNote: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, padding: 10, borderRadius: 8, borderWidth: 1 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  createSeasonRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 14 },
  seasonSummary: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14 },
});
