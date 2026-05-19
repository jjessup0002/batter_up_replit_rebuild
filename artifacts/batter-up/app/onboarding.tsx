import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated,
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
import { AppMode, GameType } from '@/models/types';
import { useColors } from '@/hooks/useColors';

const { width } = Dimensions.get('window');
const TOTAL_STEPS = 4;

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { updateSettings } = useApp();
  const [step, setStep] = useState(0);
  const [selectedMode, setSelectedMode] = useState<AppMode>('basic');
  const [selectedGameType, setSelectedGameType] = useState<GameType>('kid_pitch');
  const scrollRef = useRef<ScrollView>(null);

  const goToStep = (s: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setStep(s);
    scrollRef.current?.scrollTo({ x: s * width, animated: true });
  };

  const handleFinish = async (goCreate: boolean) => {
    await updateSettings({
      onboardingComplete: true,
      mode: selectedMode,
      defaultGameType: selectedGameType,
    });
    if (goCreate) {
      router.replace('/lineups/editor');
    } else {
      router.replace('/home');
    }
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

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
        {/* Step 0: Welcome */}
        <View style={[styles.page, { paddingTop: topPad + 20, paddingBottom: botPad + 20 }]}>
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

        {/* Step 1: Choose Mode */}
        <View style={[styles.page, { paddingTop: topPad + 20, paddingBottom: botPad + 20 }]}>
          <View style={styles.pageContent}>
            <ThemedText variant="h1" align="center">Choose Your Style</ThemedText>
            <ThemedText variant="body" color={colors.mutedForeground} align="center" style={{ marginTop: 8, marginBottom: 32 }}>
              You can change this anytime in Settings.
            </ThemedText>

            <TouchableOpacity
              onPress={() => setSelectedMode('basic')}
              style={[
                styles.modeCard,
                { borderColor: selectedMode === 'basic' ? colors.primary : colors.border, backgroundColor: colors.card },
              ]}
              activeOpacity={0.8}
            >
              <View style={styles.modeCardHeader}>
                <View style={[styles.modeIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="zap" size={22} color={colors.primary} />
                </View>
                {selectedMode === 'basic' && (
                  <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                    <Feather name="check" size={12} color="#fff" />
                    <ThemedText variant="caption" color="#fff" style={{ marginLeft: 4 }}>Selected</ThemedText>
                  </View>
                )}
              </View>
              <ThemedText variant="h2" style={{ marginTop: 12 }}>Basic Mode</ThemedText>
              <ThemedText variant="caption" style={{ marginTop: 4, marginBottom: 8 }}>Best for quick games</ThemedText>
              <ThemedText variant="body" color={colors.mutedForeground}>
                Track lineup, score, inning, current batter, and game summary.
              </ThemedText>
              <View style={[styles.recommendedBadge, { backgroundColor: colors.accent }]}>
                <ThemedText variant="caption" style={{ fontWeight: '700' }}>Recommended for most coaches</ThemedText>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedMode('advanced')}
              style={[
                styles.modeCard,
                { borderColor: selectedMode === 'advanced' ? colors.primary : colors.border, backgroundColor: colors.card },
              ]}
              activeOpacity={0.8}
            >
              <View style={styles.modeCardHeader}>
                <View style={[styles.modeIcon, { backgroundColor: '#EBF3FF' }]}>
                  <Feather name="activity" size={22} color={colors.primary} />
                </View>
                {selectedMode === 'advanced' && (
                  <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                    <Feather name="check" size={12} color="#fff" />
                    <ThemedText variant="caption" color="#fff" style={{ marginLeft: 4 }}>Selected</ThemedText>
                  </View>
                )}
              </View>
              <ThemedText variant="h2" style={{ marginTop: 12 }}>Advanced Mode</ThemedText>
              <ThemedText variant="caption" style={{ marginTop: 4, marginBottom: 8 }}>Best for detailed tracking</ThemedText>
              <ThemedText variant="body" color={colors.mutedForeground}>
                Track balls, strikes, pitch rules, hits, walks, outs, runs, player stats, and analytics.
              </ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.navRow}>
            <Button title="Back" variant="outline" size="md" onPress={() => goToStep(0)} style={{ flex: 1 }} />
            <Button title="Next" size="md" onPress={() => goToStep(2)} style={{ flex: 2, marginLeft: 10 }} />
          </View>
        </View>

        {/* Step 2: Game Type */}
        <View style={[styles.page, { paddingTop: topPad + 20, paddingBottom: botPad + 20 }]}>
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
                  <View
                    style={[
                      styles.radioOuter,
                      { borderColor: selectedGameType === g.id ? colors.primary : colors.border },
                    ]}
                  >
                    {selectedGameType === g.id && (
                      <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                    )}
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

        {/* Step 3: Finish */}
        <View style={[styles.page, { paddingTop: topPad + 20, paddingBottom: botPad + 20 }]}>
          <View style={styles.pageContent}>
            <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
              <Feather name="check" size={40} color="#fff" />
            </View>
            <ThemedText variant="h1" align="center" style={{ marginTop: 24 }}>
              You're ready to start!
            </ThemedText>
            <ThemedText variant="body" color={colors.mutedForeground} align="center" style={{ marginTop: 10, marginBottom: 40 }}>
              {selectedMode === 'basic' ? 'Basic Mode' : 'Advanced Mode'} selected with{' '}
              {selectedGameType === 'tball' ? 'T-Ball' :
               selectedGameType === 'coach_pitch' ? 'Coach Pitch' :
               selectedGameType === 'kid_pitch' ? 'Kid Pitch' : 'Custom'} rules.
            </ThemedText>

            <View style={styles.finishOptions}>
              <Card style={{ padding: 20, marginBottom: 16, alignItems: 'center' }}>
                <Feather name="users" size={28} color={colors.primary} style={{ marginBottom: 10 }} />
                <ThemedText variant="h3" align="center">Create Your First Lineup</ThemedText>
                <ThemedText variant="caption" align="center" style={{ marginTop: 4, marginBottom: 14 }}>
                  Add your players and set the batting order
                </ThemedText>
                <Button title="Create First Lineup" fullWidth onPress={() => handleFinish(true)} />
              </Card>

              <Button
                title="Go to Home"
                variant="outline"
                fullWidth
                size="lg"
                onPress={() => handleFinish(false)}
              />
            </View>
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
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
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
  checkCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 40 },
  finishOptions: { flex: 1, justifyContent: 'flex-start' },
  navRow: { flexDirection: 'row', marginTop: 16 },
  dots: { position: 'absolute', flexDirection: 'row', alignSelf: 'center', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
});
