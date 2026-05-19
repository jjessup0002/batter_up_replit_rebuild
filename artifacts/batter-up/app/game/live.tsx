import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Linking,
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
import { clearActiveGame, incrementGameSessions, saveCompletedGame, shouldShowReviewPrompt, getSettings } from '@/services/storage';
import { useColors } from '@/hooks/useColors';

// ─── Count Dots ───────────────────────────────────────────────────────────────

function CountDots({ count, max, color }: { count: number; max: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {Array.from({ length: max }).map((_, i) => (
        <View key={i} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: i < count ? color : 'rgba(255,255,255,0.2)' }} />
      ))}
    </View>
  );
}

// ─── Action Button ─────────────────────────────────────────────────────────────

function ActionButton({
  label, icon, color, onPress, small,
}: {
  label: string; icon: string; color: string; onPress: () => void; small?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity style={[styles.actionBtn, small && styles.actionBtnSmall]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.actionIconWrap, { backgroundColor: color + '18' }, small && styles.actionIconSmall]}>
        <Feather name={icon as any} size={small ? 18 : 22} color={color} />
      </View>
      <ThemedText variant="caption" style={{ marginTop: 4, fontWeight: '600', color: colors.foreground }}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

// ─── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  visible, title, message, confirmLabel, confirmDestructive, onConfirm, onCancel,
}: {
  visible: boolean; title: string; message: string; confirmLabel: string;
  confirmDestructive?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={cmStyles.overlay}>
        <View style={[cmStyles.box, { backgroundColor: colors.card }]}>
          <ThemedText variant="h3" style={{ marginBottom: 8 }}>{title}</ThemedText>
          <ThemedText variant="body" style={{ marginBottom: 24, color: colors.mutedForeground }}>{message}</ThemedText>
          <View style={cmStyles.buttons}>
            <TouchableOpacity style={[cmStyles.btn, { backgroundColor: colors.muted, flex: 1 }]} onPress={onCancel}>
              <ThemedText variant="body" style={{ fontWeight: '600' }}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cmStyles.btn, { backgroundColor: confirmDestructive ? colors.destructive : colors.primary, flex: 1 }]}
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
const cmStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { width: '100%', borderRadius: 16, padding: 24, maxWidth: 360 },
  buttons: { flexDirection: 'row', gap: 12 },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

// ─── Save / Discard Modal ──────────────────────────────────────────────────────

function SaveDiscardModal({
  visible, isDemoMode, isSaving, onSave, onDiscard,
}: {
  visible: boolean; isDemoMode: boolean; isSaving: boolean; onSave: () => void; onDiscard: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDiscard}>
      <View style={sdStyles.overlay}>
        <View style={[sdStyles.sheet, { backgroundColor: colors.card, paddingBottom: botPad + 16 }]}>
          <View style={[sdStyles.handle, { backgroundColor: colors.border }]} />
          <View style={[sdStyles.iconWrap, { backgroundColor: isDemoMode ? '#FFF8E1' : colors.secondary }]}>
            <Feather name={isDemoMode ? 'activity' : 'save'} size={32} color={isDemoMode ? '#E65100' : colors.primary} />
          </View>
          <ThemedText variant="h2" align="center" style={{ marginTop: 14 }}>
            {isDemoMode ? 'Sandbox Session Ended' : 'Game Over'}
          </ThemedText>
          <ThemedText variant="body" align="center" color={colors.mutedForeground} style={{ marginTop: 8, marginBottom: 24, paddingHorizontal: 8 }}>
            {isDemoMode
              ? 'This was a sandbox session — stats are not saved. Want to save your lineup?'
              : 'Save this game to your stats history, or discard it.'}
          </ThemedText>
          <Button
            title={isSaving ? 'Saving...' : isDemoMode ? 'Back to Home' : 'Save Game Stats'}
            size="lg"
            fullWidth
            disabled={isSaving}
            onPress={onSave}
            style={{ marginBottom: 10 }}
          />
          <Button
            title={isDemoMode ? 'Discard Session' : 'Discard Stats'}
            variant="outline"
            size="lg"
            fullWidth
            disabled={isSaving}
            onPress={onDiscard}
          />
        </View>
      </View>
    </Modal>
  );
}
const sdStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, marginBottom: 20 },
  iconWrap: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

