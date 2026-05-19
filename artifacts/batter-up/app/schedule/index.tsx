import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Lineup, ScheduledGame, ScheduleStatus, Season, SEASON_TYPE_LABELS } from '@/models/types';
import { deleteScheduledGame, getLineups, getSchedule, getSeasons } from '@/services/storage';
import { useColors } from '@/hooks/useColors';

function StatusBadge({ status }: { status: ScheduleStatus }) {
  const colors = useColors();
  const config: Record<ScheduleStatus, { label: string; bg: string; fg: string }> = {
    upcoming: { label: 'Upcoming', bg: colors.secondary, fg: colors.primary },
    completed: { label: 'Completed', bg: '#E8F5E9', fg: colors.success },
    delayed: { label: 'Delayed', bg: '#FFF8E1', fg: '#E65100' },
    cancelled: { label: 'Cancelled', bg: colors.muted, fg: colors.mutedForeground },
  };
  const c = config[status];
  return (
    <View style={[badgeStyles.badge, { backgroundColor: c.bg }]}>
      <ThemedText variant="caption" style={{ color: c.fg, fontWeight: '700', fontSize: 11 }}>{c.label}</ThemedText>
    </View>
  );
}

function SeasonBadge({ type }: { type: Season['type'] }) {
  const colors = useColors();
  const config = {
    tournament: { bg: '#FFF8E1', fg: '#E65100' },
    preseason: { bg: colors.muted, fg: colors.mutedForeground },
    regular: { bg: colors.secondary, fg: colors.primary },
  };
  const c = config[type];
  return (
    <View style={[badgeStyles.badge, { backgroundColor: c.bg }]}>
      <ThemedText variant="caption" style={{ color: c.fg, fontWeight: '700', fontSize: 10 }}>{SEASON_TYPE_LABELS[type]}</ThemedText>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
});

