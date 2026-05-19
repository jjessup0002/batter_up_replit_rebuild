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
  getNextScheduledGame, getTodaysScheduledGames, restoreFromBackup,
} from '@/services/storage';
import { useColors } from '@/hooks/useColors';

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
  const [hasResumeableGame, setHasResumeableGame] = useState(false);

  // Today's game modal
  const [showTodayModal, setShowTodayModal] = useState(false);
  const [todayGames, setTodayGames] = useState<ScheduledGame[]>([]);
  const [pendingLineupId, setPendingLineupId] = useState<string | undefined>(undefined);

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

  // Reload on every focus — fixes the "just saved a lineup but home still shows empty" bug
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadData().then(async ({ lineupCount, gameCount: gc }) => {
        if (!active) return;

        // Check for resumeable active game
        if (game && !game.isComplete) {
          setHasResumeableGame(true);
        } else if (!game) {
          const activeGame = await getActiveGame();
          if (activeGame && !activeGame.isComplete) {
            setHasResumeableGame(true);
            restoreGame(activeGame);
          }
        }

        // Load next scheduled game
        const next = await getNextScheduledGame();
        setNextScheduledGame(next);

        // Check if we should offer a restore (only on fresh install with no data)
        if (lineupCount === 0 && gc === 0 && !settings.hasDeclinedAutoRestore && Platform.OS !== 'web') {
          const backup = await checkForAutoBackup();
          if (backup) {
            setRestoreBackup(backup);
            setShowRestorePrompt(true);
          }
        }
      });
      return () => { active = false; };
    }, [loadData, game, settings.hasDeclinedAutoRestore])
  );

  // Also track resumeable state when game context changes
  useFocusEffect(
    useCallback(() => {
      if (game && !game.isComplete) {
        setHasResumeableGame(true);
      } else if (!game || game.isComplete) {
        setHasResumeableGame(false);
      }
    }, [game?.isComplete, game?.id])
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

  // Start Game — checks for today's scheduled games first
  const handleStartGame = async (lineupId?: string) => {
    const todays = await getTodaysScheduledGames();
    if (todays.length > 0) {
      setPendingLineupId(lineupId);
      setTodayGames(todays);
      setShowTodayModal(true);
    } else {
      router.push(
        lineupId
          ? { pathname: '/game/setup', params: { lineupId } }
          : '/game/setup'
      );
    }
  };

  const startScheduledGame = (sg: ScheduledGame) => {
    setShowTodayModal(false);
    router.push({
      pathname: '/game/setup',
      params: sg.lineupId
        ? { lineupId: sg.lineupId, scheduledGameId: sg.id, opponent: sg.opponentName }
        : { scheduledGameId: sg.id, opponent: sg.opponentName },
    });
  };

  const startDifferentGame = () => {
    setShowTodayModal(false);
    router.push(
      pendingLineupId
        ? { pathname: '/game/setup', params: { lineupId: pendingLineupId } }
        : '/game/setup'
    );
  };

  const activePlayers = lastLineup?.players.filter((p) => p.isActive) ?? [];

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
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

        {/* Resume game banner */}
        {hasResumeableGame && (
          <TouchableOpacity
            style={[styles.resumeBanner, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/game/live')}
            activeOpacity={0.85}
          >
            <View style={styles.resumeLeft}>
              <Feather name="play-circle" size={24} color="#1A2C5B" />
              <View style={{ marginLeft: 10 }}>
                <ThemedText variant="body" style={{ fontWeight: '700', color: '#1A2C5B' }}>Game in Progress</ThemedText>
                <ThemedText variant="caption" style={{ color: '#1A2C5B' }}>
                  {game?.setup.opponentName ? `vs ${game.setup.opponentName}` : 'Tap to resume'}
                </ThemedText>
              </View>
            </View>
            <ThemedText variant="body" style={{ color: '#1A2C5B', fontWeight: '700' }}>Resume</ThemedText>
          </TouchableOpacity>
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
            <TouchableOpacity
              style={[styles.scheduleStartBtn, { backgroundColor: colors.primary }]}
              onPress={() => startScheduledGame(nextScheduledGame)}
            >
              <Feather name="play" size={14} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Quick-start card */}
        {lastLineup ? (
          <Card style={styles.quickCard}>
            <View style={styles.quickCardHeader}>
              <Image source={require('@/assets/images/batter-up-logo-small.png')} style={{ width: 28, height: 28 }} resizeMode="contain" />
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
                onPress={() => handleStartGame(lastLineup.id)}
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
            <ThemedText variant="caption" align="center" style={{ marginTop: 4, marginBottom: 16 }}>Create your first lineup to get started</ThemedText>
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
          onPress={() => handleStartGame(lastLineup?.id)}
        />

        {/* Secondary actions */}
        <View style={styles.grid}>
          {[
            { icon: 'plus-circle', label: 'Create Lineup', route: '/lineups/editor' },
            { icon: 'bookmark', label: 'Saved Lineups', route: '/lineups' },
            { icon: 'calendar', label: 'Schedule', route: '/schedule' },
            { icon: 'bar-chart-2', label: 'Stats & History', route: '/stats' },
            { icon: 'book-open', label: 'Tutorial', route: '/tutorial' },
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
      </ScrollView>

      {/* Today's Scheduled Games Modal */}
      <Modal visible={showTodayModal} transparent animationType="slide" onRequestClose={() => setShowTodayModal(false)}>
        <View style={todayStyles.overlay}>
          <View style={[todayStyles.sheet, { backgroundColor: colors.card, paddingBottom: botPad + 20 }]}>
            <View style={[todayStyles.handle, { backgroundColor: colors.border }]} />
            <View style={[todayStyles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="calendar" size={28} color={colors.primary} />
            </View>
            <ThemedText variant="h2" align="center" style={{ marginTop: 14 }}>
              {todayGames.length === 1 ? 'Game Scheduled Today' : `${todayGames.length} Games Scheduled Today`}
            </ThemedText>
            <ThemedText variant="body" align="center" style={{ marginTop: 6, color: colors.mutedForeground, marginBottom: 16, paddingHorizontal: 8 }}>
              Start a scheduled game or begin a different one.
            </ThemedText>

            {todayGames.map((sg) => (
              <TouchableOpacity
                key={sg.id}
                style={[todayStyles.gameRow, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => startScheduledGame(sg)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText variant="body" style={{ fontWeight: '700' }}>vs {sg.opponentName}</ThemedText>
                  {sg.time && (
                    <ThemedText variant="caption" color={colors.mutedForeground}>{formatTime(sg.time)}</ThemedText>
                  )}
                  {sg.venue && (
                    <ThemedText variant="caption" color={colors.mutedForeground}>{sg.venue}</ThemedText>
                  )}
                </View>
                <View style={[todayStyles.startChip, { backgroundColor: colors.primary }]}>
                  <Feather name="play" size={12} color="#fff" />
                  <ThemedText variant="caption" color="#fff" style={{ marginLeft: 4, fontWeight: '700' }}>Start</ThemedText>
                </View>
              </TouchableOpacity>
            ))}

            <View style={{ gap: 10, marginTop: 8 }}>
              <Button
                title="Start a Different Game"
                variant="outline"
                size="lg"
                fullWidth
                onPress={startDifferentGame}
              />
              <Button
                title="Add Another Game to Schedule"
                variant="ghost"
                size="md"
                fullWidth
                onPress={() => { setShowTodayModal(false); router.push('/schedule/editor'); }}
              />
            </View>
          </View>
        </View>
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

const todayStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, marginBottom: 20 },
  iconWrap: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  gameRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10, width: '100%' },
  startChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
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
  resumeBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: 16 },
  resumeLeft: { flexDirection: 'row', alignItems: 'center' },
  scheduleCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 12 },
  scheduleDateBlock: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scheduleStartBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickCard: {},
  quickCardHeader: { flexDirection: 'row', alignItems: 'center' },
  quickMeta: { flexDirection: 'row', gap: 12, marginVertical: 10 },
  metaChip: { flexDirection: 'row', alignItems: 'center' },
  quickActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  editBtn: { width: 44, height: 44, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { alignItems: 'center', padding: 28, borderWidth: 1.5 },
  primaryBtn: { marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '47.5%', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  gridIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statsStrip: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8, gap: 32 },
  statItem: { alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 32 },
});
