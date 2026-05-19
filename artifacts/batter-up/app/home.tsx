import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { useApp } from '@/context/AppContext';
import { useGame } from '@/context/GameContext';
import { AppBackup, Lineup, ScheduledGame } from '@/models/types';
import {
  checkForAutoBackup, getActiveGame, getGames, getLineups,
  getNextScheduledGame, restoreFromBackup,
} from '@/services/storage';
import { useColors } from '@/hooks/useColors';

// The Start Game chooser is a two-step bottom-sheet flow.
//   step 1: pick mode (new / continue / scheduled)
//   step 2 (new only): pick lineup source (load saved / create new)
type StartGameStep = null | 'choose-mode' | 'new-game-lineup';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, updateSettings, reloadSettings, reloadPresets } = useApp();
  const { game, restoreGame } = useGame();

  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [gameCount, setGameCount] = useState(0);
  const [lastLineup, setLastLineup] = useState<Lineup | null>(null);
  const [nextScheduledGame, setNextScheduledGame] = useState<ScheduledGame | null>(null);

  // Derive resumeable directly from game state — single source of truth.
  // Avoids the flicker that came from syncing this through separate effects.
  const hasResumeableGame = !!(game && !game.isComplete);

  // Start Game chooser state
  const [startStep, setStartStep] = useState<StartGameStep>(null);

  // Restore prompt state
  const [restoreBackup, setRestoreBackup] = useState<AppBackup | null>(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const loadData = useCallback(async () => {
    const [ls, games] = await Promise.all([getLineups(), getGames()]);
    setLineups(ls);
    setGameCount(games.length);
    const sorted = [...ls].sort((a, b) => {
      if (!a.lastUsedAt && !b.lastUsedAt) return 0;
      if (!a.lastUsedAt) return 1;
      if (!b.lastUsedAt) return -1;
      return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
    });
    setLastLineup(sorted[0] ?? null);
    return { lineupCount: ls.length, gameCount: games.length };
  }, []);

  // Reload on every focus — fixes the "just saved a lineup but home still shows empty" bug.
  // Also rehydrates the GameContext from AsyncStorage if there's an active game
  // saved but the in-memory context is empty (e.g. on a cold start).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadData().then(async ({ lineupCount, gameCount: gc }) => {
        if (!active) return;

        if (!game) {
          const activeGame = await getActiveGame();
          if (activeGame && !activeGame.isComplete) {
            restoreGame(activeGame);
          }
        }

        const next = await getNextScheduledGame();
        setNextScheduledGame(next);

        // Offer a restore only on a fresh install with no data
        if (lineupCount === 0 && gc === 0 && !settings.hasDeclinedAutoRestore && Platform.OS !== 'web') {
          const backup = await checkForAutoBackup();
          if (backup) {
            setRestoreBackup(backup);
            setShowRestorePrompt(true);
          }
        }
      });
      return () => { active = false; };
    }, [loadData, game, restoreGame, settings.hasDeclinedAutoRestore])
  );

  const handleRestore = async () => {
    if (!restoreBackup) return;
    setIsRestoring(true);
    try {
      await restoreFromBackup(restoreBackup);
      await reloadSettings();
      await reloadPresets();
      await loadData();
      setShowRestorePrompt(false);
    } catch {
      setIsRestoring(false);
    }
  };

  const handleDeclineRestore = async () => {
    setShowRestorePrompt(false);
    await updateSettings({ hasDeclinedAutoRestore: true });
  };

  // ── Start Game chooser handlers ────────────────────────────────────────────
  const openStartGame = () => setStartStep('choose-mode');
  const closeStart = () => setStartStep(null);

  const onChooseNewGame = () => setStartStep('new-game-lineup');
  const onChooseContinue = () => {
    if (!hasResumeableGame) return;
    closeStart();
    router.push('/game/live');
  };
  const onChooseScheduled = () => {
    closeStart();
    router.push('/schedule');
  };

  const onLoadSavedLineup = () => {
    closeStart();
    router.push({ pathname: '/lineups', params: { pickForGame: '1' } });
  };
  const onCreateNewLineup = () => {
    closeStart();
    router.push({ pathname: '/lineups/editor', params: { returnTo: 'setup' } });
  };

  // ── Helpers for displaying the active game card ────────────────────────────
  const activePlayersInGame = game?.setup.lineupSnapshot.filter((p) => p.isActive) ?? [];
  const currentBatter = game && activePlayersInGame.length > 0
    ? activePlayersInGame[game.currentBatterIndex % activePlayersInGame.length]
    : null;

  const formatScheduledDate = (dateStr: string, timeStr?: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    let dayLabel = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (timeStr) {
      const [h, m] = timeStr.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      dayLabel += ` · ${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
    }
    return dayLabel;
  };

  const backupDate = restoreBackup?.exportedAt
    ? new Date(restoreBackup.exportedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Unknown date';
  const lineupCountInBackup = restoreBackup?.lineups?.length ?? 0;
  const gameCountInBackup = restoreBackup?.games?.length ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: botPad + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo + tagline */}
        <View style={styles.logoSection}>
          <Image source={require('@/assets/images/batter-up-logo.png')} style={styles.logo} resizeMode="contain" />
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

        {/* Game in Progress card — clearly labeled, not "last used lineup" */}
        {hasResumeableGame && game && (
          <Card style={[styles.gameInProgressCard, { backgroundColor: colors.navy, borderColor: colors.accent }]}>
            <View style={styles.gipHeader}>
              <View style={[styles.gipPulse, { backgroundColor: colors.accent }]} />
              <ThemedText variant="caption" color={colors.accent} style={{ fontWeight: '800', letterSpacing: 1 }}>
                GAME IN PROGRESS
              </ThemedText>
            </View>
            <ThemedText variant="h2" color="#fff" style={{ marginTop: 6 }}>
              {game.setup.teamName} vs {game.setup.opponentName}
            </ThemedText>
            <View style={styles.gipMetaRow}>
              <ThemedText variant="caption" color="#fff" style={{ opacity: 0.85 }}>
                {game.halfInning === 'top' ? 'Top' : 'Bot'} {game.currentInning} • {game.outs} out{game.outs === 1 ? '' : 's'}
              </ThemedText>
              <ThemedText variant="caption" color="#fff" style={{ opacity: 0.85, marginLeft: 12 }}>
                {game.setup.teamName} {game.myScore} • {game.setup.opponentName} {game.opponentScore}
              </ThemedText>
            </View>
            {currentBatter && (
              <ThemedText variant="caption" color="#fff" style={{ opacity: 0.85, marginTop: 2 }}>
                Now batting: {currentBatter.name}{currentBatter.jerseyNumber ? ` #${currentBatter.jerseyNumber}` : ''}
              </ThemedText>
            )}
            <Button
              title="Resume Game"
              size="lg"
              fullWidth
              style={{ marginTop: 12, backgroundColor: colors.accent }}
              icon={<Feather name="play" size={16} color="#fff" />}
              onPress={() => router.push('/game/live')}
            />
          </Card>
        )}

        {/* Next scheduled game */}
        {nextScheduledGame && (
          <TouchableOpacity
            style={[styles.scheduleCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/schedule')}
            activeOpacity={0.8}
          >
            <View style={[styles.scheduleDateBlock, { backgroundColor: colors.secondary }]}>
              <Feather name="calendar" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>NEXT GAME</ThemedText>
              <ThemedText variant="body" style={{ fontWeight: '600' }}>vs {nextScheduledGame.opponentName}</ThemedText>
              <ThemedText variant="caption" color={colors.mutedForeground}>
                {formatScheduledDate(nextScheduledGame.date, nextScheduledGame.time)}
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}

        {/* PRIMARY ACTION — Start Game */}
        <Button
          title="Start Game"
          size="xl"
          fullWidth
          style={styles.primaryBtn}
          icon={<Feather name="play" size={20} color="#fff" />}
          onPress={openStartGame}
        />

        {/* Secondary actions */}
        <View style={styles.grid}>
          {[
            { icon: 'bookmark', label: 'Saved Lineups', route: '/lineups' },
            { icon: 'calendar', label: 'Schedule', route: '/schedule' },
            { icon: 'bar-chart-2', label: 'Stats & History', route: '/stats' },
            { icon: 'help-circle', label: 'Help Center', route: '/help' },
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
              <ThemedText variant="label" align="center" style={{ marginTop: 8, color: colors.foreground }}>{item.label}</ThemedText>
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

        {/* Recent lineup — small, de-emphasized footer hint (not the primary entry point) */}
        {lastLineup && lineups.length > 0 && (
          <TouchableOpacity
            style={[styles.recentLineupChip, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => router.push('/lineups')}
            activeOpacity={0.8}
          >
            <Feather name="clock" size={14} color={colors.mutedForeground} />
            <ThemedText variant="caption" color={colors.mutedForeground} style={{ flex: 1, marginLeft: 6 }} numberOfLines={1}>
              Last used: {lastLineup.name}
            </ThemedText>
            <ThemedText variant="caption" color={colors.primary} style={{ fontWeight: '600' }}>View</ThemedText>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Start Game Chooser */}
      <Modal
        visible={startStep !== null}
        transparent
        animationType="slide"
        onRequestClose={closeStart}
      >
        <TouchableOpacity style={chooserStyles.overlay} activeOpacity={1} onPress={closeStart}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[chooserStyles.sheet, { backgroundColor: colors.card, paddingBottom: botPad + 20 }]}>
              <View style={[chooserStyles.handle, { backgroundColor: colors.border }]} />

              {startStep === 'choose-mode' && (
                <>
                  <ThemedText variant="h2" align="center">Start Game</ThemedText>
                  <ThemedText variant="caption" align="center" color={colors.mutedForeground} style={{ marginTop: 4, marginBottom: 18 }}>
                    How do you want to start?
                  </ThemedText>

                  <ChooserCard
                    icon="play-circle"
                    title="New Game"
                    description="Start a fresh game. Load an existing lineup or build a new one."
                    onPress={onChooseNewGame}
                    colors={colors}
                  />

                  <ChooserCard
                    icon="rotate-cw"
                    title="Continue Game"
                    description={hasResumeableGame
                      ? `Pick up ${game ? `${game.setup.teamName} vs ${game.setup.opponentName}` : 'where you left off'}.`
                      : 'No game in progress.'}
                    onPress={onChooseContinue}
                    disabled={!hasResumeableGame}
                    colors={colors}
                  />

                  <ChooserCard
                    icon="calendar"
                    title="Scheduled Game"
                    description={nextScheduledGame
                      ? `Next up: vs ${nextScheduledGame.opponentName}.`
                      : 'Plan a game or start from an upcoming one.'}
                    onPress={onChooseScheduled}
                    colors={colors}
                  />

                  <Button title="Close" variant="outline" size="md" fullWidth onPress={closeStart} style={{ marginTop: 8 }} />
                </>
              )}

              {startStep === 'new-game-lineup' && (
                <>
                  <View style={chooserStyles.backRow}>
                    <TouchableOpacity onPress={() => setStartStep('choose-mode')} style={chooserStyles.backBtn} hitSlop={8}>
                      <Feather name="arrow-left" size={20} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                  <ThemedText variant="h2" align="center">Choose Lineup</ThemedText>
                  <ThemedText variant="caption" align="center" color={colors.mutedForeground} style={{ marginTop: 4, marginBottom: 18 }}>
                    Use a saved lineup or build a new one.
                  </ThemedText>

                  <ChooserCard
                    icon="bookmark"
                    title="Load Saved Lineup"
                    description={lineups.length > 0
                      ? `Pick from ${lineups.length} saved lineup${lineups.length === 1 ? '' : 's'}.`
                      : 'No saved lineups yet — create one instead.'}
                    onPress={onLoadSavedLineup}
                    disabled={lineups.length === 0}
                    colors={colors}
                  />

                  <ChooserCard
                    icon="plus-circle"
                    title="Create New Lineup"
                    description="Add players, set the batting order, and save."
                    onPress={onCreateNewLineup}
                    colors={colors}
                  />

                  <Button title="Close" variant="outline" size="md" fullWidth onPress={closeStart} style={{ marginTop: 8 }} />
                </>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Restore Backup Modal */}
      <Modal visible={showRestorePrompt} transparent animationType="slide" onRequestClose={handleDeclineRestore}>
        <View style={restoreStyles.overlay}>
          <View style={[restoreStyles.sheet, { backgroundColor: colors.card, paddingBottom: botPad + 20 }]}>
            <View style={[restoreStyles.handle, { backgroundColor: colors.border }]} />
            <View style={[restoreStyles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="database" size={32} color={colors.primary} />
            </View>
            <ThemedText variant="h2" align="center" style={{ marginTop: 16 }}>Welcome back!</ThemedText>
            <ThemedText variant="body" align="center" style={{ marginTop: 8, color: colors.mutedForeground, paddingHorizontal: 8 }}>
              We found a backup from {backupDate}.
            </ThemedText>
            <View style={[restoreStyles.contentRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={restoreStyles.contentItem}>
                <ThemedText variant="h2" color={colors.primary}>{lineupCountInBackup}</ThemedText>
                <ThemedText variant="caption">Lineup{lineupCountInBackup !== 1 ? 's' : ''}</ThemedText>
              </View>
              <View style={[restoreStyles.divider, { backgroundColor: colors.border }]} />
              <View style={restoreStyles.contentItem}>
                <ThemedText variant="h2" color={colors.primary}>{gameCountInBackup}</ThemedText>
                <ThemedText variant="caption">Game{gameCountInBackup !== 1 ? 's' : ''}</ThemedText>
              </View>
            </View>
            <ThemedText variant="caption" align="center" style={{ color: colors.mutedForeground, marginBottom: 20, paddingHorizontal: 8 }}>
              Restore to pick up right where you left off.
            </ThemedText>
            <Button title={isRestoring ? 'Restoring...' : 'Restore My Data'} size="lg" fullWidth disabled={isRestoring} onPress={handleRestore} style={{ marginBottom: 10 }} />
            <Button title="Start Fresh" variant="outline" size="lg" fullWidth disabled={isRestoring} onPress={handleDeclineRestore} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Chooser card ────────────────────────────────────────────────────────────
function ChooserCard({
  icon, title, description, onPress, disabled, colors,
}: {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[
        chooserStyles.card,
        {
          backgroundColor: disabled ? colors.muted : colors.background,
          borderColor: disabled ? colors.border : colors.primary,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={[chooserStyles.cardIcon, { backgroundColor: disabled ? colors.border : colors.secondary }]}>
        <Feather name={icon as any} size={22} color={disabled ? colors.mutedForeground : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText variant="body" style={{ fontWeight: '700' }}>{title}</ThemedText>
        <ThemedText variant="caption" color={colors.mutedForeground} style={{ marginTop: 2 }}>
          {description}
        </ThemedText>
      </View>
      {!disabled && <Feather name="chevron-right" size={18} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );
}

const chooserStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  backRow: { flexDirection: 'row', marginBottom: 4 },
  backBtn: { padding: 6 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

const restoreStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, marginBottom: 20 },
  iconWrap: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  contentRow: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 16, marginVertical: 16, width: '100%' },
  contentItem: { flex: 1, alignItems: 'center', gap: 4 },
  divider: { width: 1, marginHorizontal: 8 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  logoSection: { alignItems: 'center', marginBottom: 4 },
  logo: { width: 200, height: 80 },
  modeBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  gameInProgressCard: { padding: 18, borderWidth: 2 },
  gipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gipPulse: { width: 10, height: 10, borderRadius: 5 },
  gipMetaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  scheduleCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 12 },
  scheduleDateBlock: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '47.5%', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  gridIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statsStrip: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8, gap: 32 },
  statItem: { alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 32 },
  recentLineupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
});
