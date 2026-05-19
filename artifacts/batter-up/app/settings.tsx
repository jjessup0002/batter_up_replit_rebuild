import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { useApp } from '@/context/AppContext';
import { AppMode, GAME_RULE_PRESETS, GameRules, GameType } from '@/models/types';
import { getBackupData, restoreFromBackup } from '@/services/storage';
import { useColors } from '@/hooks/useColors';

const GAME_TYPE_LABELS: Record<GameType, string> = {
  tball: 'T-Ball',
  coach_pitch: 'Coach Pitch',
  kid_pitch: 'Kid Pitch',
  custom: 'Custom',
};

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, presets, updateSettings, updatePreset, resetPreset, reloadSettings, reloadPresets } = useApp();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [expandedPreset, setExpandedPreset] = useState<GameType | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const update = (partial: Parameters<typeof updateSettings>[0]) => {
    updateSettings(partial).catch(() => {});
  };

  const handleResetOnboarding = () => {
    Alert.alert('Reset Setup Guide', 'This will restart the onboarding wizard next time you open the app.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', onPress: () => { update({ onboardingComplete: false }); router.replace('/onboarding'); } },
    ]);
  };

  // ─── Backup ────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await getBackupData();
      const json = JSON.stringify(data, null, 2);
      const filename = `batter-up-backup-${new Date().toISOString().slice(0, 10)}.json`;

      if (Platform.OS === 'web') {
        // Web: trigger file download
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const uri = (FileSystem.cacheDirectory ?? '') + filename;
        await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          dialogTitle: 'Save Batter Up Backup',
          UTI: 'public.json',
        });
      }
    } catch (e) {
      Alert.alert('Export Failed', 'Could not export backup. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        setImporting(false);
        return;
      }

      const uri = result.assets[0].uri;
      let json: string;

      if (Platform.OS === 'web') {
        const resp = await fetch(uri);
        json = await resp.text();
      } else {
        json = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
      }

      const backup = JSON.parse(json);
      Alert.alert(
        'Restore Backup?',
        `This will replace ALL current data (lineups, games, settings) with the backup from ${backup.exportedAt ? new Date(backup.exportedAt).toLocaleDateString() : 'unknown date'}. This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setImporting(false) },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              await restoreFromBackup(backup);
              await reloadSettings();
              await reloadPresets();
              setImporting(false);
              Alert.alert('Restored', 'Your backup has been restored successfully.');
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Import Failed', 'Could not read the backup file. Make sure it is a valid Batter Up backup.');
      setImporting(false);
    }
  };

  // ─── Preset editor ─────────────────────────────────────────────────────────

  const Stepper = ({
    value,
    onChange,
    min = 1,
    max = 20,
  }: {
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
  }) => (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={[styles.stepBtn, { borderColor: colors.border }]}
        onPress={() => onChange(Math.max(min, value - 1))}
      >
        <Feather name="minus" size={14} color={colors.foreground} />
      </TouchableOpacity>
      <ThemedText variant="body" style={{ minWidth: 26, textAlign: 'center', fontWeight: '700' }}>{value}</ThemedText>
      <TouchableOpacity
        style={[styles.stepBtn, { borderColor: colors.border }]}
        onPress={() => onChange(Math.min(max, value + 1))}
      >
        <Feather name="plus" size={14} color={colors.foreground} />
      </TouchableOpacity>
    </View>
  );

  const PresetEditor = ({ type }: { type: GameType }) => {
    const preset = presets[type];
    const isExpanded = expandedPreset === type;
    const isAdvanced = preset.mode === 'advanced';

    const update = (partial: Partial<GameRules>) => updatePreset(type, partial);

    return (
      <View style={[styles.presetRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.presetHeader}
          onPress={() => setExpandedPreset(isExpanded ? null : type)}
        >
          <View style={{ flex: 1 }}>
            <ThemedText variant="body" style={{ fontWeight: '600' }}>{GAME_TYPE_LABELS[type]}</ThemedText>
            <ThemedText variant="caption" style={{ color: colors.mutedForeground }}>
              {preset.innings ?? '?'} innings · {preset.outsPerHalfInning ?? 3} outs
              {preset.maxRunsPerHalfInning != null ? ` · ${preset.maxRunsPerHalfInning} run limit` : ''}
            </ThemedText>
          </View>
          <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.presetBody, { borderTopColor: colors.border }]}>
            {/* Innings */}
            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <ThemedText variant="body" style={{ flex: 1 }}>Innings</ThemedText>
              <Stepper value={preset.innings ?? 6} onChange={(v) => update({ innings: v })} min={1} max={12} />
            </View>
            {/* Outs */}
            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <ThemedText variant="body" style={{ flex: 1 }}>Outs per half inning</ThemedText>
              <Stepper value={preset.outsPerHalfInning ?? 3} onChange={(v) => update({ outsPerHalfInning: v })} min={1} max={6} />
            </View>
            {/* Run limit toggle */}
            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="body">Run limit per inning</ThemedText>
                {preset.maxRunsPerHalfInning != null && (
                  <ThemedText variant="caption" style={{ color: colors.mutedForeground }}>{preset.maxRunsPerHalfInning} runs max</ThemedText>
                )}
              </View>
              <Switch
                value={preset.maxRunsPerHalfInning != null}
                onValueChange={(v) => update({ maxRunsPerHalfInning: v ? 6 : null })}
                trackColor={{ true: colors.primary }}
              />
            </View>
            {preset.maxRunsPerHalfInning != null && (
              <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                <ThemedText variant="body" style={{ flex: 1, color: colors.mutedForeground }}>Run limit</ThemedText>
                <Stepper
                  value={preset.maxRunsPerHalfInning}
                  onChange={(v) => update({ maxRunsPerHalfInning: v })}
                  min={1}
                  max={20}
                />
              </View>
            )}
            {/* Balls for walk (advanced types) */}
            {isAdvanced && (
              <>
                <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="body">Balls for walk</ThemedText>
                  </View>
                  <Switch
                    value={preset.ballsForWalk != null}
                    onValueChange={(v) => update({ ballsForWalk: v ? 4 : null })}
                    trackColor={{ true: colors.primary }}
                  />
                </View>
                {preset.ballsForWalk != null && (
                  <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                    <ThemedText variant="body" style={{ flex: 1, color: colors.mutedForeground }}>Balls</ThemedText>
                    <Stepper value={preset.ballsForWalk} onChange={(v) => update({ ballsForWalk: v })} min={1} max={6} />
                  </View>
                )}
                <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="body">Strikes for strikeout</ThemedText>
                  </View>
                  <Switch
                    value={preset.strikesForStrikeout != null}
                    onValueChange={(v) => update({ strikesForStrikeout: v ? 3 : null })}
                    trackColor={{ true: colors.primary }}
                  />
                </View>
                {preset.strikesForStrikeout != null && (
                  <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                    <ThemedText variant="body" style={{ flex: 1, color: colors.mutedForeground }}>Strikes</ThemedText>
                    <Stepper value={preset.strikesForStrikeout} onChange={(v) => update({ strikesForStrikeout: v })} min={1} max={6} />
                  </View>
                )}
              </>
            )}
            {/* Reset button */}
            <TouchableOpacity
              style={[styles.resetBtn, { borderColor: colors.border }]}
              onPress={() => {
                Alert.alert(
                  'Reset Preset?',
                  `Reset ${GAME_TYPE_LABELS[type]} to default settings?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Reset', onPress: () => resetPreset(type) },
                  ]
                );
              }}
            >
              <Feather name="refresh-ccw" size={14} color={colors.mutedForeground} />
              <ThemedText variant="caption" style={{ marginLeft: 6, color: colors.mutedForeground }}>Reset to defaults</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{title}</ThemedText>
  );

  const SettingRow = ({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) => (
    <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <ThemedText variant="body">{label}</ThemedText>
        {sub && <ThemedText variant="caption" style={{ marginTop: 1 }}>{sub}</ThemedText>}
      </View>
      {children}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <ThemedText variant="h2">Settings</ThemedText>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 20 }]}>

        {/* Auto-Backup */}
        {Platform.OS !== 'web' && (
          <>
            <SectionHeader title="AUTOMATIC BACKUP" />
            <Card style={{ marginBottom: 14 }}>
              <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Feather name="shield" size={16} color={settings.autoBackupEnabled ? colors.success : colors.mutedForeground} />
                    <ThemedText variant="body" style={{ fontWeight: '600' }}>
                      {settings.autoBackupEnabled ? 'Auto-Backup is On' : 'Auto-Backup is Off'}
                    </ThemedText>
                  </View>
                  <ThemedText variant="caption" style={{ marginTop: 3 }}>
                    {settings.autoBackupEnabled
                      ? `Saving to ${Platform.OS === 'ios' ? 'iCloud' : 'Google Drive'} whenever you leave the app`
                      : `Enable to protect your lineups and games via ${Platform.OS === 'ios' ? 'iCloud' : 'Google Drive'}`}
                  </ThemedText>
                </View>
                <Switch
                  value={settings.autoBackupEnabled}
                  onValueChange={(v) => update({ autoBackupEnabled: v })}
                  trackColor={{ true: colors.success }}
                />
              </View>
            </Card>
          </>
        )}

        {/* Mode */}
        <SectionHeader title="GAME MODE" />
        <Card style={{ marginBottom: 14 }}>
          <View style={styles.modeToggle}>
            {(['basic', 'advanced'] as AppMode[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modeBtn, { backgroundColor: settings.mode === m ? colors.primary : colors.muted, flex: 1 }]}
                onPress={() => update({ mode: m })}
              >
                <Feather name={m === 'basic' ? 'zap' : 'activity'} size={14} color={settings.mode === m ? '#fff' : colors.mutedForeground} />
                <ThemedText variant="label" color={settings.mode === m ? '#fff' : colors.foreground} style={{ marginLeft: 6 }}>
                  {m === 'basic' ? 'Basic Mode' : 'Advanced Mode'}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          <ThemedText variant="caption" style={{ marginTop: 10 }}>
            {settings.mode === 'basic'
              ? 'Basic mode keeps things simple — score, lineup, and next batter.'
              : 'Advanced mode tracks balls, strikes, pitch counts, and detailed stats.'}
          </ThemedText>
        </Card>

        {/* Game type presets */}
        <SectionHeader title="GAME TYPE PRESETS" />
        <ThemedText variant="caption" style={[styles.sectionNote, { color: colors.mutedForeground }]}>
          Customize defaults for each game type. Your changes apply when you select a preset in Game Setup.
        </ThemedText>
        <Card style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
          {(['tball', 'coach_pitch', 'kid_pitch', 'custom'] as GameType[]).map((type) => (
            <PresetEditor key={type} type={type} />
          ))}
        </Card>

        {/* Default game rules */}
        <SectionHeader title="DEFAULT GAME RULES" />
        <Card style={{ marginBottom: 14 }}>
          <SettingRow label="Default Innings">
            <View style={styles.stepper}>
              <TouchableOpacity style={[styles.stepBtn, { borderColor: colors.border }]} onPress={() => update({ defaultInnings: Math.max(1, settings.defaultInnings - 1) })}>
                <Feather name="minus" size={16} color={colors.foreground} />
              </TouchableOpacity>
              <ThemedText variant="body" style={{ minWidth: 24, textAlign: 'center' }}>{settings.defaultInnings}</ThemedText>
              <TouchableOpacity style={[styles.stepBtn, { borderColor: colors.border }]} onPress={() => update({ defaultInnings: Math.min(12, settings.defaultInnings + 1) })}>
                <Feather name="plus" size={16} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </SettingRow>
          <SettingRow label="Outs per half inning">
            <View style={styles.stepper}>
              <TouchableOpacity style={[styles.stepBtn, { borderColor: colors.border }]} onPress={() => update({ defaultOutsPerHalfInning: Math.max(1, settings.defaultOutsPerHalfInning - 1) })}>
                <Feather name="minus" size={16} color={colors.foreground} />
              </TouchableOpacity>
              <ThemedText variant="body" style={{ minWidth: 24, textAlign: 'center' }}>{settings.defaultOutsPerHalfInning}</ThemedText>
              <TouchableOpacity style={[styles.stepBtn, { borderColor: colors.border }]} onPress={() => update({ defaultOutsPerHalfInning: Math.min(6, settings.defaultOutsPerHalfInning + 1) })}>
                <Feather name="plus" size={16} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </SettingRow>
          <SettingRow label="Run limit per inning" sub={settings.defaultMaxRunsPerHalfInning === null ? 'Off' : `${settings.defaultMaxRunsPerHalfInning} runs max`}>
            <Switch
              value={settings.defaultMaxRunsPerHalfInning !== null}
              onValueChange={(v) => update({ defaultMaxRunsPerHalfInning: v ? 6 : null })}
              trackColor={{ true: colors.primary }}
            />
          </SettingRow>
        </Card>

        {/* Lineup rules */}
        <SectionHeader title="LINEUP RULES" />
        <Card style={{ marginBottom: 14 }}>
          <SettingRow label="Require jersey number">
            <Switch value={settings.requireJerseyNumber} onValueChange={(v) => update({ requireJerseyNumber: v })} trackColor={{ true: colors.primary }} />
          </SettingRow>
          <SettingRow label="Require position">
            <Switch value={settings.requirePosition} onValueChange={(v) => update({ requirePosition: v })} trackColor={{ true: colors.primary }} />
          </SettingRow>
          <SettingRow label="Prevent duplicate jersey #s">
            <Switch value={settings.preventDuplicateJerseys} onValueChange={(v) => update({ preventDuplicateJerseys: v })} trackColor={{ true: colors.primary }} />
          </SettingRow>
        </Card>

        {/* Display */}
        <SectionHeader title="DISPLAY" />
        <Card style={{ marginBottom: 14 }}>
          <SettingRow label="Large text mode" sub="Bigger text for easier reading">
            <Switch value={settings.largeTextMode} onValueChange={(v) => update({ largeTextMode: v })} trackColor={{ true: colors.primary }} />
          </SettingRow>
        </Card>

        {/* Data & Backup */}
        <SectionHeader title="DATA & BACKUP" />
        <ThemedText variant="caption" style={[styles.sectionNote, { color: colors.mutedForeground }]}>
          Export a backup file and save it to iCloud Drive, Google Drive, or any cloud storage you use. Import it anytime to restore your data on a new device.
        </ThemedText>
        <Card style={{ marginBottom: 14 }}>
          <TouchableOpacity
            style={[styles.actionRow, { opacity: exporting ? 0.5 : 1 }]}
            onPress={handleExport}
            disabled={exporting}
          >
            <Feather name="upload" size={18} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <ThemedText variant="body" color={colors.primary} style={{ fontWeight: '600' }}>
                {exporting ? 'Exporting...' : 'Export Backup'}
              </ThemedText>
              <ThemedText variant="caption">Save lineups, games, and settings to a file</ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={colors.primary} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={[styles.actionRow, { opacity: importing ? 0.5 : 1 }]}
            onPress={handleImport}
            disabled={importing}
          >
            <Feather name="download" size={18} color={colors.mutedForeground} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <ThemedText variant="body" style={{ fontWeight: '600' }}>
                {importing ? 'Importing...' : 'Import Backup'}
              </ThemedText>
              <ThemedText variant="caption">Restore data from a backup file</ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </Card>

        {/* Help */}
        <SectionHeader title="HELP" />
        <Card style={{ marginBottom: 14 }}>
          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/tutorial')}>
            <Feather name="book-open" size={18} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <ThemedText variant="body" color={colors.primary} style={{ fontWeight: '600' }}>How It Works</ThemedText>
              <ThemedText variant="caption">6-slide walkthrough of the app</ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={colors.primary} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.actionRow} onPress={handleResetOnboarding}>
            <Feather name="help-circle" size={18} color={colors.mutedForeground} />
            <ThemedText variant="body" style={{ marginLeft: 10 }}>View Setup Guide</ThemedText>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </Card>

        <View style={styles.about}>
          <ThemedText variant="caption" align="center">Batter Up v1.0</ThemedText>
          <ThemedText variant="caption" align="center" style={{ marginTop: 2 }}>
            Works fully offline. All data stored on this device.
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4, marginRight: 8 },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  sectionLabel: { marginBottom: 4, marginTop: 8, marginLeft: 4, fontWeight: '600', letterSpacing: 0.5 },
  sectionNote: { marginBottom: 10, marginLeft: 4, fontSize: 12 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modeToggle: { flexDirection: 'row', gap: 8 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 30, height: 30, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  about: { paddingVertical: 24, gap: 2 },
  presetRow: { borderBottomWidth: StyleSheet.hairlineWidth },
  presetHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  presetBody: { borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: 'transparent' },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
});
