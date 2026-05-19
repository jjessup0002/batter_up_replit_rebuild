import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
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
import { ThemedText } from '@/components/ui/ThemedText';
import { useGame } from '@/context/GameContext';
import { EventType, GameRules, Player } from '@/models/types';
import { saveCompletedGame } from '@/services/storage';
import { useColors } from '@/hooks/useColors';

function CountDots({ count, max, color }: { count: number; max: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {Array.from({ length: max }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: i < count ? color : 'rgba(255,255,255,0.2)',
          }}
        />
      ))}
    </View>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  confirmDestructive,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={confirmStyles.overlay}>
        <View style={[confirmStyles.box, { backgroundColor: colors.card }]}>
          <ThemedText variant="h3" style={{ marginBottom: 8 }}>{title}</ThemedText>
          <ThemedText variant="body" style={{ marginBottom: 24, color: colors.mutedForeground }}>{message}</ThemedText>
          <View style={confirmStyles.buttons}>
            <TouchableOpacity
              style={[confirmStyles.btn, { backgroundColor: colors.muted, flex: 1 }]}
              onPress={onCancel}
            >
              <ThemedText variant="body" style={{ fontWeight: '600' }}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[confirmStyles.btn, { backgroundColor: confirmDestructive ? colors.destructive : colors.primary, flex: 1 }]}
              onPress={onConfirm}
            >
              <ThemedText variant="body" color="#fff" style={{ fontWeight: '700' }}>{confirmLabel}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const confirmStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { width: '100%', borderRadius: 16, padding: 24, maxWidth: 360 },
  buttons: { flexDirection: 'row', gap: 12 },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

// ─── In-Game Settings Modal ───────────────────────────────────────────────────