// ─── Rain Delay Modal ──────────────────────────────────────────────────────────

function RainDelayModal({
  visible, onExit, onCancel,
}: {
  visible: boolean; onExit: () => void; onCancel: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={rdStyles.overlay}>
        <View style={[rdStyles.sheet, { backgroundColor: colors.card, paddingBottom: botPad + 16 }]}>
          <View style={[rdStyles.handle, { backgroundColor: colors.border }]} />
          <View style={[rdStyles.iconWrap, { backgroundColor: '#E3F2FD' }]}>
            <Feather name="cloud-rain" size={32} color="#1565C0" />
          </View>
          <ThemedText variant="h2" align="center" style={{ marginTop: 14 }}>Pause Game</ThemedText>
          <ThemedText variant="body" align="center" color={colors.mutedForeground} style={{ marginTop: 8, marginBottom: 8, paddingHorizontal: 8 }}>
            Stepping away for a rain delay or break?
          </ThemedText>
          <ThemedText variant="body" align="center" color={colors.mutedForeground} style={{ marginBottom: 24, paddingHorizontal: 8 }}>
            Your game is saved automatically. Return to the home screen and tap "Resume Game" to pick up right where you left off.
          </ThemedText>
          <Button title="Exit to Home" size="lg" fullWidth onPress={onExit} style={{ marginBottom: 10 }} />
          <Button title="Stay in Game" variant="outline" size="lg" fullWidth onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}
const rdStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, marginBottom: 20 },
  iconWrap: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

// ─── In-Game Settings Modal ────────────────────────────────────────────────────

