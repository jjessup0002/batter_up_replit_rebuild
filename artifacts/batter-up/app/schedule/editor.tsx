import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
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
import { Lineup, ScheduledGame, ScheduleStatus, Season, SEASON_TYPE_LABELS } from '@/models/types';
import { deleteScheduledGame, generateId, getLineups, getSchedule, getSeasons, saveScheduledGame } from '@/services/storage';
import { useColors } from '@/hooks/useColors';

export default function ScheduleEditorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { scheduleId } = useLocalSearchParams<{ scheduleId?: string }>();

  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [opponentName, setOpponentName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');
  const [selectedLineupId, setSelectedLineupId] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [venue, setVenue] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ScheduleStatus>('upcoming');
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState('');

  const isEditing = !!scheduleId;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    Promise.all([getLineups(), getSeasons()]).then(([ls, ss]) => {
      setLineups(ls);
      setSeasons(ss);
    });
    if (scheduleId) {
      getSchedule().then((schedule) => {
        const g = schedule.find((s) => s.id === scheduleId);
        if (!g) return;
        setOpponentName(g.opponentName);
        const [y, mo, d] = g.date.split('-');
        setDate(`${mo}/${d}/${y}`);
        if (g.time) {
          const [h, m] = g.time.split(':').map(Number);
          const isPm = h >= 12;
          setAmpm(isPm ? 'PM' : 'AM');
          setTime(`${h % 12 || 12}:${String(m).padStart(2, '0')}`);
        }
        setSelectedLineupId(g.lineupId ?? '');
        setSelectedSeasonId(g.seasonId ?? '');
        setVenue(g.venue ?? '');
        setNotes(g.notes ?? '');
        setStatus(g.status);
      });
    } else {
      const today = new Date();
      const mo = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const y = today.getFullYear();
      setDate(`${mo}/${d}/${y}`);
    }
  }, [scheduleId]);

  const parseDate = (input: string): string | null => {
    const parts = input.split('/');
    if (parts.length !== 3) return null;
    const [mo, d, y] = parts.map(Number);
    if (!mo || !d || !y || mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2020 || y > 2099) return null;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const parseTime = (input: string): string | null => {
    if (!input.trim()) return null;
    const match = input.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const handleSave = async () => {
    setDateError('');
    const isoDate = parseDate(date);
    if (!isoDate) {
      setDateError('Enter a valid date (MM/DD/YYYY)');
      return;
    }
    const opponent = opponentName.trim() || 'Opponent';
    const isoTime = parseTime(time) ?? undefined;

    setSaving(true);
    const game: ScheduledGame = {
      id: scheduleId ?? generateId(),
      date: isoDate,
      time: isoTime,
      opponentName: opponent,
      lineupId: selectedLineupId || undefined,
      seasonId: selectedSeasonId || undefined,
      venue: venue.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
      createdAt: new Date().toISOString(),
    };

    await saveScheduledGame(game);
    setSaving(false);
    router.canGoBack() ? router.back() : router.replace('/schedule');
  };

  const handleDelete = async () => {
    if (!scheduleId) return;
    await deleteScheduledGame(scheduleId);
    router.canGoBack() ? router.back() : router.replace('/schedule');
  };

  const LabeledInput = ({
    label, value, onChangeText, placeholder, keyboardType, maxLength, hint,
  }: {
    label: string; value: string; onChangeText: (v: string) => void;
    placeholder?: string; keyboardType?: any; maxLength?: number; hint?: string;
  }) => (
    <View style={{ marginBottom: 16 }}>
      <ThemedText variant="label" style={{ marginBottom: 6 }}>{label}</ThemedText>
      <TextInput
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
      {hint && <ThemedText variant="caption" color={colors.mutedForeground} style={{ marginTop: 4 }}>{hint}</ThemedText>}
    </View>
  );

  const seasonTypeColor = (type: Season['type']) => {
    if (type === 'tournament') return { bg: '#FFF8E1', fg: '#E65100' };
    if (type === 'preseason') return { bg: colors.muted, fg: colors.mutedForeground };
    return { bg: colors.secondary, fg: colors.primary };
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/schedule')} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <ThemedText variant="h2">{isEditing ? 'Edit Game' : 'Schedule a Game'}</ThemedText>
        {isEditing ? (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Feather name="trash-2" size={20} color={colors.destructive} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 30 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 20 }]} keyboardShouldPersistTaps="handled">
        {/* Date & Time */}
        <Card style={{ marginBottom: 14 }}>
          <ThemedText variant="h3" style={{ marginBottom: 14 }}>When</ThemedText>
          <LabeledInput
            label="Date"
            value={date}
            onChangeText={(v) => { setDate(v); setDateError(''); }}
            placeholder="MM/DD/YYYY"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          {dateError ? <ThemedText variant="caption" color={colors.destructive} style={{ marginTop: -10, marginBottom: 12 }}>{dateError}</ThemedText> : null}

          <ThemedText variant="label" style={{ marginBottom: 6 }}>Time (optional)</ThemedText>
          <View style={styles.timeRow}>
            <TextInput
              style={[styles.input, styles.timeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={time}
              onChangeText={setTime}
              placeholder="6:00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
            <View style={[styles.ampmToggle, { backgroundColor: colors.muted }]}>
              {(['AM', 'PM'] as const).map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.ampmBtn, { backgroundColor: ampm === v ? colors.primary : 'transparent' }]}
                  onPress={() => setAmpm(v)}
                >
                  <ThemedText variant="label" color={ampm === v ? '#fff' : colors.foreground}>{v}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        {/* Opponent */}
        <Card style={{ marginBottom: 14 }}>
          <ThemedText variant="h3" style={{ marginBottom: 14 }}>Opponent</ThemedText>
          <LabeledInput label="Team name" value={opponentName} onChangeText={setOpponentName} placeholder="e.g. Tigers" />
          <LabeledInput label="Venue (optional)" value={venue} onChangeText={setVenue} placeholder="e.g. Riverside Park Field 2" />
        </Card>

        {/* Season / Tournament */}
        <Card style={{ marginBottom: 14 }}>
          <View style={styles.cardHeader}>
            <ThemedText variant="h3">Season / Event (optional)</ThemedText>
            <TouchableOpacity onPress={() => router.push('/schedule/seasons')}>
              <ThemedText variant="caption" color={colors.primary}>Manage</ThemedText>
            </TouchableOpacity>
          </View>
          <ThemedText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 12 }}>
            Assign this game to a season so stats can be filtered and tracked separately.
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

          {seasons.length === 0 ? (
            <TouchableOpacity
              style={[styles.createSeasonRow, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={() => router.push('/schedule/seasons')}
            >
              <Feather name="plus-circle" size={14} color={colors.primary} />
              <ThemedText variant="caption" color={colors.primary} style={{ marginLeft: 8 }}>Create a season or tournament</ThemedText>
            </TouchableOpacity>
          ) : (
            seasons.map((s) => {
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
            })
          )}
        </Card>

        {/* Lineup */}
        <Card style={{ marginBottom: 14 }}>
          <View style={styles.cardHeader}>
            <ThemedText variant="h3">Pre-load Lineup (optional)</ThemedText>
          </View>
          <ThemedText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 12 }}>
            When you start this game, the selected lineup will be pre-filled.
          </ThemedText>
          <TouchableOpacity
            style={[styles.lineupOption, { borderColor: !selectedLineupId ? colors.primary : colors.border, backgroundColor: !selectedLineupId ? colors.secondary : colors.background }]}
            onPress={() => setSelectedLineupId('')}
          >
            <View style={[styles.radioOuter, { borderColor: !selectedLineupId ? colors.primary : colors.border }]}>
              {!selectedLineupId && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
            </View>
            <ThemedText variant="body" color={colors.mutedForeground}>Choose at game time</ThemedText>
          </TouchableOpacity>
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
                <ThemedText variant="caption">{l.players.filter((p) => p.isActive).length} active players</ThemedText>
              </View>
            </TouchableOpacity>
          ))}
        </Card>

        {/* Notes */}
        <Card style={{ marginBottom: 14 }}>
          <ThemedText variant="h3" style={{ marginBottom: 14 }}>Notes (optional)</ThemedText>
          <TextInput
            style={[styles.input, styles.notesInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Directions, reminders, uniform info..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
          />
        </Card>

        {/* Status (only shown when editing) */}
        {isEditing && (
          <Card style={{ marginBottom: 14 }}>
            <ThemedText variant="h3" style={{ marginBottom: 12 }}>Status</ThemedText>
            {(['upcoming', 'delayed', 'completed', 'cancelled'] as ScheduleStatus[]).map((s) => {
              const labels: Record<ScheduleStatus, string> = {
                upcoming: 'Upcoming', delayed: 'Rain Delay / Postponed',
                completed: 'Completed', cancelled: 'Cancelled',
              };
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.lineupOption, { borderColor: status === s ? colors.primary : colors.border, backgroundColor: status === s ? colors.secondary : colors.background, marginBottom: 8 }]}
                  onPress={() => setStatus(s)}
                >
                  <View style={[styles.radioOuter, { borderColor: status === s ? colors.primary : colors.border }]}>
                    {status === s && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <ThemedText variant="body">{labels[s]}</ThemedText>
                </TouchableOpacity>
              );
            })}
          </Card>
        )}

        <Button
          title={saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add to Schedule'}
          size="xl"
          fullWidth
          disabled={saving}
          onPress={handleSave}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { padding: 4 },
  deleteBtn: { padding: 4 },
  content: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, fontFamily: 'Inter_400Regular' },
  timeRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  timeInput: { flex: 1 },
  ampmToggle: { flexDirection: 'row', borderRadius: 10, overflow: 'hidden', padding: 3 },
  ampmBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  lineupOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, padding: 12, gap: 10, marginBottom: 8 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  createSeasonRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
});
