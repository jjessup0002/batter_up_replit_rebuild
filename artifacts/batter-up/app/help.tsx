import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { useColors } from '@/hooks/useColors';

// ─── Help content data ────────────────────────────────────────────────────────

type HelpItem = {
  title: string;
  body: string;
  tags: string[];
};

type HelpSection = {
  id: string;
  title: string;
  icon: 'zap' | 'book-open' | 'alert-circle';
  color: string;
  items: HelpItem[];
};

const HELP_DATA: HelpSection[] = [
  {
    id: 'quickstart',
    title: 'Quick Start',
    icon: 'zap',
    color: '#F9A825',
    items: [
      {
        title: 'What does Batter Up do?',
        body: 'Batter Up helps coaches manage batting lineups and track live games. You can build and save lineups before the game, then track who is batting, the score, outs, innings, and player stats during the game — all without needing an internet connection or account.',
        tags: ['what', 'overview', 'app'],
      },
      {
        title: 'Basic Mode vs Advanced Mode',
        body: 'Basic Mode is great for most coaches. You see the lineup, score, inning, and current batter. One tap moves to the next batter.\n\nAdvanced Mode adds balls, strikes, pitch count, hit types, walks, outs, RBIs, and full player stats. You can switch modes anytime in Settings.',
        tags: ['basic', 'advanced', 'mode'],
      },
      {
        title: 'How do I create a lineup?',
        body: 'From the Home screen, tap "Lineups" or tap the main action button. On the Lineups screen, tap "New Lineup." Enter the lineup name, then add your players one by one. Give each player a name and optionally a position and jersey number. Drag the handle on the right to reorder batters.',
        tags: ['create', 'lineup', 'new', 'players'],
      },
      {
        title: 'How do I save a lineup?',
        body: 'Tap "Save" at the top of the lineup editor. The lineup is saved to your device automatically. You can load it anytime from the Lineups screen.',
        tags: ['save', 'lineup'],
      },
      {
        title: 'How do I load a saved lineup?',
        body: 'From the Home screen, tap "Lineups." Find your lineup and tap it. Then tap "Start Game" to use it for a new game, or "Edit" to make changes.',
        tags: ['load', 'open', 'lineup'],
      },
      {
        title: 'How do I start a game?',
        body: 'From the Lineups screen, tap a lineup and then tap "Start Game." On the Game Setup screen, choose your opponent, pick home or away, and confirm your game rules. Then tap "Start Game" at the bottom.',
        tags: ['start', 'game', 'begin'],
      },
      {
        title: 'How do I use Next Batter?',
        body: 'During a live game, tap the "Next" button to move to the next batter in the lineup. The current batter display will update automatically. In Advanced Mode, you can also record the at-bat result (hit, out, walk) and the batter will advance automatically.',
        tags: ['next', 'batter', 'advance'],
      },
      {
        title: 'How do I track the score?',
        body: 'In Basic Mode, use the "+" run button to add a run for your team. The score, inning, and outs are always shown at the top of the Live Game screen.\n\nIn Advanced Mode, you can record runs, RBIs, and hits for individual players.',
        tags: ['score', 'runs', 'track'],
      },
      {
        title: 'How do I undo a mistake?',
        body: 'Tap the "Undo" button on the Live Game screen. This reverses the last recorded action. You can undo multiple times to go further back.',
        tags: ['undo', 'mistake', 'fix', 'wrong'],
      },
      {
        title: 'How do I end the game?',
        body: 'When the final out of the last inning is recorded, the game will end automatically based on your rules. You can also tap the menu or "End Game" button to end it manually.',
        tags: ['end', 'finish', 'game'],
      },
      {
        title: 'Where is the game summary?',
        body: 'After the game ends, you will be taken to the Game Summary screen automatically. You can also find past game summaries on the Stats screen. Tap any game in your history to see the full summary.',
        tags: ['summary', 'stats', 'after game'],
      },
    ],
  },
  {
    id: 'tutorials',
    title: 'Tutorial Library',
    icon: 'book-open',
    color: '#0A74DA',
    items: [
      // Getting Started
      {
        title: 'Getting Started: Basic Mode vs Advanced Mode',
        body: 'Basic Mode: See the lineup, score, inning, outs, and current batter. Tap Next to move to the next batter.\n\nAdvanced Mode: Everything in Basic, plus balls, strikes, pitch count, hit types, walks, strikeouts, RBIs, and per-player stats.\n\nYou can switch at any time in Settings.',
        tags: ['basic', 'advanced', 'mode', 'getting started'],
      },
      {
        title: 'Getting Started: Creating and editing a lineup',
        body: 'Tap "Lineups" from the Home screen. Tap "New Lineup" and give it a name. Add players using the "Add Player" button. For each player, enter their name and optionally a jersey number and position.\n\nTo reorder: drag the handle on the right side of each player row.\n\nTo edit an existing lineup: tap the lineup on the Lineups screen, then tap "Edit."',
        tags: ['lineup', 'create', 'edit', 'players', 'reorder'],
      },
      {
        title: 'Getting Started: Marking a player inactive',
        body: 'Open your lineup and find the player. Tap the checkmark toggle next to their name to mark them inactive. An inactive player stays in the lineup but is skipped when tracking the batting order during a game.\n\nThis is useful if a player is absent or not playing that game.',
        tags: ['inactive', 'skip', 'player', 'absent'],
      },
      {
        title: 'Getting Started: Duplicating a lineup',
        body: 'On the Lineups screen, tap the lineup you want to copy. Tap the "..." menu or the Duplicate option. A copy will be saved with the same players so you can adjust it for a different game.',
        tags: ['duplicate', 'copy', 'lineup'],
      },
      {
        title: 'Game Setup: Home vs Away',
        body: 'On the Game Setup screen, you can choose whether your team is batting first (Away) or second (Home). This controls which half of the inning your team bats in.\n\nTop of the inning = Away team bats. Bottom = Home team bats.',
        tags: ['home', 'away', 'setup'],
      },
      {
        title: 'Game Setup: Innings, outs, and run limits',
        body: 'Use the Game Setup screen to set how many innings the game lasts and how many outs end each half-inning. You can also set a run limit per inning — the half-inning ends once your team scores that many runs.\n\nFor most youth leagues: 6 innings, 3 outs or 5 runs per inning.',
        tags: ['innings', 'outs', 'run limit', 'setup'],
      },
      {
        title: 'Game Setup: Choosing T-Ball, Coach Pitch, or Kid Pitch',
        body: 'On Game Setup, tap a preset to automatically fill in the rules for that game type:\n\n• T-Ball: No pitching, simplified rules\n• Coach Pitch: Limited pitches per batter, no walks\n• Kid Pitch: Full rules — balls, strikes, walks, strikeouts\n• Custom: Set your own rules\n\nYou can customize defaults for each type in Settings under Game Type Presets.',
        tags: ['tball', 'coach pitch', 'kid pitch', 'preset', 'game type'],
      },
      {
        title: 'Game Setup: Choosing Light Mode or Dark Mode',
        body: 'Go to Settings and find the Display section. Choose:\n\n• System Default: Follows your phone\'s current appearance setting\n• Light Mode: High contrast and easy to read in bright sunlight\n• Dark Mode: Comfortable on the eyes for evening games\n\nYou can also set this during the first-time setup.',
        tags: ['light mode', 'dark mode', 'display', 'sunlight', 'evening'],
      },
      {
        title: 'During the Game: Current batter and on-deck batter',
        body: 'The Live Game screen shows a "NOW BATTING" banner with the current batter\'s name and number. The on-deck batter (next up) is shown just below or beside it.\n\nThe lineup on screen auto-scrolls so you can always see where you are in the order.',
        tags: ['current batter', 'on deck', 'batting order', 'live game'],
      },
      {
        title: 'During the Game: Using Next Batter and Previous Batter',
        body: 'Tap "Next" to move forward to the next active batter.\n\nIf you need to go back (for example, you advanced too early), tap "Prev" or use Undo to reverse the action.',
        tags: ['next batter', 'previous batter', 'advance'],
      },
      {
        title: 'During the Game: Ending a half-inning',
        body: 'In Basic Mode: tap "End Inning" when the half-inning is done. The score and outs will reset for the next half-inning.\n\nIn Advanced Mode: the half-inning can end automatically when the outs or run limit is reached. You can also end it manually by tapping "End Half-Inning."',
        tags: ['inning', 'end inning', 'half inning', 'outs'],
      },
      {
        title: 'During the Game: Using Undo',
        body: 'Tap Undo on the Live Game screen to reverse the last recorded action. Batter Up keeps track of recent events so you can undo multiple mistakes in a row.\n\nUndo works for: next batter, score changes, balls, strikes, outs, and most other game events.',
        tags: ['undo', 'mistake', 'fix'],
      },
      {
        title: 'Advanced Tracking: Balls and strikes',
        body: 'In Advanced Mode, use the "Ball" and "Strike" buttons to track the count for the current batter. The count is shown as dots in the header (filled = used).\n\nA walk is recorded automatically when the configured balls-for-walk count is reached. A strikeout is recorded when the strikes limit is hit.',
        tags: ['balls', 'strikes', 'count', 'advanced'],
      },
      {
        title: 'Advanced Tracking: Pitch count',
        body: 'In Advanced Mode, the pitch count tracks how many pitches the pitcher has thrown. This helps enforce pitch count rules common in youth leagues.\n\nYou can set a maximum pitch limit in the Game Setup screen under Advanced Rules.',
        tags: ['pitch count', 'pitches', 'advanced'],
      },
      {
        title: 'Advanced Tracking: Recording hits, outs, and walks',
        body: 'In Advanced Mode, you can record the result of each at-bat:\n\n• Hit: single, double, triple, or home run\n• Out: records the out and advances the batter\n• Walk (BB): advances the batter to first\n• Strikeout (K): records the out\n• Hit by pitch (HBP): same as a walk\n\nTap the result button and the batter will advance automatically.',
        tags: ['hits', 'outs', 'walks', 'strikeout', 'advanced'],
      },
      {
        title: 'Advanced Tracking: What is an RBI?',
        body: 'RBI stands for Run Batted In. It is counted when a batter\'s hit or action causes a runner to score.\n\nIn Advanced Mode, you can record RBIs when you record a hit or run. Tap the run button and indicate the RBI if applicable.',
        tags: ['rbi', 'runs batted in', 'advanced', 'stats'],
      },
      {
        title: 'Stats: Viewing the game summary',
        body: 'The game summary appears automatically when a game ends. It shows:\n\n• Final score and inning-by-inning breakdown\n• Top performers (hits, RBIs)\n• Full player stats table\n\nYou can also find past summaries on the Stats screen. Tap any game in your history.',
        tags: ['summary', 'game summary', 'stats', 'history'],
      },
      {
        title: 'Stats: What is batting average?',
        body: 'Batting average (AVG) shows how often a batter gets a hit. It is calculated as:\n\nHits ÷ At-Bats\n\nFor example: 3 hits in 10 at-bats = .300 batting average. A .300 average is considered very good in youth baseball.',
        tags: ['batting average', 'avg', 'stats'],
      },
      {
        title: 'Stats: What is on-base percentage?',
        body: 'On-base percentage (OBP) measures how often a batter reaches base — by hit, walk, or hit by pitch. It is a broader measure of offensive contribution than batting average.\n\nFormula: (Hits + Walks + HBP) ÷ (At-Bats + Walks + HBP)',
        tags: ['obp', 'on base', 'percentage', 'stats'],
      },
      {
        title: 'Stats: What is strikeout rate and walk rate?',
        body: 'Strikeout rate (K%) shows how often a batter strikes out per at-bat. A lower number is better.\n\nWalk rate (BB%) shows how often a batter draws a walk. A higher number means the batter has a good eye.\n\nThese stats only appear in Advanced Mode.',
        tags: ['strikeout rate', 'walk rate', 'k%', 'bb%', 'stats', 'advanced'],
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: 'alert-circle',
    color: '#D32F2F',
    items: [
      {
        title: 'I tapped the wrong button',
        body: 'No problem. Tap Undo on the Live Game screen to reverse the last action. Batter Up keeps a history of recent events so you can undo multiple times if needed.',
        tags: ['undo', 'wrong', 'mistake', 'tap'],
      },
      {
        title: 'The next batter did not change',
        body: 'Make sure all players in the lineup are marked active. If only one player is active, the batter will not advance.\n\nAlso check that you are using Next Batter and not another button.',
        tags: ['next batter', 'did not change', 'stuck'],
      },
      {
        title: 'I need to fix the score',
        body: 'Use Undo to reverse recent score changes. If you need to go back further than Undo allows, tap the score display — some screens allow you to edit the score directly.',
        tags: ['score', 'fix', 'wrong score'],
      },
      {
        title: 'I need to edit the lineup during a game',
        body: 'On the Live Game screen, tap the lineup area or look for an Edit button. You can mark players inactive or adjust the order. Changes take effect immediately without restarting the game.',
        tags: ['edit lineup', 'during game', 'player'],
      },
      {
        title: 'A player is absent or left the game',
        body: 'Open the lineup editor during the game. Find the player and tap their name to mark them inactive. They will be skipped in the batting order for the rest of the game.',
        tags: ['absent', 'inactive', 'skip player', 'player left'],
      },
      {
        title: 'I need to skip a player',
        body: 'Mark the player as inactive in the lineup. Open the lineup, find the player, and toggle the checkmark off. The lineup will skip that player automatically.',
        tags: ['skip', 'inactive', 'player'],
      },
      {
        title: 'I need to add a player mid-game',
        body: 'Open the lineup editor from the Live Game screen and tap "Add Player." Add the new player\'s name and they will appear at the bottom of the batting order.',
        tags: ['add player', 'mid game', 'new player'],
      },
      {
        title: 'I need to switch from Basic Mode to Advanced Mode',
        body: 'Go to Settings and find the Game Mode section. Tap "Advanced Mode." The Live Game screen will update immediately to show balls, strikes, and advanced tracking buttons.',
        tags: ['switch mode', 'basic to advanced', 'mode'],
      },
      {
        title: 'I need to switch from Advanced Mode to Basic Mode',
        body: 'Go to Settings and find the Game Mode section. Tap "Basic Mode." The extra tracking options will be hidden and the screen will simplify.',
        tags: ['switch mode', 'advanced to basic', 'mode'],
      },
      {
        title: 'I picked the wrong game rules',
        body: 'If the game has not started yet, go back to Game Setup and change the rules. If the game is in progress, use Undo to reverse any actions that were affected, and the rules can be adjusted through the game settings during the game.',
        tags: ['game rules', 'wrong rules', 'setup'],
      },
      {
        title: 'The inning did not advance',
        body: 'Check your outs setting. The inning advances automatically when the configured number of outs is reached. In Basic Mode, you can also tap "End Inning" to advance manually.',
        tags: ['inning', 'did not advance', 'outs'],
      },
      {
        title: 'The run limit was reached — what happens?',
        body: 'When the run limit per inning is reached, Batter Up will end the half-inning automatically. The batting team switches and the next half-inning begins.\n\nIf you need to keep playing past the run limit, you can adjust the run limit in the game rules or turn it off.',
        tags: ['run limit', 'runs', 'inning ended'],
      },
      {
        title: 'I need to fix the pitch count or balls/strikes',
        body: 'Use Undo to reverse the last ball, strike, or pitch recorded. If you need to go back multiple steps, tap Undo repeatedly until the count is correct.',
        tags: ['pitch count', 'balls', 'strikes', 'fix'],
      },
      {
        title: 'I do not see stats I expected',
        body: 'Some stats only appear in Advanced Mode. Switch to Advanced Mode in Settings to see balls, strikes, pitch count, hit types, and per-player stat breakdowns.\n\nAlso make sure the game has been completed and saved — in-progress games may show partial stats.',
        tags: ['stats', 'missing', 'not showing'],
      },
      {
        title: 'My saved lineup is missing',
        body: 'Lineups are stored on your device. If you reinstalled the app or switched phones, you would need to restore from a backup. Go to Settings > Data & Backup to import a backup file.\n\nTo prevent this in the future, enable Auto-Backup in Settings.',
        tags: ['lineup missing', 'lost data', 'backup'],
      },
      {
        title: 'I want to start a new game with the same lineup',
        body: 'Go to the Lineups screen and tap your lineup. Tap "Start Game." This starts a fresh game using that lineup without affecting past game history.',
        tags: ['new game', 'same lineup', 'replay'],
      },
      {
        title: 'I want to use the app in bright sunlight',
        body: 'Go to Settings and find the Display section. Choose "Light Mode." This uses a high-contrast white theme that is much easier to read outdoors in direct sun.',
        tags: ['sunlight', 'outdoor', 'light mode', 'bright'],
      },
      {
        title: 'I want to switch to dark mode for an evening game',
        body: 'Go to Settings and find the Display section. Choose "Dark Mode." This uses a dark background that is easy on the eyes at night or in low-light conditions.',
        tags: ['dark mode', 'evening', 'night', 'low light'],
      },
      {
        title: 'Icons or buttons look wrong on Android',
        body: 'Make sure the app is fully loaded before the game. If icons appear as boxes or blank spaces, close the app completely and reopen it. If the problem continues, try uninstalling and reinstalling the app — your data will not be lost if you have a backup.',
        tags: ['android', 'icons', 'broken', 'missing icons'],
      },
      {
        title: 'How do I reopen the setup guide?',
        body: 'Go to Settings and scroll to the Help section. Tap "View Setup Guide." This restarts the onboarding wizard so you can review your settings and preferences.',
        tags: ['setup guide', 'onboarding', 'restart', 'tutorial'],
      },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function HelpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [query, setQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['quickstart']));
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const results: Array<{ sectionTitle: string; item: HelpItem }> = [];
    for (const section of HELP_DATA) {
      for (const item of section.items) {
        const matches =
          item.title.toLowerCase().includes(q) ||
          item.body.toLowerCase().includes(q) ||
          item.tags.some((t) => t.includes(q));
        if (matches) {
          results.push({ sectionTitle: section.title, item });
        }
      }
    }
    return results;
  }, [query]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleItem = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const HelpItemRow = ({ item, itemKey }: { item: HelpItem; itemKey: string }) => {
    const isOpen = expandedItems.has(itemKey);
    return (
      <View style={[styles.topicRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.topicHeader}
          onPress={() => toggleItem(itemKey)}
          activeOpacity={0.7}
        >
          <ThemedText variant="body" style={{ flex: 1, fontWeight: '500' }}>{item.title}</ThemedText>
          <Feather
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.mutedForeground}
          />
        </TouchableOpacity>
        {isOpen && (
          <View style={[styles.topicBody, { backgroundColor: colors.muted }]}>
            <ThemedText variant="body" style={{ lineHeight: 22 }}>{item.body}</ThemedText>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <ThemedText variant="h2">Help Center</ThemedText>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search */}
        <View style={[styles.searchRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search help topics..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Link to guided tutorial */}
        <TouchableOpacity
          style={[styles.tutorialBanner, { backgroundColor: colors.secondary, borderColor: colors.primary }]}
          onPress={() => router.push('/tutorial')}
          activeOpacity={0.8}
        >
          <View style={[styles.tutorialIconWrap, { backgroundColor: colors.primary }]}>
            <Feather name="compass" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <ThemedText variant="body" color={colors.primary} style={{ fontWeight: '700' }}>
              Take the Guided Tour
            </ThemedText>
            <ThemedText variant="caption" color={colors.primary}>
              6-step walkthrough of the whole app
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={18} color={colors.primary} />
        </TouchableOpacity>

        {/* Search Results */}
        {searchResults !== null ? (
          <View>
            <ThemedText
              variant="label"
              style={[styles.sectionLabel, { color: colors.mutedForeground }]}
            >
              {searchResults.length === 0
                ? 'No results found'
                : `${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`}
            </ThemedText>
            {searchResults.length === 0 && (
              <Card style={{ padding: 16, alignItems: 'center' }}>
                <Feather name="search" size={32} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                <ThemedText variant="body" align="center" color={colors.mutedForeground}>
                  Try searching for: undo, score, lineup, inning, dark mode, pitch count, stats
                </ThemedText>
              </Card>
            )}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {searchResults.map(({ sectionTitle, item }, i) => (
                <View key={i}>
                  <HelpItemRow item={item} itemKey={`search-${i}`} />
                </View>
              ))}
            </Card>
          </View>
        ) : (
          /* Sections */
          HELP_DATA.map((section) => {
            const isOpen = expandedSections.has(section.id);
            return (
              <View key={section.id} style={styles.section}>
                <TouchableOpacity
                  style={[
                    styles.sectionHeader,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderBottomLeftRadius: isOpen ? 0 : colors.radius,
                      borderBottomRightRadius: isOpen ? 0 : colors.radius,
                    },
                  ]}
                  onPress={() => toggleSection(section.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.sectionIconWrap, { backgroundColor: section.color + '18' }]}>
                    <Feather name={section.icon} size={20} color={section.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <ThemedText variant="h3">{section.title}</ThemedText>
                    <ThemedText variant="caption" color={colors.mutedForeground}>
                      {section.items.length} topics
                    </ThemedText>
                  </View>
                  <Feather
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>

                {isOpen && (
                  <Card style={{ padding: 0, overflow: 'hidden', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                    {section.items.map((item, i) => (
                      <HelpItemRow
                        key={i}
                        item={item}
                        itemKey={`${section.id}-${i}`}
                      />
                    ))}
                  </Card>
                )}
              </View>
            );
          })
        )}

        {/* Footer note */}
        {searchResults === null && (
          <ThemedText
            variant="caption"
            align="center"
            color={colors.mutedForeground}
            style={{ marginTop: 16, paddingHorizontal: 16 }}
          >
            All data stays on your device. No account required.
          </ThemedText>
        )}
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
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  tutorialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  tutorialIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginLeft: 2,
  },
  section: { gap: 0 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  sectionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicRow: { borderBottomWidth: StyleSheet.hairlineWidth },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  topicBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 0,
  },
});