function GameSettingsModal({
  visible, game, onSave, onClose,
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

  const Stepper = ({ value, onChange, min = 1, max = 20, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) => (
    <View style={gsStyles.settingRow}>
      <ThemedText variant="body" style={{ flex: 1 }}>{label}</ThemedText>
      <View style={gsStyles.stepper}>
        <TouchableOpacity style={[gsStyles.stepBtn, { borderColor: colors.border }]} onPress={() => onChange(Math.max(min, value - 1))}>
          <Feather name="minus" size={16} color={colors.foreground} />
        </TouchableOpacity>
        <ThemedText variant="body" style={{ minWidth: 30, textAlign: 'center', fontWeight: '700' }}>{value}</ThemedText>
        <TouchableOpacity style={[gsStyles.stepBtn, { borderColor: colors.border }]} onPress={() => onChange(Math.min(max, value + 1))}>
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
            <ThemedText variant="label" style={[gsStyles.sectionLabel, { color: colors.mutedForeground }]}>OPPONENT</ThemedText>
            <TextInput
              style={[gsStyles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={opponentName}
              onChangeText={setOpponentName}
              placeholder="Opponent team name"
              placeholderTextColor={colors.mutedForeground}
            />
            <ThemedText variant="label" style={[gsStyles.sectionLabel, { color: colors.mutedForeground, marginTop: 16 }]}>RULES</ThemedText>
            <View style={[gsStyles.rulesCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Stepper label="Total Innings" value={innings} onChange={setInnings} min={Math.max(game.currentInning, 1)} max={12} />
              <Stepper label="Outs per Half Inning" value={outsPerHalf} onChange={setOutsPerHalf} min={1} max={6} />
              <View style={gsStyles.settingRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="body">Run Limit per Inning</ThemedText>
                  {runLimit !== null && <ThemedText variant="caption" style={{ color: colors.mutedForeground }}>{runLimit} runs max</ThemedText>}
                </View>
                <Switch value={runLimit !== null} onValueChange={(v) => setRunLimit(v ? 6 : null)} trackColor={{ true: colors.primary }} />
              </View>
              {runLimit !== null && <Stepper label="Max runs" value={runLimit} onChange={setRunLimit} min={1} max={20} />}
              {isAdvanced && ballsForWalk !== null && <Stepper label="Balls for Walk" value={ballsForWalk} onChange={setBallsForWalk} min={1} max={6} />}
              {isAdvanced && strikesForK !== null && <Stepper label="Strikes for Strikeout" value={strikesForK} onChange={setStrikesForK} min={1} max={6} />}
            </View>
            <Button
              title="Save Changes"
              fullWidth
              size="lg"
              onPress={() => {
                onSave(opponentName, { innings, outsPerHalfInning: outsPerHalf, maxRunsPerHalfInning: runLimit, ballsForWalk, strikesForStrikeout: strikesForK });
                onClose();
              }}
              style={{ marginTop: 16 }}
            />
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
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 32, height: 32, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});

// ─── Game Menu Modal ───────────────────────────────────────────────────────────

function GameMenuModal({
  visible, currentMode, onSwitchMode, onReturnHome, onRainDelay, onOpenSettings, onEndGame, onClose,
}: {
  visible: boolean;
  currentMode: 'basic' | 'advanced';
  onSwitchMode: () => void;
  onReturnHome: () => void;
  onRainDelay: () => void;
  onOpenSettings: () => void;
  onEndGame: () => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const switchToLabel = currentMode === 'basic' ? 'Switch to Advanced Mode' : 'Switch to Basic Mode';

  const items: { icon: string; label: string; sub?: string; onPress: () => void; destructive?: boolean }[] = [
    { icon: 'home', label: 'Return to Home', sub: 'Game stays in progress', onPress: onReturnHome },
    { icon: 'refresh-cw', label: switchToLabel, sub: 'Keeps score, lineup, and stats', onPress: onSwitchMode },
    { icon: 'cloud-rain', label: 'Pause for Rain Delay', sub: 'Save and step away', onPress: onRainDelay },
    { icon: 'sliders', label: 'Game Settings', sub: 'Opponent name and rules', onPress: onOpenSettings },
    { icon: 'flag', label: 'End Game', sub: 'Save the final score and stats', onPress: onEndGame, destructive: true },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={gmStyles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={[gmStyles.sheet, { backgroundColor: colors.card, paddingBottom: botPad + 12 }]}>
            <View style={[gmStyles.handle, { backgroundColor: colors.border }]} />
            <ThemedText variant="h3" align="center" style={{ marginBottom: 4 }}>Game Menu</ThemedText>
            <ThemedText variant="caption" align="center" style={{ color: colors.mutedForeground, marginBottom: 16 }}>
              Current mode: {currentMode === 'basic' ? 'Basic' : 'Advanced'}
            </ThemedText>
            {items.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[gmStyles.row, { borderColor: colors.border }]}
                onPress={() => { onClose(); setTimeout(item.onPress, 100); }}
                activeOpacity={0.7}
              >
                <View style={[gmStyles.iconWrap, { backgroundColor: item.destructive ? colors.destructive + '15' : colors.secondary }]}>
                  <Feather name={item.icon as any} size={18} color={item.destructive ? colors.destructive : colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="body" style={{ fontWeight: '600', color: item.destructive ? colors.destructive : colors.foreground }}>
                    {item.label}
                  </ThemedText>
                  {item.sub && (
                    <ThemedText variant="caption" style={{ color: colors.mutedForeground, marginTop: 2 }}>{item.sub}</ThemedText>
                  )}
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
            <Button title="Close" variant="outline" size="lg" fullWidth onPress={onClose} style={{ marginTop: 12 }} />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
const gmStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function LiveGameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    game, recordBall, recordStrike, recordFoul, recordHit, recordOut, recordWalk,
    recordHitByPitch, recordRunScored, recordEvent, nextBatter, prevBatter,
    undoLastEvent, endHalfInning, adjustScore, endGame, updateGameSetup,
  } = useGame();

  const [showEndInnConfirm, setShowEndInnConfirm] = useState(false);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
  const [showSaveDiscard, setShowSaveDiscard] = useState(false);
  const [showRainDelay, setShowRainDelay] = useState(false);
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [showModeSwitchConfirm, setShowModeSwitchConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const listRef = useRef<FlatList>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const isDemoMode = game?.setup.isDemoMode ?? false;

  // When game becomes complete, show save/discard (or skip for demo mode)
  useEffect(() => {
    if (game?.isComplete && !saving && !showSaveDiscard) {
      setShowSaveDiscard(true);
    }
  }, [game?.isComplete]);

  // Scroll to current batter
  useEffect(() => {
    if (!game) return;
    const activePlayers = game.setup.lineupSnapshot;
    const idx = game.currentBatterIndex % activePlayers.length;
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
    }, 100);
  }, [game?.currentBatterIndex]);

  const haptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  const lightHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

  const handleSaveGame = async () => {
    if (!game) return;
    setSaving(true);
    if (isDemoMode) {
      // Demo mode: just go home, no stats saved
      await clearActiveGame().catch(() => {});
      router.replace('/home');
      return;
    }
    try {
      await saveCompletedGame(game);
      await clearActiveGame().catch(() => {});
      // Check if we should show review prompt (handled in summary screen)
      const count = await incrementGameSessions();
      router.replace({ pathname: '/game/summary', params: { gameId: game.id } });
    } catch {
      router.replace({ pathname: '/game/summary', params: { gameId: game.id } });
    }
  };

  const handleDiscardGame = async () => {
    await clearActiveGame().catch(() => {});
    router.replace('/home');
  };

  const handleRainDelayExit = () => {
    setShowRainDelay(false);
    // Game stays in memory + AsyncStorage — resume from home
    router.replace('/home');
  };

  const handleEndGameConfirmed = () => {
    haptic();
    setShowEndGameConfirm(false);
    endGame();
    // useEffect will trigger ShowSaveDiscard
  };

  const handleSaveGameSettings = (opponentName: string, ruleChanges: Partial<typeof rules>) => {
    if (!game) return;
    updateGameSetup({ opponentName, rules: { ...game.setup.rules, ...ruleChanges } });
  };

  const handleConfirmSwitchMode = () => {
    if (!game) return;
    haptic();
    const current = game.setup.rules;
    const newMode = current.mode === 'basic' ? 'advanced' : 'basic';
    // Normalize dependent tracking fields so the new mode is actually usable.
    // Basic presets often have trackBalls/trackStrikes off and null thresholds;
    // switching to advanced must enable count tracking with safe defaults.
    // Preserve existing values when they're already set so coaches don't lose
    // custom rule choices.
    const nextRules: GameRules = newMode === 'advanced'
      ? {
          ...current,
          mode: 'advanced',
          trackBalls: true,
          trackStrikes: true,
          ballsForWalk: current.ballsForWalk ?? 4,
          strikesForStrikeout: current.strikesForStrikeout ?? 3,
        }
      : { ...current, mode: 'basic' };
    updateGameSetup({ rules: nextRules });
    setShowModeSwitchConfirm(false);
  };

  const handleReturnHome = () => {
    // Game state is auto-saved via GameContext useEffect; just navigate home.
    // Home screen shows the Resume banner when an active game exists.
    router.replace('/home');
  };

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

  const renderBatterRow = ({ item, index }: { item: Player; index: number }) => {
    const isCurrentBatter = index === game.currentBatterIndex % activePlayers.length;
    const isOnDeck = index === onDeckIndex;
    return (
      <View style={[styles.batterRow, {
        backgroundColor: isCurrentBatter ? colors.primary : isOnDeck ? colors.secondary : colors.card,
        borderLeftWidth: isCurrentBatter ? 4 : 0,
        borderLeftColor: colors.accent,
      }]}>
        <View style={[styles.orderBadge, { backgroundColor: isCurrentBatter ? 'rgba(255,255,255,0.2)' : colors.muted }]}>
          <ThemedText variant="caption" color={isCurrentBatter ? '#fff' : colors.mutedForeground} style={{ fontWeight: '700' }}>{index + 1}</ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText variant="body" color={isCurrentBatter ? '#fff' : colors.foreground} style={{ fontWeight: isCurrentBatter ? '700' : '400' }}>{item.name}</ThemedText>
          {(item.jerseyNumber || item.primaryPosition) && (
            <ThemedText variant="caption" color={isCurrentBatter ? 'rgba(255,255,255,0.7)' : colors.mutedForeground}>
              {[item.jerseyNumber ? `#${item.jerseyNumber}` : null, item.primaryPosition].filter(Boolean).join(' · ')}
            </ThemedText>
          )}
        </View>
        {isCurrentBatter && <View style={styles.atBatBadge}><ThemedText variant="caption" color={colors.accent} style={{ fontWeight: '700' }}>UP</ThemedText></View>}
        {isOnDeck && !isCurrentBatter && <ThemedText variant="caption" color={colors.mutedForeground}>On Deck</ThemedText>}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header scorecard */}
      <View style={[styles.scorecard, { paddingTop: topPad + 8, backgroundColor: colors.navy }]}>
        <View style={styles.scorecardRow}>
          <View style={styles.inningBlock}>
            <ThemedText variant="caption" color="rgba(255,255,255,0.6)" style={{ textAlign: 'center' }}>INNING</ThemedText>
            <ThemedText variant="h1" color="#fff" style={{ textAlign: 'center', fontSize: 30 }}>{halfLabel} {game.currentInning}</ThemedText>
            <ThemedText variant="caption" color="rgba(255,255,255,0.5)" style={{ textAlign: 'center' }}>of {rules.innings}</ThemedText>
          </View>

          <View style={styles.scoreBlock}>
            <View style={styles.scoreTeam}>
              <ThemedText variant="caption" color="rgba(255,255,255,0.6)" numberOfLines={1}>{game.setup.teamName.toUpperCase().slice(0, 10)}</ThemedText>
              <View style={styles.scoreWithAdj}>
                <TouchableOpacity onPress={() => adjustScore('my', -1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="minus" size={14} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
                <ThemedText style={{ fontSize: 40, fontWeight: '800', color: colors.accent }}>{game.myScore}</ThemedText>
                <TouchableOpacity onPress={() => adjustScore('my', 1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="plus" size={14} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>
            </View>
            <ThemedText variant="h2" color="rgba(255,255,255,0.4)" style={{ paddingHorizontal: 8 }}>—</ThemedText>
            <View style={styles.scoreTeam}>
              <ThemedText variant="caption" color="rgba(255,255,255,0.6)" numberOfLines={1}>{game.setup.opponentName.toUpperCase().slice(0, 10)}</ThemedText>
              <View style={styles.scoreWithAdj}>
                <TouchableOpacity onPress={() => adjustScore('opponent', -1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="minus" size={14} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
                <ThemedText style={{ fontSize: 40, fontWeight: '800', color: '#fff' }}>{game.opponentScore}</ThemedText>
                <TouchableOpacity onPress={() => adjustScore('opponent', 1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="plus" size={14} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Header controls: game menu + settings */}
          <View style={styles.headerControls}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowGameMenu(true)} accessibilityLabel="Game menu">
              <Feather name="more-vertical" size={20} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowGameSettings(true)} accessibilityLabel="Game settings">
              <Feather name="settings" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Count strip */}
        {!isBasic ? (
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
        ) : (
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

      {/* Demo mode badge */}
      {isDemoMode && (
        <View style={[styles.demoBadge, { backgroundColor: '#FFF8E1' }]}>
          <Feather name="activity" size={13} color="#E65100" />
          <ThemedText variant="caption" style={{ marginLeft: 6, color: '#E65100', fontWeight: '700' }}>SANDBOX MODE — Stats not saved</ThemedText>
        </View>
      )}

      {/* Current batter highlight */}
      <View style={[styles.currentBatterBanner, { backgroundColor: colors.accent }]}>
        <View>
          <ThemedText variant="caption" style={{ fontWeight: '700' }}>NOW BATTING</ThemedText>
          <ThemedText variant="h2" style={{ fontWeight: '800' }}>{currentBatter?.name ?? '—'}</ThemedText>
          {currentBatter && (currentBatter.jerseyNumber || currentBatter.primaryPosition) && (
            <ThemedText variant="caption">{[currentBatter.jerseyNumber ? `#${currentBatter.jerseyNumber}` : null, currentBatter.primaryPosition].filter(Boolean).join(' · ')}</ThemedText>
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
              <ActionButton label="Next" icon="chevrons-right" color={colors.primary} onPress={() => { lightHaptic(); nextBatter(); }} small />
              <ActionButton label="End Inning" icon="skip-forward" color={colors.mutedForeground} onPress={() => setShowEndInnConfirm(true)} small />
              <ActionButton label="Undo" icon="corner-up-left" color={colors.mutedForeground} onPress={() => { lightHaptic(); undoLastEvent(); }} small />
            </View>
          </View>
        ) : (
          <View style={styles.advancedActions}>
            <View style={styles.actionRow}>
              <ActionButton label="Ball" icon="circle" color="#2E7D32" onPress={() => { haptic(); recordBall(); }} />
              <ActionButton label="Strike" icon="x" color={colors.destructive} onPress={() => { haptic(); recordStrike(); }} />
              <ActionButton label="Foul" icon="wind" color="#F57C00" onPress={() => { haptic(); recordFoul(); }} />
              <ActionButton label="Out" icon="x-circle" color="#B71C1C" onPress={() => { haptic(); recordOut(); }} />
            </View>
            <View style={styles.actionRow}>
              <ActionButton label="Hit" icon="circle" color={colors.success} onPress={() => { haptic(); recordHit('single'); }} small />
              <ActionButton label="2B" icon="chevrons-right" color={colors.success} onPress={() => { haptic(); recordHit('double'); }} small />
              <ActionButton label="3B" icon="fast-forward" color={colors.success} onPress={() => { haptic(); recordHit('triple'); }} small />
              <ActionButton label="HR" icon="star" color={colors.accent} onPress={() => { haptic(); recordHit('homerun'); }} small />
            </View>
            <View style={styles.actionRow}>
              <ActionButton label="Walk" icon="arrow-right-circle" color={colors.primary} onPress={() => { haptic(); recordWalk(); }} small />
              <ActionButton label="HBP" icon="zap" color="#7B1FA2" onPress={() => { haptic(); recordHitByPitch(); }} small />
              <ActionButton label="Run" icon="plus-circle" color={colors.accent} onPress={() => { haptic(); recordRunScored(); }} small />
              <ActionButton label="Undo" icon="corner-up-left" color={colors.mutedForeground} onPress={() => { lightHaptic(); undoLastEvent(); }} small />
            </View>
            <View style={styles.actionRow}>
              <ActionButton label="Next" icon="chevrons-right" color={colors.primary} onPress={() => { lightHaptic(); nextBatter(); }} small />
              <ActionButton label="End Inning" icon="skip-forward" color={colors.mutedForeground} onPress={() => setShowEndInnConfirm(true)} small />
            </View>
          </View>
        )}
      </View>

      {/* Lineup list — flex: 1 to fill remaining space */}
      <FlatList
        ref={listRef}
        data={activePlayers}
        keyExtractor={(p) => p.id}
        renderItem={renderBatterRow}
        style={{ flex: 1 }}
        onScrollToIndexFailed={() => {}}
        showsVerticalScrollIndicator={false}
      />

      {/* End game bar — NOT absolute, fills bottom properly */}
      <View style={[styles.endGameBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: botPad + 10 }]}>
        <Button
          title={isDemoMode ? 'End Session' : 'End Game'}
          size="lg"
          fullWidth
          variant={isDemoMode ? 'outline' : 'destructive'}
          onPress={() => setShowEndGameConfirm(true)}
        />
      </View>

      {/* Modals */}
      <ConfirmModal
        visible={showEndInnConfirm}
        title="End Half Inning?"
        message={`This will advance to the ${game.halfInning === 'top' ? 'bottom' : 'top of next'} inning and reset the count.`}
        confirmLabel="End Inning"
        onConfirm={() => { haptic(); setShowEndInnConfirm(false); endHalfInning(); }}
        onCancel={() => setShowEndInnConfirm(false)}
      />

      <ConfirmModal
        visible={showEndGameConfirm}
        title={isDemoMode ? 'End Sandbox Session?' : 'End Game?'}
        message={isDemoMode
          ? 'This will end your sandbox session. Stats are not saved in sandbox mode.'
          : `Final score: ${game.setup.teamName} ${game.myScore} — ${game.setup.opponentName} ${game.opponentScore}`}
        confirmLabel={isDemoMode ? 'End Session' : 'End Game'}
        confirmDestructive={!isDemoMode}
        onConfirm={handleEndGameConfirmed}
        onCancel={() => setShowEndGameConfirm(false)}
      />

      <SaveDiscardModal
        visible={showSaveDiscard}
        isDemoMode={isDemoMode}
        isSaving={saving}
        onSave={handleSaveGame}
        onDiscard={handleDiscardGame}
      />

      <RainDelayModal
        visible={showRainDelay}
        onExit={handleRainDelayExit}
        onCancel={() => setShowRainDelay(false)}
      />

      <GameSettingsModal
        visible={showGameSettings}
        game={game}
        onSave={handleSaveGameSettings}
        onClose={() => setShowGameSettings(false)}
      />

      <GameMenuModal
        visible={showGameMenu}
        currentMode={game.setup.rules.mode}
        onSwitchMode={() => setShowModeSwitchConfirm(true)}
        onReturnHome={handleReturnHome}
        onRainDelay={() => setShowRainDelay(true)}
        onOpenSettings={() => setShowGameSettings(true)}
        onEndGame={() => setShowEndGameConfirm(true)}
        onClose={() => setShowGameMenu(false)}
      />

      <ConfirmModal
        visible={showModeSwitchConfirm}
        title="Switch game mode?"
        message={game.setup.rules.mode === 'basic'
          ? 'Switch to Advanced Mode? You keep your score, lineup, and recorded stats. Advanced tracking (balls, strikes, RBIs, and more) will be available going forward.'
          : 'Switch to Basic Mode? You keep your score, lineup, and recorded stats. Advanced controls will be hidden — you can switch back anytime.'}
        confirmLabel={game.setup.rules.mode === 'basic' ? 'Switch to Advanced' : 'Switch to Basic'}
        onConfirm={handleConfirmSwitchMode}
        onCancel={() => setShowModeSwitchConfirm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  noGame: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Header
  scorecard: { paddingHorizontal: 12, paddingBottom: 10 },
  scorecardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inningBlock: { flex: 1, alignItems: 'center' },
  scoreBlock: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  scoreTeam: { alignItems: 'center' },
  scoreWithAdj: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerControls: { flex: 1, alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  headerIconBtn: { padding: 8 },
  countStrip: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, paddingBottom: 4 },
  countItem: { alignItems: 'center', gap: 5 },
  // Demo badge
  demoBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  // Current batter
  currentBatterBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  onDeckBadge: { alignItems: 'flex-end' },
  // Actions
  actionsArea: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10, paddingHorizontal: 8 },
  basicActions: { gap: 6 },
  advancedActions: { gap: 4 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around' },
  actionBtn: { alignItems: 'center', minWidth: 72, paddingVertical: 4 },
  actionBtnSmall: { minWidth: 64 },
  actionIconWrap: { width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionIconSmall: { width: 44, height: 44, borderRadius: 12 },
  // Lineup list rows
  batterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, gap: 12 },
  orderBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  atBatBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.15)' },
  // End game bar — solid bottom bar, fills safe area
  endGameBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
