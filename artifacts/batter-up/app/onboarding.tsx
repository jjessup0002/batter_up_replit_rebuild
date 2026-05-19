import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  Image,
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
import { AppMode, DisplayMode, GameType } from '@/models/types';
import { performAutoBackup } from '@/services/storage';
import { useColors } from '@/hooks/useColors';

const { width } = Dimensions.get('window');
const TOTAL_STEPS = 7;

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, updateSettings } = useApp();

  // Pre-fill from current settings so returning users see their current choices.
  // First-time users get the DEFAULT_SETTINGS values (basic / kid_pitch / system).
  const [step, setStep] = useState(0);
  const [selectedMode, setSelectedMode] = useState<AppMode>(settings.mode);
  const [selectedGameType, setSelectedGameType] = useState<GameType>(settings.defaultGameType);
  const [selectedDisplay, setSelectedDisplay] = useState<DisplayMode>(settings.displayMode);
  const [wantsAutoBackup, setWantsAutoBackup] = useState(settings.autoBackupEnabled);
  const [goCreate, setGoCreate] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const goToStep = (s: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setStep(s);
    scrollRef.current?.scrollTo({ x: s * width, animated: true });
  };

  const handleFinish = async (showTutorial: boolean) => {
    await updateSettings({
      onboardingComplete: true,
      mode: selectedMode,
      defaultGameType: selectedGameType,
      displayMode: selectedDisplay,
      autoBackupEnabled: wantsAutoBackup,
      hasAskedAboutBackup: true,
    });
    if (wantsAutoBackup) {
      performAutoBackup().catch(() => {});
    }
    if (showTutorial) {
      router.replace('/tutorial');
    } else if (goCreate) {
      router.replace('/lineups/editor');
    } else {
      router.replace('/home');
    }
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const backupAvailable = Platform.OS !== 'web';
  const cloudName = Platform.OS === 'ios' ? 'iCloud' : 'Google Drive';

  const displayOptions: { id: DisplayMode; icon: 'monitor' | 'sun' | 'moon'; label: string; desc: string }[] = [
    { id: 'system', icon: 'monitor', label: 'System Default', desc: 'Follows your phone\'s display settings automatically.' },
    { id: 'light', icon: 'sun', label: 'Light Mode', desc: 'High contrast. Best for outdoor use in bright sunlight.' },
    { id: 'dark', icon: 'moon', label: 'Dark Mode', desc: 'Easy on the eyes. Best for evening or night games.' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
      >
        {/* ─── Step 0: Welcome ─── */}
        <View style={[styles.page, { paddingTop: topPad + 20, paddingBottom: botPad + 60 }]}>
          <View style={styles.pageContent}>
            <Image
              source={require('@/assets/images/batter-up-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <ThemedText variant="h1" align="center" style={{ marginTop: 32, marginBottom: 12 }}>
              Welcome to Batter Up
            </ThemedText>
            <ThemedText variant="body" color={colors.mutedForeground} align="center" style={styles.tagline}>
              A simple way to manage your lineup and keep the game moving.
            </ThemedText>

            <View style={styles.featuresBox}>
              {[
                { icon: 'list', text: 'Build and save batting lineups' },
                { icon: 'target', text: 'Track current batter automatically' },
                { icon: 'bar-chart-2', text: 'Game stats and summaries' },
                { icon: 'wifi-off', text: 'Works fully offline — no account needed' },
              ].map((f) => (
                <View key={f.text} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: colors.secondary }]}>
                    <Feather name={f.icon as any} size={16} color={colors.primary} />
                  </View>
                  <ThemedText variant="body" style={{ flex: 1 }}>{f.text}</ThemedText>
                </View>
              ))}
            </View>
          </View>
          <Button title="Get Started" size="xl" fullWidth onPress={() => goToStep(1)} style={styles.bottomBtn} />
        </View>

        {/* ─── Step 1: Choose Mode ─── */}
        <View style={[styles.page, { paddingTop: topPad + 20, paddingBottom: botPad + 60 }]}>
          <View style={styles.pageContent}>
            <ThemedText variant="h1" align="center">Choose Your Style</ThemedText>
            <ThemedText variant="body" color={colors.mutedForeground} align="center" style={{ marginTop: 8, marginBottom: 32 }}>
              You can change this anytime in Settings.
            </ThemedText>

            {([
              {
                id: 'basic' as AppMode,
                icon: 'zap',
                title: 'Basic Mode',
                sub: 'Best for quick games',
                desc: 'Track lineup, score, inning, current batter, and game summary.',
                recommended: true,
              },
              {
                id: 'advanced' as AppMode,
                icon: 'activity',
                title: 'Advanced Mode',
                sub: 'Best for detailed tracking',
                desc: 'Track balls, strikes, pitch rules, hits, walks, outs, runs, player stats, and analytics.',
                recommended: false,
              },
            ]).map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => setSelectedMode(m.id)}
                style={[styles.modeCard, { borderColor: selectedMode === m.id ? colors.primary : colors.border, backgroundColor: colors.card }]}
                activeOpacity={0.8}
              >
                <View style={styles.modeCardHeader}>
                  <View style={[styles.modeIcon, { backgroundColor: colors.secondary }]}>
                    <Feather name={m.icon as any} size={22} color={colors.primary} />
                  </View>
                  {selectedMode === m.id && (
                    <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={12} color="#fff" />
                      <ThemedText variant="caption" color="#fff" style={{ marginLeft: 4 }}>Selected</ThemedText>
                    </View>
                  )}
                </View>
                <ThemedText variant="h2" style={{ marginTop: 12 }}>{m.title}</ThemedText>
                <ThemedText variant="caption" style={{ marginTop: 4, marginBottom: 8 }}>{m.sub}</ThemedText>
                <ThemedText variant="body" color={colors.mutedForeground}>{m.desc}</ThemedText>
                {m.recommended && (
                  <View style={[styles.recommendedBadge, { backgroundColor: colors.accent }]}>
                    <ThemedText variant="caption" style={{ fontWeight: '700' }}>Recommended for most coaches</ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.navRow}>
            <Button title="Back" variant="outline" size="md" onPress={() => goToStep(0)} style={{ flex: 1 }} />
            <Button title="Next" size="md" onPress={() => goToStep(2)} style={{ flex: 2, marginLeft: 10 }} />
          </View>
        </View>

        {/* ─── Step 2: Game Type ─── */}
        <View style={[styles.page, { paddingTop: topPad + 20, paddingBottom: botPad + 60 }]}>
          <View style={styles.pageContent}>
            <ThemedText variant="h1" align="center">Default Game Type</ThemedText>
            <ThemedText variant="body" color={colors.mutedForeground} align="center" style={{ marginTop: 8, marginBottom: 24 }}>
              We'll use this to pre-fill your game rules. Change anytime.
            </ThemedText>

            {([
              { id: 'tball', label: 'T-Ball', desc: 'No pitching, simplified rules, track hits and runs' },
              { id: 'coach_pitch', label: 'Coach Pitch', desc: 'Limited pitches per batter, no walks, run limits' },
              { id: 'kid_pitch', label: 'Kid Pitch', desc: 'Balls, strikes, walks, strikeouts — standard rules' },
              { id: 'custom', label: 'Custom', desc: 'Set your own league rules from scratch' },
            ] as { id: GameType; label: string; desc: string }[]).map((g) => (
              <TouchableOpacity
                key={g.id}
                onPress={() => setSelectedGameType(g.id)}
                style={[
                  styles.typeRow,
                  {
                    borderColor: selectedGameType === g.id ? colors.primary : colors.border,
                    backgroundColor: selectedGameType === g.id ? colors.secondary : colors.card,
                  },
                ]}
                activeOpacity={0.8}
              >
                <View style={styles.typeRadio}>
                  <View style={[styles.radioOuter, { borderColor: selectedGameType === g.id ? colors.primary : colors.border }]}>
                    {selectedGameType === g.id && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="h3">{g.label}</ThemedText>
                  <ThemedText variant="caption" style={{ marginTop: 2 }}>{g.desc}</ThemedText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.navRow}>
            <Button title="Back" variant="outline" size="md" onPress={() => goToStep(1)} style={{ flex: 1 }} />
            <Button title="Next" size="md" onPress={() => goToStep(3)} style={{ flex: 2, marginLeft: 10 }} />
          </View>
        </View>

        {/* ─── Step 3: Display Preference ─── */}
        <View style={[styles.page, { paddingTop: topPad + 20, paddingBottom: botPad + 60 }]}>
          <View style={styles.pageContent}>
            <View style={[styles.stepIconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="sun" size={36} color={colors.primary} />
            </View>
            <ThemedText variant="h1" align="center" style={{ marginTop: 20 }}>Choose Your Display</ThemedText>
            <ThemedText variant="body" color={colors.mutedForeground} align="center" style={{ marginTop: 8, marginBottom: 24, paddingHorizontal: 8 }}>
              Coaches use this app in bright sunlight and at evening games. Pick the look that works best for you.
            </ThemedText>

            {displayOptions.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setSelectedDisplay(opt.id)}
                style={[
                  styles.typeRow,
                  {
                    borderColor: selectedDisplay === opt.id ? colors.primary : colors.border,
                    backgroundColor: selectedDisplay === opt.id ? colors.secondary : colors.card,
                  },
                ]}
                activeOpacity={0.8}
              >
                <View style={[styles.displayIconWrap, { backgroundColor: selectedDisplay === opt.id ? colors.primary : colors.muted }]}>
                  <Feather name={opt.icon} size={18} color={selectedDisplay === opt.id ? '#fff' : colors.mutedForeground} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <ThemedText variant="h3">{opt.label}</ThemedText>
                  <ThemedText variant="caption" style={{ marginTop: 2 }}>{opt.desc}</ThemedText>
                </View>
                <View style={[styles.radioOuter, { borderColor: selectedDisplay === opt.id ? colors.primary : colors.border }]}>
                  {selectedDisplay === opt.id && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                </View>
              </TouchableOpacity>
            ))}

            <ThemedText variant="caption" color={colors.mutedForeground} align="center" style={{ marginTop: 12 }}>
              You can change this anytime in Settings.
            </ThemedText>
          </View>
          <View style={styles.navRow}>
            <Button title="Back" variant="outline" size="md" onPress={() => goToStep(2)} style={{ flex: 1 }} />
            <Button title="Next" size="md" onPress={() => goToStep(4)} style={{ flex: 2, marginLeft: 10 }} />
          </View>
        </View>

        {/* ─── Step 4: Auto-Backup ─── */}
        <View style={[styles.page, { paddingTop: topPad + 20, paddingBottom: botPad + 60 }]}>
          <View style={styles.pageContent}>
            <View style={[styles.stepIconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="shield" size={36} color={colors.primary} />
            </View>

            <ThemedText variant="h1" align="center" style={{ marginTop: 20 }}>
              Never lose your lineup
            </ThemedText>
            <ThemedText variant="body" color={colors.mutedForeground} align="center" style={{ marginTop: 10, marginBottom: 24, paddingHorizontal: 8 }}>
              {backupAvailable
                ? `Enable automatic backup and your lineups, games, and settings will be safe — even if you switch phones.`
                : `Your lineups and game data are stored on this device.`}
            </ThemedText>

            {backupAvailable ? (
              <>
                <Card style={{ marginBottom: 20 }}>
                  {[
                    { icon: 'cloud', title: `Backed up to ${cloudName}`, desc: 'Free with your existing account. Restore everything if you switch phones.' },
                    { icon: 'refresh-cw', title: 'Happens automatically', desc: 'No setup needed. Batter Up saves quietly in the background.' },
                    { icon: 'lock', title: 'Private and free', desc: 'No Batter Up account needed. Uses your existing cloud storage.' },
                  ].map((row, i) => (
                    <View key={i} style={[styles.featureRow, i > 0 ? { marginTop: 14 } : {}]}>
                      <View style={[styles.featureIcon, { backgroundColor: colors.secondary }]}>
                        <Feather name={row.icon as any} size={16} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText variant="body" style={{ fontWeight: '600' }}>{row.title}</ThemedText>
                        <ThemedText variant="caption" style={{ marginTop: 3 }}>{row.desc}</ThemedText>
                      </View>
                    </View>
                  ))}
                </Card>

                <Button
                  title={`Enable Auto-Backup via ${cloudName}`}
                  size="lg"
                  fullWidth
                  onPress={() => { setWantsAutoBackup(true); goToStep(5); }}
                  style={{ marginBottom: 10 }}
                />
                <Button
                  title="Skip for now"
                  variant="outline"
                  size="lg"
                  fullWidth
                  onPress={() => { setWantsAutoBackup(false); goToStep(5); }}
                />
              </>
            ) : (
              <Button title="Continue" size="lg" fullWidth onPress={() => goToStep(5)} />
            )}
          </View>
          <View style={[styles.navRow, { marginTop: 12 }]}>
            <Button title="Back" variant="ghost" size="sm" onPress={() => goToStep(3)} />
          </View>
        </View>

        {/* ─── Step 5: Help Is Always Available ─── */}
        <View style={[styles.page, { paddingTop: topPad + 20, paddingBottom: botPad + 60 }]}>
          <View style={styles.pageContent}>
            <View style={[styles.stepIconWrap, { backgroundColor: '#EBF3FF' }]}>
              <Feather name="help-circle" size={36} color={colors.primary} />
            </View>
            <ThemedText variant="h1" align="center" style={{ marginTop: 20 }}>
              Help is always here
            </ThemedText>
            <ThemedText variant="body" color={colors.mutedForeground} align="center" style={{ marginTop: 10, marginBottom: 28, paddingHorizontal: 8 }}>
              Batter Up has a full Help Center you can open anytime from the Home screen or Settings.
            </ThemedText>

            <Card style={{ marginBottom: 16 }}>
              {[
                { icon: 'zap', title: 'Quick Start', desc: 'Learn the basics in 2 minutes. Create a lineup, start a game, and track batters.' },
                { icon: 'book-open', title: 'Tutorial Library', desc: 'Step-by-step guides for game setup, advanced tracking, and stats.' },
                { icon: 'alert-circle', title: 'Troubleshooting', desc: 'Answers to common questions and how to fix mistakes fast.' },
              ].map((row, i) => (
                <View key={i} style={[styles.featureRow, i > 0 ? { marginTop: 14 } : {}]}>
                  <View style={[styles.featureIcon, { backgroundColor: colors.secondary }]}>
                    <Feather name={row.icon as any} size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="body" style={{ fontWeight: '600' }}>{row.title}</ThemedText>
                    <ThemedText variant="caption" style={{ marginTop: 3 }}>{row.desc}</ThemedText>
                  </View>
                </View>
              ))}
            </Card>

            <ThemedText variant="caption" color={colors.mutedForeground} align="center" style={{ paddingHorizontal: 16 }}>
              Access Help from the Home screen grid or from Settings at any time.
            </ThemedText>
          </View>
          <View style={styles.navRow}>
            <Button title="Back" variant="outline" size="md" onPress={() => goToStep(4)} style={{ flex: 1 }} />
            <Button title="Next" size="md" onPress={() => goToStep(6)} style={{ flex: 2, marginLeft: 10 }} />
          </View>
        </View>

        {/* ─── Step 6: Ready to Start ─── */}
        <View style={[styles.page, { paddingTop: topPad + 20, paddingBottom: botPad + 60 }]}>
          <View style={styles.pageContent}>
            <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
              <Feather name="check" size={40} color="#fff" />
            </View>
            <ThemedText variant="h1" align="center" style={{ marginTop: 24 }}>
              You're all set!
            </ThemedText>
            <ThemedText variant="body" color={colors.mutedForeground} align="center" style={{ marginTop: 10, marginBottom: 32, paddingHorizontal: 8 }}>
              {selectedMode === 'basic' ? 'Basic Mode' : 'Advanced Mode'} with{' '}
              {selectedGameType === 'tball' ? 'T-Ball' :
               selectedGameType === 'coach_pitch' ? 'Coach Pitch' :
               selectedGameType === 'kid_pitch' ? 'Kid Pitch' : 'Custom'} rules.{' '}
              Display set to{' '}
              {selectedDisplay === 'system' ? 'System Default' :
               selectedDisplay === 'light' ? 'Light Mode' : 'Dark Mode'}.
            </ThemedText>

            <Card style={{ padding: 20, marginBottom: 14, alignItems: 'center' }}>
              <Feather name="users" size={28} color={colors.primary} style={{ marginBottom: 10 }} />
              <ThemedText variant="h3" align="center">Create Your First Lineup</ThemedText>
              <ThemedText variant="caption" align="center" style={{ marginTop: 4, marginBottom: 14 }}>
                Add your players and set the batting order
              </ThemedText>
              <Button
                title="Create First Lineup"
                fullWidth
                onPress={() => { setGoCreate(true); handleFinish(false); }}
              />
            </Card>

            <Button
              title="Take a Quick Tour First"
              size="lg"
              fullWidth
              variant="outline"
              onPress={() => handleFinish(true)}
              style={{ marginBottom: 10 }}
            />
            <Button
              title="Go to Home"
              variant="ghost"
              size="md"
              fullWidth
              onPress={() => { setGoCreate(false); handleFinish(false); }}
            />
          </View>
        </View>
      </ScrollView>

      {/* Step indicators */}
      <View style={[styles.dots, { bottom: botPad + 12 }]}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === step ? colors.primary : colors.border, width: i === step ? 20 : 8 },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  page: { width, paddingHorizontal: 20, flex: 1, justifyContent: 'space-between' },
  pageContent: { flex: 1 },
  logo: { width: 220, height: 90, alignSelf: 'center', marginTop: 20 },
  tagline: { fontSize: 16, paddingHorizontal: 10, marginBottom: 32 },
  featuresBox: { gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bottomBtn: { marginTop: 20 },
  modeCard: { borderWidth: 2, borderRadius: 14, padding: 16, marginBottom: 14 },
  modeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  selectedBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  recommendedBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginTop: 10 },
  typeRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, padding: 14, marginBottom: 10 },
  typeRadio: { marginRight: 12 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  displayIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepIconWrap: { width: 80, height: 80, borderRadius: 22, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 20 },
  checkCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 40 },
  navRow: { flexDirection: 'row', marginTop: 16 },
  dots: { position: 'absolute', flexDirection: 'row', alignSelf: 'center', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
});
