import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
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
import { Season, SeasonType, SEASON_TYPE_LABELS } from '@/models/types';
import { deleteSeason, generateId, getSchedule, getSeasons, saveSeason, setActiveSeason } from '@/services/storage';
import { useColors } from '@/hooks/useColors';

const SEASON_TYPES: { type: SeasonType; icon: string; description: string }[] = [
  { type: 'regular', icon: 'calendar', description: 'Standard league season' },
  { type: 'tournament', icon: 'award', description: 'Tournament or playoff event' },
  { type: 'preseason', icon: 'activity', description: 'Warmup or practice games' },
];

const typeColor = (type: SeasonType, colors: any) => {
  if (type === 'tournament') return { bg: '#FFF8E1', fg: '#E65100', border: '#FFE082' };
  if (type === 'preseason') return { bg: colors.muted, fg: colors.mutedForeground, border: colors.border };
  return { bg: colors.secondary, fg: colors.primary, border: colors.primary + '40' };
};

export default function SeasonsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [gameCountMap, setGameCountMap] = useState<Record<string, number>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<SeasonType>('regular');
  const [formYear, setFormYear] = useState(String(new Date().getFullYear()));
  const [saving, setSaving] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const load = useCallback(async () => {
    const [ss, schedule] = await Promise.all([getSeasons(), getSchedule()]);
    setSeasons(ss.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    // Count scheduled games per season
    const counts: Record<string, number> = {};
    for (const g of schedule) {
      if (g.seasonId) counts[g.seasonId] = (counts[g.seasonId] ?? 0) + 1;
    }
    setGameCountMap(counts);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openCreate = () => {
    setEditingSeason(null);
    setFormName('');
    setFormType('regular');
    setFormYear(String(new Date().getFullYear()));
    setShowCreateModal(true);
  };

  const openEdit = (s: Season) => {
    setEditingSeason(s);
    setFormName(s.name);
    setFormType(s.type);
    setFormYear(String(s.year));
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    const year = parseInt(formYear) || new Date().getFullYear();
    setSaving(true);
    const season: Season = {
      id: editingSeason?.id ?? generateId(),
      name: formName.trim(),
      type: formType,
      year,
      createdAt: editingSeason?.createdAt ?? new Date().toISOString(),
      isActive: editingSeason?.isActive ?? false,
    };
    await saveSeason(season);
    setSaving(false);
    setShowCreateModal(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteSeason(id);
    load();
  };

  const handleSetActive = async (id: string) => {
    const season = seasons.find((s) => s.id === id);
    if (!season) return;
    // Toggle: if already active, deactivate; otherwise activate
    await setActiveSeason(season.isActive ? null : id);
    load();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/schedule')} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <ThemedText variant="h2">Seasons & Events</ThemedText>
        <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
          <Feather name="plus" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 20 }]} showsVerticalScrollIndicator={false}>
        {/* Explanation */}
        <View style={[styles.explainer, { backgroundColor: colors.secondary, borderColor: colors.primary + '30' }]}>
          <Feather name="info" size={14} color={colors.primary} />
          <ThemedText variant="caption" color={colors.primary} style={{ marginLeft: 8, flex: 1 }}>
            Create seasons and tournaments to organize your schedule and track stats separately for each one. Games can be assigned to a season when scheduling or at game time.
          </ThemedText>
        </View>

        {seasons.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="layers" size={36} color={colors.primary} />
            </View>
            <ThemedText variant="h3" align="center" style={{ marginTop: 16 }}>No seasons yet</ThemedText>
            <ThemedText variant="body" align="center" color={colors.mutedForeground} style={{ marginTop: 6, marginBottom: 24 }}>
              Create a season to organize your schedule and see separate stats for regular season, preseason, and tournaments.
            </ThemedText>
            <Button title="Create First Season" size="lg" onPress={openCreate} />
          </View>
        ) : (
          <>
            <ThemedText variant="label" color={colors.mutedForeground} style={styles.sectionLabel}>YOUR SEASONS</ThemedText>
            {seasons.map((s) => {
              const tc = typeColor(s.type, colors);
              const gCount = gameCountMap[s.id] ?? 0;
              return (
                <Card key={s.id} style={[styles.seasonCard, s.isActive && { borderColor: colors.primary, borderWidth: 1.5 }]}>
                  <View style={styles.seasonRow}>
                    {/* Type badge icon */}
                    <View style={[styles.seasonIcon, { backgroundColor: tc.bg }]}>
                      <Feather
                        name={s.type === 'tournament' ? 'award' : s.type === 'preseason' ? 'activity' : 'calendar'}
                        size={20}
                        color={tc.fg}
                      />
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <ThemedText variant="h3" numberOfLines={1} style={{ flex: 1 }}>{s.name}</ThemedText>
                        {s.isActive && (
                          <View style={[styles.activePill, { backgroundColor: colors.primary }]}>
                            <ThemedText variant="caption" color="#fff" style={{ fontSize: 10, fontWeight: '700' }}>ACTIVE</ThemedText>
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                        <View style={[styles.typePill, { backgroundColor: tc.bg }]}>
                          <ThemedText style={{ fontSize: 10, fontWeight: '700', color: tc.fg }}>
                            {SEASON_TYPE_LABELS[s.type]}
                          </ThemedText>
                        </View>
                        <ThemedText variant="caption" color={colors.mutedForeground}>{s.year}</ThemedText>
                        {gCount > 0 && (
                          <ThemedText variant="caption" color={colors.mutedForeground}>
                            {gCount} game{gCount !== 1 ? 's' : ''}
                          </ThemedText>
                        )}
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.seasonActions}>
                      <TouchableOpacity
                        style={[styles.actionIcon, { backgroundColor: colors.muted }]}
                        onPress={() => openEdit(s)}
                      >
                        <Feather name="edit-2" size={14} color={colors.foreground} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionIcon, { backgroundColor: colors.muted }]}
                        onPress={() => handleDelete(s.id)}
                      >
                        <Feather name="trash-2" size={14} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Set active toggle */}
                  <TouchableOpacity
                    style={[styles.activeBtn, { borderTopColor: colors.border, backgroundColor: s.isActive ? colors.primary + '10' : 'transparent' }]}
                    onPress={() => handleSetActive(s.id)}
                  >
                    <Feather
                      name={s.isActive ? 'check-circle' : 'circle'}
                      size={16}
                      color={s.isActive ? colors.primary : colors.mutedForeground}
                    />
                    <ThemedText
                      variant="caption"
                      color={s.isActive ? colors.primary : colors.mutedForeground}
                      style={{ marginLeft: 8, fontWeight: s.isActive ? '700' : '400' }}
                    >
                      {s.isActive ? 'Currently active — default for new games' : 'Set as active season'}
                    </ThemedText>
                  </TouchableOpacity>
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      {seasons.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, bottom: botPad + 16 }]}
          onPress={openCreate}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create / Edit Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={modalStyles.overlay}>
            <View style={[modalStyles.sheet, { backgroundColor: colors.card, paddingBottom: botPad + 20 }]}>
              <View style={[modalStyles.handle, { backgroundColor: colors.border }]} />
              <ThemedText variant="h2" style={{ marginBottom: 20 }}>
                {editingSeason ? 'Edit Season' : 'New Season or Event'}
              </ThemedText>

              {/* Name */}
              <ThemedText variant="label" style={{ marginBottom: 6 }}>Name</ThemedText>
              <TextInput
                style={[modalStyles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                value={formName}
                onChangeText={setFormName}
                placeholder="e.g. Spring 2025, Summer Tournament"
                placeholderTextColor={colors.mutedForeground}
                autoFocus
              />

              {/* Type */}
              <ThemedText variant="label" style={{ marginTop: 16, marginBottom: 10 }}>Type</ThemedText>
              {SEASON_TYPES.map((t) => {
                const tc = typeColor(t.type, colors);
                const selected = formType === t.type;
                return (
                  <TouchableOpacity
                    key={t.type}
                    style={[modalStyles.typeOption, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.secondary : colors.background }]}
                    onPress={() => setFormType(t.type)}
                  >
                    <View style={[modalStyles.typeIcon, { backgroundColor: tc.bg }]}>
                      <Feather name={t.icon as any} size={16} color={tc.fg} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="body" style={{ fontWeight: '600' }}>{SEASON_TYPE_LABELS[t.type]}</ThemedText>
                      <ThemedText variant="caption" color={colors.mutedForeground}>{t.description}</ThemedText>
                    </View>
                    <View style={[modalStyles.radioOuter, { borderColor: selected ? colors.primary : colors.border }]}>
                      {selected && <View style={[modalStyles.radioInner, { backgroundColor: colors.primary }]} />}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Year */}
              <ThemedText variant="label" style={{ marginTop: 16, marginBottom: 6 }}>Year</ThemedText>
              <TextInput
                style={[modalStyles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                value={formYear}
                onChangeText={setFormYear}
                placeholder={String(new Date().getFullYear())}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                maxLength={4}
              />

              <View style={{ gap: 10, marginTop: 24 }}>
                <Button
                  title={saving ? 'Saving...' : editingSeason ? 'Save Changes' : 'Create Season'}
                  size="lg"
                  fullWidth
                  disabled={!formName.trim() || saving}
                  onPress={handleSave}
                />
                <Button
                  title="Cancel"
                  variant="outline"
                  size="md"
                  fullWidth
                  onPress={() => setShowCreateModal(false)}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  handle: { width: 40, height: 4, borderRadius: 2, marginBottom: 20, alignSelf: 'center' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, fontFamily: 'Inter_400Regular' },
  typeOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, padding: 12, gap: 12, marginBottom: 8 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { padding: 4 },
  addBtn: { padding: 4 },
  content: { padding: 16 },
  explainer: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  sectionLabel: { marginBottom: 10, fontWeight: '700', letterSpacing: 0.5 },
  seasonCard: { marginBottom: 10 },
  seasonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  seasonIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  seasonActions: { flexDirection: 'row', gap: 6 },
  actionIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  activePill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  typePill: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  activeBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon: { width: 80, height: 80, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
});
