import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { useApp } from '@/context/AppContext';
import { AppMode, GameType } from '@/models/types';
import { useColors } from '@/hooks/useColors';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, updateSettings } = useApp();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const update = (partial: Parameters<typeof updateSettings>[0]) => {
    updateSettings(partial).catch(() => {});
  };

  const handleResetOnboarding = () => {
    Alert.alert('Reset Setup Guide', 'This will restart the onboarding wizard next time you open the app.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: () => {
          update({ onboardingComplete: false });
          router.replace('/onboarding');
        },
      },
    ]);
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <ThemedText variant="h2">Settings</ThemedText>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 20 }]}>
        {/* Mode */}
        <SectionHeader title="GAME MODE" />
        <Card style={{ marginBottom: 14 }}>
          <View style={styles.modeToggle}>
            {(['basic', 'advanced'] as AppMode[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.modeBtn,
                  { backgroundColor: settings.mode === m ? colors.primary : colors.muted, flex: 1 },
                ]}
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

        {/* Default game type */}
        <SectionHeader title="DEFAULT GAME TYPE" />
        <Card style={{ marginBottom: 14 }}>
          <View style={styles.presetGrid}>
            {([
              { id: 'tball', label: 'T-Ball' },
              { id: 'coach_pitch', label: 'Coach Pitch' },
              { id: 'kid_pitch', label: 'Kid Pitch' },
              { id: 'custom', label: 'Custom' },
            ] as { id: GameType; label: string }[]).map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[
                  styles.presetBtn,
                  {
                    backgroundColor: settings.defaultGameType === g.id ? colors.primary : colors.muted,
                    borderColor: settings.defaultGameType === g.id ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => update({ defaultGameType: g.id })}
              >
                <ThemedText variant="label" color={settings.defaultGameType === g.id ? '#fff' : colors.foreground}>
                  {g.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
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
              <TouchableOpacity style={[styles.stepBtn, { borderColor: colors.border }]} onPress={() => update({ defaultInnings: Math.min(9, settings.defaultInnings + 1) })}>
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

        {/* Onboarding */}
        <SectionHeader title="HELP" />
        <Card style={{ marginBottom: 14 }}>
          <TouchableOpacity style={styles.actionRow} onPress={handleResetOnboarding}>
            <Feather name="help-circle" size={18} color={colors.primary} />
            <ThemedText variant="body" color={colors.primary} style={{ marginLeft: 10 }}>View Setup Guide</ThemedText>
            <Feather name="chevron-right" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </Card>

        {/* About */}
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
  sectionLabel: { marginBottom: 6, marginTop: 8, marginLeft: 4, fontWeight: '600', letterSpacing: 0.5 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  modeToggle: { flexDirection: 'row', gap: 8 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 32, height: 32, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  about: { paddingVertical: 24, gap: 2 },
});