export default function ScheduleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [schedule, setSchedule] = useState<ScheduledGame[]>([]);
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null); // null = All

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const load = useCallback(async () => {
    const [s, l, ss] = await Promise.all([getSchedule(), getLineups(), getSeasons()]);
    setSchedule(s.sort((a, b) => a.date.localeCompare(b.date)));
    setLineups(l);
    setSeasons(ss);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const today = new Date().toISOString().slice(0, 10);

  // Filter by selected season
  const filtered = selectedSeasonId === null
    ? schedule
    : schedule.filter((g) => g.seasonId === selectedSeasonId);

  const upcoming = filtered.filter((g) => g.status === 'upcoming' && g.date >= today);
  const past = filtered.filter((g) => g.status !== 'upcoming' || g.date < today);

  const handleDelete = async (id: string) => {
    await deleteScheduledGame(id);
    load();
  };

  const getLineupName = (lineupId?: string) => {
    if (!lineupId) return null;
    return lineups.find((l) => l.id === lineupId)?.name ?? null;
  };

  const getSeasonForGame = (seasonId?: string): Season | undefined =>
    seasons.find((s) => s.id === seasonId);

  const renderGame = (g: ScheduledGame) => {
    const lineupName = getLineupName(g.lineupId);
    const season = getSeasonForGame(g.seasonId);
    const isUpcoming = g.status === 'upcoming' && g.date >= today;

    return (
      <TouchableOpacity
        key={g.id}
        onPress={() => router.push({ pathname: '/schedule/editor', params: { scheduleId: g.id } })}
        activeOpacity={0.75}
      >
        <Card style={{ marginBottom: 10 }}>
          <View style={styles.gameRow}>
            <View style={[styles.dateBlock, { backgroundColor: isUpcoming ? colors.primary : colors.muted }]}>
              <ThemedText variant="caption" style={{ color: isUpcoming ? 'rgba(255,255,255,0.7)' : colors.mutedForeground, fontWeight: '700' }}>
                {new Date(g.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
              </ThemedText>
              <ThemedText style={{ fontSize: 24, fontWeight: '800', color: isUpcoming ? '#fff' : colors.foreground }}>
                {new Date(g.date + 'T12:00:00').getDate()}
              </ThemedText>
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <ThemedText variant="h3" numberOfLines={1} style={{ flex: 1 }}>vs {g.opponentName}</ThemedText>
                <StatusBadge status={g.status} />
              </View>
              {g.time && (
                <View style={styles.metaRow}>
                  <Feather name="clock" size={12} color={colors.mutedForeground} />
                  <ThemedText variant="caption" style={{ marginLeft: 4 }}>
                    {(() => {
                      const [h, m] = g.time!.split(':').map(Number);
                      const ampm = h >= 12 ? 'PM' : 'AM';
                      return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
                    })()}
                  </ThemedText>
                </View>
              )}
              {g.venue && (
                <View style={styles.metaRow}>
                  <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                  <ThemedText variant="caption" style={{ marginLeft: 4 }}>{g.venue}</ThemedText>
                </View>
              )}
              {lineupName && (
                <View style={styles.metaRow}>
                  <Feather name="list" size={12} color={colors.mutedForeground} />
                  <ThemedText variant="caption" style={{ marginLeft: 4 }}>{lineupName}</ThemedText>
                </View>
              )}
              {season && selectedSeasonId === null && (
                <View style={[styles.metaRow, { marginTop: 6 }]}>
                  <SeasonBadge type={season.type} />
                  <ThemedText variant="caption" style={{ marginLeft: 6 }}>{season.name}</ThemedText>
                </View>
              )}
            </View>
          </View>

          {isUpcoming && (
            <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push({
                  pathname: '/game/setup',
                  params: g.lineupId ? { lineupId: g.lineupId, scheduledGameId: g.id, opponent: g.opponentName } : { scheduledGameId: g.id, opponent: g.opponentName },
                })}
              >
                <Feather name="play" size={14} color="#fff" />
                <ThemedText variant="caption" color="#fff" style={{ marginLeft: 5, fontWeight: '700' }}>Start Game</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                onPress={() => handleDelete(g.id)}
              >
                <Feather name="trash-2" size={14} color={colors.destructive} />
                <ThemedText variant="caption" color={colors.destructive} style={{ marginLeft: 5 }}>Delete</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <ThemedText variant="h2">Schedule</ThemedText>
        <View style={styles.headerRight}>
          {seasons.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/schedule/seasons')} style={{ marginRight: 8 }}>
              <Feather name="layers" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.push('/schedule/editor')} style={styles.addBtn}>
            <Feather name="plus" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Season filter tabs */}
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
            <ThemedText
              variant="label"
              color={selectedSeasonId === null ? colors.primary : colors.mutedForeground}
            >
              All
            </ThemedText>
          </TouchableOpacity>
          {seasons.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.seasonTab, selectedSeasonId === s.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setSelectedSeasonId(s.id)}
            >
              <ThemedText
                variant="label"
                color={selectedSeasonId === s.id ? colors.primary : colors.mutedForeground}
                numberOfLines={1}
              >
                {s.name}
              </ThemedText>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.seasonTab]}
            onPress={() => router.push('/schedule/seasons')}
          >
            <Feather name="plus" size={14} color={colors.primary} />
          </TouchableOpacity>
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 20 }]} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="calendar" size={36} color={colors.primary} />
            </View>
            <ThemedText variant="h3" align="center" style={{ marginTop: 16 }}>
              {selectedSeasonId ? 'No games in this season' : 'No games scheduled'}
            </ThemedText>
            <ThemedText variant="body" align="center" color={colors.mutedForeground} style={{ marginTop: 6, marginBottom: 24 }}>
              {selectedSeasonId
                ? 'Schedule a game and assign it to this season.'
                : 'Pre-load upcoming games with opponent, date, time, and your planned lineup.'}
            </ThemedText>
            <Button title="Schedule a Game" size="lg" onPress={() => router.push('/schedule/editor')} />
            {seasons.length === 0 && (
              <Button
                title="Create a Season or Tournament"
                variant="outline"
                size="md"
                style={{ marginTop: 10 }}
                onPress={() => router.push('/schedule/seasons')}
              />
            )}
          </View>
        )}

        {upcoming.length > 0 && (
          <>
            <ThemedText variant="label" color={colors.mutedForeground} style={styles.sectionLabel}>UPCOMING</ThemedText>
            {upcoming.map(renderGame)}
          </>
        )}

        {past.length > 0 && (
          <>
            <ThemedText variant="label" color={colors.mutedForeground} style={[styles.sectionLabel, { marginTop: upcoming.length > 0 ? 12 : 0 }]}>PAST</ThemedText>
            {past.map(renderGame)}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      {filtered.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, bottom: botPad + 16 }]}
          onPress={() => router.push('/schedule/editor')}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { padding: 4 },
  addBtn: { padding: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  seasonTabs: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 0 },
  seasonTab: { paddingHorizontal: 14, paddingVertical: 12, marginRight: 4 },
  content: { padding: 16 },
  sectionLabel: { marginBottom: 10, fontWeight: '700', letterSpacing: 0.5 },
  gameRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  dateBlock: { width: 52, alignItems: 'center', borderRadius: 10, paddingVertical: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon: { width: 80, height: 80, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
});
