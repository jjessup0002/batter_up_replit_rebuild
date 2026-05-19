import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Dimensions, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'home' as const,
    iconColor: '#0A74DA',
    title: 'Home Screen',
    desc: 'Your coaching hub. Start a game, jump to your last lineup, check stats, or open settings — all from one place.',
    tips: [
      'Tap "Start Game" to begin a new game',
      'Your most recently used lineup appears here as a quick-start',
      'The mode badge (Basic / Advanced) shows your current mode — tap to change it',
    ],
  },
  {
    icon: 'users' as const,
    iconColor: '#0A74DA',
    title: 'Building Lineups',
    desc: 'Create and save batting lineups. Add players, assign positions, and drag to reorder. Mark players inactive to skip them.',
    tips: [
      'Drag the handle on the right to reorder batters',
      'Toggle the checkmark to mark a player inactive without removing them',
      'Duplicate a lineup to make quick variations',
    ],
  },
  {
    icon: 'sliders' as const,
    iconColor: '#0A74DA',
    title: 'Game Setup',
    desc: 'Pick your lineup, set the opponent, and choose your game rules. Presets fill in T-Ball, Coach Pitch, and Kid Pitch rules automatically.',
    tips: [
      'Choose "Sandbox Mode" to simulate a game without recording real stats',
      'Tap "Edit presets" to customize the default rules for each game type',
      '"Advanced Rules" lets you set run limits, mercy rules, and pitch counts',
    ],
  },
  {
    icon: 'target' as const,
    iconColor: '#F9A825',
    title: 'Live Game — Basic Mode',
    desc: 'Track the game with big, easy-to-tap buttons. Score, inning, outs, and current batter are always visible.',
    tips: [
      '"NOW BATTING" banner shows who is up with the on-deck batter beside it',
      'Tap "Next" to manually advance the batter',
      'Use the cloud icon to pause for a rain delay — resume from home anytime',
      'Undo removes the last event if you tap something by mistake',
    ],
  },
  {
    icon: 'activity' as const,
    iconColor: '#0A74DA',
    title: 'Live Game — Advanced Mode',
    desc: 'Track every pitch: balls, strikes, fouls, hits, outs, walks, and more. Full count and stats per player.',
    tips: [
      'Ball/Strike dots update in real time in the header',
      'Auto-advance moves to the next batter after a walk, hit, or out',
      'End Inning records the half inning and resets the count',
      'All events can be undone if you make a mistake',
    ],
  },
  {
    icon: 'bar-chart-2' as const,
    iconColor: '#0A74DA',
    title: 'Stats & Summary',
    desc: 'After each game, review the box score, inning-by-inning scores, top performers, and full player stats.',
    tips: [
      'Season stats track every player across all recorded games',
      'Tap a game in History to re-read its summary',
      'Share the game summary as text with one tap',
      'Auto-backup keeps all your data safe on iCloud or Google Drive',
    ],
  },
];

export default function TutorialScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { updateSettings } = useApp();
  const [step, setStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const goToStep = (s: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setStep(s);
    scrollRef.current?.scrollTo({ x: s * width, animated: true });
  };

  const handleDone = async () => {
    await updateSettings({ tutorialComplete: true });
    router.canGoBack() ? router.back() : router.replace('/home');
  };

  const handleSkip = async () => {
    await updateSettings({ tutorialComplete: true });
    router.canGoBack() ? router.back() : router.replace('/home');
  };

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <ThemedText variant="body" color={colors.mutedForeground}>Skip</ThemedText>
        </TouchableOpacity>
        <ThemedText variant="h2">How It Works</ThemedText>
        <View style={{ width: 48 }} />
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: botPad + 100, paddingTop: 20, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
              {/* Icon */}
              <View style={[styles.iconWrap, { backgroundColor: s.iconColor + '18' }]}>
                <Feather name={s.icon} size={44} color={s.iconColor} />
              </View>

              {/* Step label */}
              <ThemedText variant="caption" align="center" color={colors.primary} style={{ marginTop: 20, fontWeight: '700', letterSpacing: 1 }}>
                STEP {i + 1} OF {SLIDES.length}
              </ThemedText>

              <ThemedText variant="h1" align="center" style={{ marginTop: 8, marginBottom: 12 }}>
                {s.title}
              </ThemedText>
              <ThemedText variant="body" align="center" color={colors.mutedForeground} style={{ marginBottom: 28, lineHeight: 24 }}>
                {s.desc}
              </ThemedText>

              {/* Tips card */}
              <Card>
                <View style={styles.tipsHeader}>
                  <Feather name="check-circle" size={16} color={colors.success} />
                  <ThemedText variant="label" style={{ marginLeft: 8 }}>Key Points</ThemedText>
                </View>
                {s.tips.map((tip, j) => (
                  <View key={j} style={styles.tipRow}>
                    <View style={[styles.tipDot, { backgroundColor: colors.primary }]} />
                    <ThemedText variant="body" style={{ flex: 1, lineHeight: 22 }}>{tip}</ThemedText>
                  </View>
                ))}
              </Card>
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      {/* Bottom navigation */}
      <View style={[styles.bottom, { paddingBottom: botPad + 8, backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goToStep(i)}>
              <View style={[styles.dot, { backgroundColor: i === step ? colors.primary : colors.border, width: i === step ? 20 : 8 }]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.navRow}>
          {step > 0 && (
            <Button title="Back" variant="outline" size="md" onPress={() => goToStep(step - 1)} style={{ flex: 1 }} />
          )}
          {!isLast ? (
            <Button title="Next" size="md" onPress={() => goToStep(step + 1)} style={{ flex: step > 0 ? 2 : 1, marginLeft: step > 0 ? 10 : 0 }} />
          ) : (
            <Button title="Done" size="md" onPress={handleDone} style={{ flex: step > 0 ? 2 : 1, marginLeft: step > 0 ? 10 : 0 }} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  skipBtn: { padding: 4, minWidth: 48 },
  slide: { flex: 1 },
  iconWrap: { width: 100, height: 100, borderRadius: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8, flexShrink: 0 },
  bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  navRow: { flexDirection: 'row' },
});