function GameSettingsModal({
  visible,
  game,
  onSave,
  onClose,
}: {
  visible: boolean;
  game: NonNullable<ReturnType<typeof useGame>['game']>;
  onSave: (opponentName: string, rules: Partial<GameRules>) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [opponentName, setOpponentName] = useState(game.setup.opponentName);
  const [innings, setInnings] = useState(game.setup.rules.innings);
  const [outsPerHalf, setOutsPerHalf] = useState(game.setup.rules.outsPerHalfInning);
  const [runLimit, setRunLimit] = useState(game.setup.rules.maxRunsPerHalfInning);
  const [ballsForWalk, setBallsForWalk] = useState(game.setup.rules.ballsForWalk);
  const [strikesForK, setStrikesForK] = useState(game.setup.rules.strikesForStrikeout);

  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    if (visible) {
      setOpponentName(game.setup.opponentName);
      setInnings(game.setup.rules.innings);
      setOutsPerHalf(game.setup.rules.outsPerHalfInning);
      setRunLimit(game.setup.rules.maxRunsPerHalfInning);
      setBallsForWalk(game.setup.rules.ballsForWalk);
      setStrikesForK(game.setup.rules.strikesForStrikeout);
    }
  }, [visible]);

  const handleSave = () => {
    onSave(opponentName, {
      innings,
      outsPerHalfInning: outsPerHalf,
      maxRunsPerHalfInning: runLimit,
      ballsForWalk,
      strikesForStrikeout: strikesForK,
    });
    onClose();
  };

  const Stepper = ({
    value,
    onChange,
    min = 1,
    max = 20,
    label,
  }: {
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    label: string;
  }) => (
    <View style={gsStyles.settingRow}>
      <ThemedText variant="body" style={{ flex: 1 }}>{label}</ThemedText>
      <View style={gsStyles.stepper}>
        <TouchableOpacity
          style={[gsStyles.stepBtn, { borderColor: colors.border }]}
          onPress={() => onChange(Math.max(min, value - 1))}
        >
          <Feather name="minus" size={16} color={colors.foreground} />
        </TouchableOpacity>
        <ThemedText variant="body" style={{ minWidth: 30, textAlign: 'center', fontWeight: '700' }}>
          {value}
        </ThemedText>
        <TouchableOpacity
          style={[gsStyles.stepBtn, { borderColor: colors.border }]}
          onPress={() => onChange(Math.min(max, value + 1))}
        >
          <Feather name="plus" size={16} color={colors.foreground} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const isAdvanced = game.setup.rules.mode === 'advanced';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={gsStyles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[gsStyles.sheet, { backgroundColor: colors.card, paddingBottom: botPad + 20 }]}>
          <View style={[gsStyles.handle, { backgroundColor: colors.border }]} />
          <View style={gsStyles.sheetHeader}>
            <ThemedText variant="h3">Game Settings</ThemedText>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Opponent Name */}
            <ThemedText variant="label" style={[gsStyles.sectionLabel, { color: colors.mutedForeground }]}>OPPONENT</ThemedText>
            <TextInput
              style={[gsStyles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={opponentName}
              onChangeText={setOpponentName}
              placeholder="Opponent team name"
              placeholderTextColor={colors.mutedForeground}
            />

            {/* Rules */}
            <ThemedText variant="label" style={[gsStyles.sectionLabel, { color: colors.mutedForeground, marginTop: 16 }]}>RULES</ThemedText>
            <View style={[gsStyles.rulesCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Stepper
                label="Total Innings"
                value={innings}
                onChange={setInnings}
                min={Math.max(game.currentInning, 1)}
                max={12}
              />
              <Stepper
                label="Outs per Half Inning"
                value={outsPerHalf}
                onChange={setOutsPerHalf}
                min={1}
                max={6}
              />

              {/* Run limit */}
              <View style={gsStyles.settingRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="body">Run Limit per Inning</ThemedText>
                  {runLimit !== null && (
                    <ThemedText variant="caption" style={{ color: colors.mutedForeground }}>{runLimit} runs max</ThemedText>
                  )}
                </View>
                <Switch
                  value={runLimit !== null}
                  onValueChange={(v) => setRunLimit(v ? 6 : null)}
                  trackColor={{ true: colors.primary }}
                />
              </View>
              {runLimit !== null && (
                <Stepper
                  label="Max runs"
                  value={runLimit}
                  onChange={setRunLimit}
                  min={1}
                  max={20}
                />
              )}

              {/* Advanced-only */}
              {isAdvanced && ballsForWalk !== null && (
                <Stepper
                  label="Balls for Walk"
                  value={ballsForWalk}
                  onChange={setBallsForWalk}
                  min={1}
                  max={6}
                />
              )}
              {isAdvanced && strikesForK !== null && (
                <Stepper
                  label="Strikes for Strikeout"
                  value={strikesForK}
                  onChange={setStrikesForK}
                  min={1}
                  max={6}
                />
              )}
            </View>

            {/* Score adjustment */}
            <ThemedText variant="label" style={[gsStyles.sectionLabel, { color: colors.mutedForeground, marginTop: 16 }]}>SCORE CORRECTION</ThemedText>
            <ThemedText variant="caption" style={{ color: colors.mutedForeground, marginBottom: 8 }}>
              Use the score buttons on the main screen to adjust the score directly.
            </ThemedText>

            <Button title="Save Changes" fullWidth size="lg" onPress={handleSave} style={{ marginTop: 8 }} />
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const gsStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sectionLabel: { fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, fontFamily: 'Inter_400Regular' },
  rulesCard: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingBottom: 8 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'transparent' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 32, height: 32, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LiveGameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    game, recordBall, recordStrike, recordFoul, recordHit, recordOut, recordWalk,
    recordHitByPitch, recordRunScored, recordEvent, nextBatter, prevBatter,
    undoLastEvent, endHalfInning, adjustScore, endGame, updateGameSetup,
  } = useGame();

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showEndInnConfirm, setShowEndInnConfirm] = useState(false);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const listRef = useRef<FlatList>(null);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  // When game becomes complete (via End Game button OR auto-end after max innings),
  // save the completed game and navigate to summary.
  useEffect(() => {
    if (game?.isComplete && !saving) {
      setSaving(true);
      saveCompletedGame(game)
        .then(() => {
          router.replace({ pathname: '/game/summary', params: { gameId: game.id } });
        })
        .catch(() => {
          router.replace({ pathname: '/game/summary', params: { gameId: game.id } });
        });
    }
  }, [game?.isComplete]);

  const haptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  const lightHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

  // Scroll to current batter
  useEffect(() => {
    if (!game) return;
    const activePlayers = game.setup.lineupSnapshot;
    const idx = game.currentBatterIndex % activePlayers.length;
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
    }, 100);
  }, [game?.currentBatterIndex]);

  if (!game) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.noGame}>
          <ThemedText variant="h3">No active game</ThemedText>
          <Button title="Go Home" style={{ marginTop: 16 }} onPress={() => router.replace('/home')} />
        </View>
      </View>
    );
  }

  const rules = game.setup.rules;
  const activePlayers = game.setup.lineupSnapshot;
  const currentBatter = activePlayers[game.currentBatterIndex % activePlayers.length];
  const onDeckIndex = (game.currentBatterIndex + 1) % activePlayers.length;
  const onDeckBatter = activePlayers[onDeckIndex];
  const isBasic = rules.mode === 'basic';
  const halfLabel = game.halfInning === 'top' ? '▲' : '▼';

  const handleEndInnConfirmed = () => {
    haptic();
    setShowEndInnConfirm(false);
    endHalfInning();
  };

  const handleEndGameConfirmed = () => {
    haptic();
    setShowEndGameConfirm(false);
    endGame();
    // Navigation handled by the useEffect above
  };

  const handleSaveGameSettings = (opponentName: string, ruleChanges: Partial<typeof rules>) => {
    updateGameSetup({
      opponentName,
      rules: { ...rules, ...ruleChanges },
    });
  };

  const renderBatterRow = ({ item, index }: { item: Player; index: number }) => {
    const isCurrentBatter = index === game.currentBatterIndex % activePlayers.length;
    const isOnDeck = index === onDeckIndex;
    return (
      <View
        style={[
          styles.batterRow,
          {
            backgroundColor: isCurrentBatter ? colors.primary : isOnDeck ? colors.secondary : colors.card,
            borderLeftWidth: isCurrentBatter ? 4 : 0,
            borderLeftColor: colors.accent,
          },
        ]}
      >
        <View style={[styles.orderBadge, { backgroundColor: isCurrentBatter ? 'rgba(255,255,255,0.2)' : colors.muted }]}>
          <ThemedText variant="caption" color={isCurrentBatter ? '#fff' : colors.mutedForeground} style={{ fontWeight: '700' }}>
            {index + 1}
          </ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText variant="body" color={isCurrentBatter ? '#fff' : colors.foreground} style={{ fontWeight: isCurrentBatter ? '700' : '400' }}>
            {item.name}
          </ThemedText>
          {item.jerseyNumber || item.primaryPosition ? (
            <ThemedText variant="caption" color={isCurrentBatter ? 'rgba(255,255,255,0.7)' : colors.mutedForeground}>
              {[item.jerseyNumber ? `#${item.jerseyNumber}` : null, item.primaryPosition].filter(Boolean).join(' · ')}
            </ThemedText>
          ) : null}
        </View>
        {isCurrentBatter && (
          <View style={styles.atBatBadge}>
            <ThemedText variant="caption" color={colors.accent} style={{ fontWeight: '700' }}>UP</ThemedText>
          </View>
        )}
        {isOnDeck && !isCurrentBatter && (
          <ThemedText variant="caption" color={colors.mutedForeground}>On Deck</ThemedText>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header scorecard */}
      <View style={[styles.scorecard, { paddingTop: topPad + 8, backgroundColor: colors.navy }]}>
        <View style={styles.scorecardRow}>
          {/* Inning + settings gear */}
          <View style={styles.inningBlock}>
            <ThemedText variant="caption" color="rgba(255,255,255,0.6)" style={{ textAlign: 'center' }}>INNING</ThemedText>
            <ThemedText variant="h1" color="#fff" style={{ textAlign: 'center', fontSize: 30 }}>
              {halfLabel} {game.currentInning}
            </ThemedText>
            <ThemedText variant="caption" color="rgba(255,255,255,0.5)" style={{ textAlign: 'center' }}>
              of {rules.innings}
            </ThemedText>
          </View>

          {/* Score */}
          <View style={styles.scoreBlock}>
            <View style={styles.scoreTeam}>
              <ThemedText variant="caption" color="rgba(255,255,255,0.6)" numberOfLines={1}>
                {game.setup.teamName.toUpperCase().slice(0, 10)}
              </ThemedText>
              <ThemedText style={{ fontSize: 40, fontWeight: '800', color: colors.accent }}>
                {game.myScore}
              </ThemedText>
            </View>
            <ThemedText variant="h2" color="rgba(255,255,255,0.4)" style={{ paddingHorizontal: 8 }}>—</ThemedText>
            <View style={styles.scoreTeam}>
              <ThemedText variant="caption" color="rgba(255,255,255,0.6)" numberOfLines={1}>
                {game.setup.opponentName.toUpperCase().slice(0, 10)}
              </ThemedText>
              <ThemedText style={{ fontSize: 40, fontWeight: '800', color: '#fff' }}>
                {game.opponentScore}
              </ThemedText>
            </View>
          </View>

          {/* Settings button */}
          <TouchableOpacity
            style={styles.gearBtn}
            onPress={() => setShowGameSettings(true)}
          >
            <Feather name="settings" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {/* Count strip (Advanced Mode) */}
        {!isBasic && (
          <View style={styles.countStrip}>
            {rules.trackBalls && (
              <View style={styles.countItem}>
                <ThemedText variant="caption" color="rgba(255,255,255,0.6)">BALLS</ThemedText>
                <CountDots count={game.balls} max={rules.ballsForWalk ?? 4} color={colors.success} />
              </View>
            )}
            {rules.trackStrikes && (
              <View style={styles.countItem}>
                <ThemedText variant="caption" color="rgba(255,255,255,0.6)">STRIKES</ThemedText>
                <CountDots count={game.strikes} max={rules.strikesForStrikeout ?? 3} color={colors.destructive} />
              </View>
            )}
            <View style={styles.countItem}>
              <ThemedText variant="caption" color="rgba(255,255,255,0.6)">OUTS</ThemedText>
              <CountDots count={game.outs} max={rules.outsPerHalfInning} color={colors.accent} />
            </View>
            {rules.maxRunsPerHalfInning !== null && (
              <View style={styles.countItem}>
                <ThemedText variant="caption" color="rgba(255,255,255,0.6)">RUNS</ThemedText>
                <ThemedText variant="h3" color={colors.accent}>{game.runsThisHalfInning}/{rules.maxRunsPerHalfInning}</ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Basic outs */}
        {isBasic && (
          <View style={[styles.countStrip, { justifyContent: 'center', gap: 24 }]}>
            <View style={styles.countItem}>
              <ThemedText variant="caption" color="rgba(255,255,255,0.6)">OUTS</ThemedText>
              <CountDots count={game.outs} max={rules.outsPerHalfInning} color={colors.accent} />
            </View>
            {rules.maxRunsPerHalfInning !== null && (
              <View style={styles.countItem}>
                <ThemedText variant="caption" color="rgba(255,255,255,0.6)">RUNS THIS INNING</ThemedText>
                <ThemedText variant="h3" color={colors.accent}>{game.runsThisHalfInning}</ThemedText>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Current batter highlight */}
      <View style={[styles.currentBatterBanner, { backgroundColor: colors.accent }]}>
        <View>
          <ThemedText variant="caption" style={{ fontWeight: '700' }}>NOW BATTING</ThemedText>
          <ThemedText variant="h2" style={{ fontWeight: '800' }}>{currentBatter?.name ?? '—'}</ThemedText>
          {currentBatter && (currentBatter.jerseyNumber || currentBatter.primaryPosition) && (
            <ThemedText variant="caption">
              {[currentBatter.jerseyNumber ? `#${currentBatter.jerseyNumber}` : null, currentBatter.primaryPosition].filter(Boolean).join(' · ')}
            </ThemedText>
          )}
        </View>
        {onDeckBatter && (
          <View style={styles.onDeckBadge}>
            <ThemedText variant="caption" style={{ fontWeight: '600' }}>On Deck</ThemedText>
            <ThemedText variant="body" style={{ fontWeight: '700' }}>{onDeckBatter.name}</ThemedText>
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={[styles.actionsArea, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {isBasic ? (
          <View style={styles.basicActions}>
            <View style={styles.actionRow}>
              <ActionButton label="Hit" icon="circle" color={colors.success} onPress={() => { haptic(); recordHit(); }} />
              <ActionButton label="Out" icon="x-circle" color={colors.destructive} onPress={() => { haptic(); recordOut(); }} />
              <ActionButton label="Walk" icon="arrow-right-circle" color={colors.primary} onPress={() => { haptic(); recordWalk(); }} />
              <ActionButton label="Run" icon="plus-circle" color={colors.accent} onPress={() => { haptic(); recordRunScored(); }} />
            </View>
            <View style={styles.actionRow}>
              <ActionButton label="Next" icon="chevrons-right" color={colors.primary} onPress={() => { lightHaptic(); nextBatter(); }} />
              <ActionButton label="End Inning" icon="skip-forward" color={colors.mutedForeground} onPress={() => setShowEndInnConfirm(true)} />
              <ActionButton label="Undo" icon="corner-up-left" color={colors.mutedForeground} onPress={() => { lightHaptic(); undoLastEvent(); }} />
            </View>
          </View>
        ) : (
          <View style={styles.advancedActions}>
            <View style={styles.actionRow}>
              <ActionButton label="Ball" icon="circle" color="#2E7D32" onPress={() => { haptic(); recordBall(); }} />
              <ActionButton label="Strike" icon="x" color={colors.destructive} onPress={() => { haptic(); recordStrike(); }} />
              <ActionButton label="Foul" icon="wind" color="#F57C00" onPress={() => { haptic(); recordFoul(); }} />
              <ActionButton label="Hit" icon="arrow-up-right" color={colors.success} onPress={() => { haptic(); recordHit(); }} />
            </View>
            <View style={styles.actionRow}>
              <ActionButton label="Out" icon="x-circle" color={colors.destructive} onPress={() => { haptic(); recordOut(); }} />
              <ActionButton label="Walk" icon="arrow-right" color={colors.primary} onPress={() => { haptic(); recordWalk(); }} />
              <ActionButton label="HBP" icon="user-x" color="#9C27B0" onPress={() => { haptic(); recordHitByPitch(); }} />
              <ActionButton label="Run" icon="plus" color={colors.accent} onPress={() => { haptic(); recordRunScored(); }} />
            </View>
            <View style={styles.actionRow}>
              <ActionButton label="Next" icon="chevrons-right" color={colors.primary} onPress={() => { lightHaptic(); nextBatter(); }} />
              <ActionButton label="End Inn." icon="skip-forward" color={colors.mutedForeground} onPress={() => setShowEndInnConfirm(true)} />
              <ActionButton label="Undo" icon="corner-up-left" color={colors.mutedForeground} onPress={() => { lightHaptic(); undoLastEvent(); }} />
              <ActionButton label="More" icon="more-horizontal" color={colors.mutedForeground} onPress={() => setShowMoreMenu(true)} />
            </View>
          </View>
        )}

        {/* Score adjustments */}
        <View style={[styles.scoreAdjust, { borderTopColor: colors.border }]}>
          <TouchableOpacity style={[styles.adjBtn, { borderColor: colors.border }]} onPress={() => adjustScore('my', 1)}>
            <ThemedText variant="caption">+1 Us</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.adjBtn, { borderColor: colors.border }]} onPress={() => adjustScore('my', -1)}>
            <ThemedText variant="caption">-1 Us</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.adjBtn, { borderColor: colors.border }]} onPress={() => adjustScore('opponent', 1)}>
            <ThemedText variant="caption">+1 Opp</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.adjBtn, { borderColor: colors.border }]} onPress={() => adjustScore('opponent', -1)}>
            <ThemedText variant="caption">-1 Opp</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Batting order list */}
      <FlatList
        ref={listRef}
        data={activePlayers}
        keyExtractor={(item) => item.id}
        renderItem={renderBatterRow}
        contentContainerStyle={[styles.list, { paddingBottom: botPad + 80 }]}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={() => {}}
      />

      {/* End game bar */}
      <View style={[styles.endGameBar, { bottom: botPad, borderTopColor: colors.border, backgroundColor: colors.card }]}>
        <Button
          title="End Game"
          variant="outline"
          size="sm"
          onPress={() => setShowEndGameConfirm(true)}
          style={{ flex: 1 }}
        />
      </View>

      {/* ─── Modals ─── */}

      {/* End Inning Confirm */}
      <ConfirmModal
        visible={showEndInnConfirm}
        title="End Half-Inning?"
        message={`End the ${game.halfInning === 'top' ? 'top' : 'bottom'} of inning ${game.currentInning}?`}
        confirmLabel="End Inning"
        onConfirm={handleEndInnConfirmed}
        onCancel={() => setShowEndInnConfirm(false)}
      />

      {/* End Game Confirm */}
      <ConfirmModal
        visible={showEndGameConfirm}
        title="End Game?"
        message={`Final score: ${game.myScore}–${game.opponentScore}. This will save the game and go to the summary.`}
        confirmLabel="End Game"
        confirmDestructive
        onConfirm={handleEndGameConfirmed}
        onCancel={() => setShowEndGameConfirm(false)}
      />

      {/* In-Game Settings */}
      <GameSettingsModal
        visible={showGameSettings}
        game={game}
        onSave={handleSaveGameSettings}
        onClose={() => setShowGameSettings(false)}
      />

      {/* More menu */}
      <Modal visible={showMoreMenu} transparent animationType="slide" onRequestClose={() => setShowMoreMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMoreMenu(false)}>
          <View style={[styles.moreSheet, { backgroundColor: colors.card, paddingBottom: botPad + 20 }]}>
            <View style={[styles.moreHandle, { backgroundColor: colors.border }]} />
            <ThemedText variant="h3" style={{ marginBottom: 16 }}>More Events</ThemedText>
            <View style={styles.moreGrid}>
              {([
                { label: 'Single', type: 'single' },
                { label: 'Double', type: 'double' },
                { label: 'Triple', type: 'triple' },
                { label: 'Home Run', type: 'homerun' },
                { label: 'Error', type: 'reached_on_error' },
                { label: "Fielder's Choice", type: 'fielders_choice' },
                { label: 'Sacrifice', type: 'sacrifice' },
                { label: 'Stolen Base', type: 'stolen_base' },
                { label: 'Caught Stealing', type: 'caught_stealing' },
              ] as { label: string; type: EventType }[]).map((item) => (
                <TouchableOpacity
                  key={item.type}
                  style={[styles.moreItem, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  onPress={() => {
                    haptic();
                    if (item.type === 'single' || item.type === 'double' || item.type === 'triple' || item.type === 'homerun') {
                      recordHit(item.type as any);
                    } else {
                      recordEvent(item.type);
                    }
                    setShowMoreMenu(false);
                  }}
                >
                  <ThemedText variant="body" style={{ fontWeight: '600' }}>{item.label}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function ActionButton({ label, icon, color, onPress }: { label: string; icon: string; color: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: color + '15', borderColor: color + '40' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Feather name={icon as any} size={22} color={color} />
      <ThemedText variant="caption" color={color} style={{ marginTop: 3, fontWeight: '700' }}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  noGame: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scorecard: { paddingHorizontal: 16, paddingBottom: 12 },
  scorecardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  inningBlock: { width: 72 },
  scoreBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  scoreTeam: { alignItems: 'center', flex: 1 },
  gearBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  countStrip: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, paddingBottom: 4 },
  countItem: { alignItems: 'center', gap: 4 },
  currentBatterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  onDeckBadge: { alignItems: 'flex-end' },
  actionsArea: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, padding: 12 },
  basicActions: { gap: 8 },
  advancedActions: { gap: 8 },
  actionRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 60,
  },
  scoreAdjust: { flexDirection: 'row', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  adjBtn: { flex: 1, alignItems: 'center', paddingVertical: 7, borderWidth: 1, borderRadius: 8 },
  list: { paddingHorizontal: 12, paddingTop: 8 },
  batterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 5,
    gap: 10,
  },
  orderBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  atBatBadge: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 6 },
  endGameBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  moreSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  moreHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  moreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moreItem: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
});
