import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
import {
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
import { useColors } from '@/hooks/useColors';

// ─── Help content data ────────────────────────────────────────────────────────

type HelpStep = { title: string; body: string };

type HelpItem = {
  title: string;
  body: string;
  tags: string[];
  steps?: HelpStep[];
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
        body: 'From the Home screen, tap the big "Start Game" button. Choose New Game, Continue Game, or Scheduled Game. New Game lets you load a saved lineup or create a new one, then takes you to Game Setup to confirm your rules before going live.',
        tags: ['start', 'game', 'begin', 'new game', 'chooser'],
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
      // Start Game Flow — new chooser walkthroughs
      {
        title: 'Start Game: Overview of the new flow',
        body: 'Start Game is the main button on the Home screen. It opens a chooser with three options: New Game, Continue Game, and Scheduled Game.',
        tags: ['start game', 'chooser', 'home', 'overview', 'new flow'],
        steps: [
          { title: 'Start Game is the main button', body: 'On the Home screen, the big "Start Game" button is the primary action. Everything else — Saved Lineups, Schedule, Stats — lives below it as a supporting menu.' },
          { title: 'Choose how to start', body: 'Tapping Start Game opens a sheet with three clear choices: New Game, Continue Game, and Scheduled Game. Pick the one that matches what you want to do right now.' },
          { title: 'New Game starts fresh', body: 'Pick New Game when you want to begin a brand-new game. You will be asked to load a saved lineup or create a new one, then taken to Game Setup.' },
          { title: 'Continue Game resumes', body: 'Pick Continue Game when a game is already in progress. This option is greyed out when there is nothing to resume — that just means you have no unfinished games on the device.' },
          { title: 'Scheduled Game starts from your calendar', body: 'Pick Scheduled Game to start from a game you already planned. If you do not have any scheduled games yet, you can add one from the Schedule screen.' },
        ],
      },
      {
        title: 'Start Game: New Game step-by-step',
        body: 'New Game starts a fresh game. You load a lineup, confirm settings, then go live.',
        tags: ['new game', 'start', 'lineup', 'setup'],
        steps: [
          { title: 'Tap Start Game on Home', body: 'From the Home screen, tap the big Start Game button to open the chooser.' },
          { title: 'Choose New Game', body: 'Pick the New Game card. You will be asked how you want to pick your lineup.' },
          { title: 'Load saved or create new', body: 'Tap "Load Saved Lineup" to pick from your existing lineups, or "Create New Lineup" to build one from scratch.' },
          { title: 'Confirm Game Setup', body: 'On the Game Setup screen, confirm opponent, home/away, game type preset, innings, outs, and run limits.' },
          { title: 'Start tracking', body: 'Tap Start Game at the bottom of setup. The Live Game screen opens and you can start recording at-bats.' },
        ],
      },
      {
        title: 'Start Game: Continue Game step-by-step',
        body: 'Continue Game resumes the active game. Everything is restored exactly where you left it — no setup screen.',
        tags: ['continue game', 'resume', 'in progress'],
        steps: [
          { title: 'Tap Start Game on Home', body: 'From Home, tap Start Game to open the chooser.' },
          { title: 'Choose Continue Game', body: 'Pick the Continue Game card. If you do not see it active, you have no in-progress game saved.' },
          { title: 'Everything is restored', body: 'The lineup, current batter, on-deck batter, score, inning, half-inning, outs, balls/strikes, pitch count, and all events come back exactly as you left them.' },
          { title: 'Resume tracking', body: 'You go straight to the Live Game screen. Game Setup is skipped — you can open Game Options from inside the live game if you need to adjust anything.' },
          { title: 'Or use the Game in Progress card', body: 'You can also tap the dark "Game in Progress" card at the top of Home for one-tap resume.' },
        ],
      },
      {
        title: 'Start Game: Scheduled Game step-by-step',
        body: 'Scheduled Game starts from a planned game. Pick or create the scheduled game, then choose your lineup.',
        tags: ['scheduled game', 'schedule', 'plan', 'opponent'],
        steps: [
          { title: 'Tap Start Game on Home', body: 'From Home, tap Start Game to open the chooser.' },
          { title: 'Choose Scheduled Game', body: 'Pick the Scheduled Game card. This opens the Schedule screen.' },
          { title: 'Pick or create a game', body: 'Tap an upcoming game to start it, or tap "Add Scheduled Game" to create one with opponent name, date, time, and home/away.' },
          { title: 'Choose the lineup', body: 'The scheduled game can use a saved lineup you assigned to it, or you can pick or create a lineup at this step.' },
          { title: 'Confirm Game Setup and play', body: 'Game Setup pre-fills opponent and home/away from the schedule. Confirm rules and tap Start Game to go live.' },
        ],
      },
      // Getting Started
      {
        title: 'Getting Started: Basic Mode vs Advanced Mode',
        body: 'Basic Mode: See the lineup, score, inning, outs, and current batter. Tap Next to move to the next batter.\n\nAdvanced Mode: Everything in Basic, plus balls, strikes, pitch count, hit types, walks, strikeouts, RBIs, and per-player stats.\n\nYou can switch at any time in Settings.',
        tags: ['basic', 'advanced', 'mode', 'getting started'],
      },
      {
        title: 'Getting Started: Creating and editing a lineup',
        body: 'Tap Lineups, then New Lineup. Add players, drag to reorder, and save. Edit an existing lineup by tapping it on the Lineups screen.',
        tags: ['lineup', 'create', 'edit', 'players', 'reorder'],
        steps: [
          { title: 'Open the Lineups screen', body: 'From the Home screen, tap the Lineups button. You will see all of your saved lineups here.' },
          { title: 'Start a new lineup', body: 'Tap "New Lineup" at the top right. Give it a clear name like "Tigers — Spring 2026" so you can find it later.' },
          { title: 'Add your first player', body: 'Tap "Add Player." Enter the player\'s name. Jersey number and position are optional but useful for the in-game display.' },
          { title: 'Add the rest of your roster', body: 'Repeat for each player. They appear in the order you add them — that is the batting order.' },
          { title: 'Reorder if needed', body: 'Long-press the drag handle on the right side of any player row, then drag them up or down to change the batting order.' },
          { title: 'Save and you are done', body: 'Tap Save at the top. Your lineup is stored on your device and ready to use for any future game.' },
        ],
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
        body: 'Pick a game-type preset on Game Setup to auto-fill rules for that age group. You can fine-tune any value before starting.',
        tags: ['tball', 'coach pitch', 'kid pitch', 'preset', 'game type'],
        steps: [
          { title: 'Open Game Setup', body: 'After picking a lineup, you land on the Game Setup screen. Preset buttons appear near the top.' },
          { title: 'T-Ball', body: 'For the youngest age groups. No pitching, no walks or strikeouts. Just hit, run, and track outs and runs.' },
          { title: 'Coach Pitch', body: 'Good for ages roughly 7–8. Limits pitches per batter and skips walks and strikeouts.' },
          { title: 'Kid Pitch', body: 'Standard for ages 9 and up. Full tracking turned on — balls, strikes, walks, and strikeouts.' },
          { title: 'Custom', body: 'Tap Custom to start from scratch and set your own innings, outs, run limits, and tracking rules.' },
          { title: 'Tweak before starting', body: 'All preset values are still editable below. Adjust innings, outs per half-inning, or run limits to match your league.' },
        ],
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
        body: 'Tap Next to advance the batting order. Tap Prev or Undo to step back. The lineup view auto-scrolls so the current batter is always visible.',
        tags: ['next batter', 'previous batter', 'advance'],
        steps: [
          { title: 'Find the action bar', body: 'On the Live Game screen, the main action buttons sit at the bottom — this is where Next and Prev live.' },
          { title: 'Tap Next to advance', body: 'Tap "Next" to move to the next active batter. The NOW BATTING display updates instantly.' },
          { title: 'Watch the lineup scroll', body: 'The lineup auto-scrolls so the current batter is always centered, with the on-deck batter right below.' },
          { title: 'Go back if needed', body: 'If you advanced too soon, tap "Prev" to step backward. Inactive players are automatically skipped both ways.' },
          { title: 'Undo for a full reverse', body: 'If a Ball, Strike, or hit was recorded, use Undo instead — it reverses the event and any side effects like score changes.' },
        ],
      },
      {
        title: 'During the Game: Ending a half-inning',
        body: 'Basic Mode: tap End Inning. Advanced Mode: half-innings end automatically when outs or run-limits are reached, or tap End Half-Inning to end early.',
        tags: ['inning', 'end inning', 'half inning', 'outs'],
        steps: [
          { title: 'In Basic Mode', body: 'When the half-inning is over, tap "End Inning" on the Live Game screen. Outs reset and the next half-inning begins.' },
          { title: 'In Advanced Mode', body: 'Half-innings end automatically once the configured outs or run limit is reached. You do not need to tap anything.' },
          { title: 'Switching sides', body: 'After a half-inning ends, the batting team flips. Home team becomes the fielding team, and vice versa.' },
          { title: 'Ending early', body: 'In Advanced Mode you can also tap "End Half-Inning" to end it before the outs cap — useful for mercy-rule or weather situations.' },
        ],
      },
      {
        title: 'During the Game: Using Undo',
        body: 'Undo reverses the last recorded action. Tap it multiple times to go further back. Works for balls, strikes, score changes, batter advances, and more.',
        tags: ['undo', 'mistake', 'fix'],
        steps: [
          { title: 'Find Undo', body: 'The Undo button is in the bottom action bar on the Live Game screen, next to Next and Prev.' },
          { title: 'Tap once to reverse', body: 'Each tap reverses the most recent event — a ball, strike, run, hit, batter change, or anything else recorded.' },
          { title: 'Keep tapping for more', body: 'Need to go back further? Tap Undo again. The full event history is preserved for the whole game.' },
          { title: 'You can not break it', body: 'Undo works in both Basic and Advanced Mode. There is no penalty for mistakes — every recorded action can be reversed safely.' },
        ],
      },
      {
        title: 'Advanced Tracking: Balls and strikes',
        body: 'In Advanced Mode, tap Ball or Strike to update the count. Walks and strikeouts are recorded automatically when the configured limits are reached.',
        tags: ['balls', 'strikes', 'count', 'advanced'],
        steps: [
          { title: 'Switch to Advanced Mode', body: 'Balls and strikes only appear in Advanced Mode. Switch from Settings, or from the Game Menu during a live game.' },
          { title: 'Tap Ball', body: 'Tap "Ball" to add a ball to the current batter\'s count. The header shows filled dots for the running count.' },
          { title: 'Tap Strike', body: 'Tap "Strike" for a strike. The count display updates instantly.' },
          { title: 'Walks happen automatically', body: 'When the configured ball count is reached (usually 4), a walk is recorded and the batter advances on its own.' },
          { title: 'Strikeouts too', body: 'Hit the strike limit (usually 3) and a strikeout is recorded automatically — no extra tap needed.' },
        ],
      },
      {
        title: 'Advanced Tracking: Pitch count',
        body: 'In Advanced Mode, the pitch count tracks how many pitches the pitcher has thrown. This helps enforce pitch count rules common in youth leagues.\n\nYou can set a maximum pitch limit in the Game Setup screen under Advanced Rules.',
        tags: ['pitch count', 'pitches', 'advanced'],
      },
      {
        title: 'Advanced Tracking: Recording hits, outs, and walks',
        body: 'Tap the result button at the end of each at-bat: single, double, triple, home run, out, strikeout, walk, or HBP. The batter advances automatically.',
        tags: ['hits', 'outs', 'walks', 'strikeout', 'advanced'],
        steps: [
          { title: 'At the plate', body: 'When the batter finishes their at-bat, tap the result button that matches what happened.' },
          { title: 'Hits', body: 'Tap Single, Double, Triple, or Home Run. Each is recorded as a hit and feeds the batting average and slugging stats.' },
          { title: 'Outs', body: 'Tap "Out" for any standard out. Use "Strikeout" specifically for a K — it tracks separately in player stats.' },
          { title: 'Walks and HBP', body: 'Tap "Walk" (BB) or "HBP" (hit by pitch). These advance the batter to first without using an at-bat.' },
          { title: 'Auto-advance', body: 'After any action, the next active batter steps up automatically. No need to also tap Next.' },
        ],
      },
      {
        title: 'Advanced Tracking: What is an RBI?',
        body: 'RBI stands for Run Batted In. It is counted when a batter\'s hit or action causes a runner to score.\n\nIn Advanced Mode, you can record RBIs when you record a hit or run. Tap the run button and indicate the RBI if applicable.',
        tags: ['rbi', 'runs batted in', 'advanced', 'stats'],
      },
      {
        title: 'Stats: Viewing the game summary',
        body: 'The summary appears when a game ends. Shows final score, inning-by-inning, top performers, and full player stats. Past summaries live in Stats > Game History.',
        tags: ['summary', 'game summary', 'stats', 'history'],
        steps: [
          { title: 'After the game', body: 'When the game ends — either automatically or by tapping End Game — you are taken straight to the Game Summary.' },
          { title: 'Final score and innings', body: 'The top shows the final score and a line-by-line inning breakdown for both teams.' },
          { title: 'Top performers', body: 'Below the score, see which players led the team in hits, runs, and RBIs.' },
          { title: 'Full stats table', body: 'Scroll down for every player\'s at-bats, hits, walks, strikeouts, and batting average.' },
          { title: 'Find it later', body: 'Past summaries are saved in Stats > Game History. Tap any game to revisit its full summary.' },
        ],
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
        title: 'I do not see Continue Game',
        body: 'What probably happened: Continue Game is greyed out or hidden because there is no in-progress game on this device. The most recent game was either finished or never started.\n\nHow to fix it now: Tap Start Game and pick New Game (or Scheduled Game) instead. If you expected to resume a game, check Stats > Game History — it may have already been marked complete.\n\nHow to avoid it next time: Do not tap End Game until you are truly done. If you need to step away, just leave the app — the game is saved automatically and Continue Game will be available when you return.',
        tags: ['continue game', 'missing', 'disabled', 'resume', 'no game'],
      },
      {
        title: 'I accidentally went back to Home during a game',
        body: 'What probably happened: You navigated away from the Live Game screen. The game is still saved.\n\nHow to fix it now: From Home, either tap the dark "Game in Progress" card and hit Resume, or tap Start Game and pick Continue Game. Everything is restored exactly as you left it.\n\nHow to avoid it next time: Nothing to do — your game is auto-saved after every action, so leaving the screen never loses data.',
        tags: ['back to home', 'accidental', 'resume', 'lost game'],
      },
      {
        title: 'I want to resume a game',
        body: 'What probably happened: You started a game earlier and want to pick it back up.\n\nHow to fix it now: On Home, look for the dark "Game in Progress" card at the top — tap Resume Game. Or tap Start Game > Continue Game.\n\nHow to avoid it next time: You can always reach an in-progress game from the Home screen card or the Start Game chooser. No setup needed.',
        tags: ['resume', 'continue', 'pick up game'],
      },
      {
        title: 'I want to start a new game with a saved lineup',
        body: 'What probably happened: You want to use one of your existing lineups for a fresh game.\n\nHow to fix it now: Tap Start Game > New Game > Load Saved Lineup. Pick the lineup, confirm Game Setup, then tap Start Game.\n\nHow to avoid it next time: You can also tap Saved Lineups directly from the Home grid, pick the lineup, and use its Start Game action.',
        tags: ['new game', 'saved lineup', 'load lineup'],
      },
      {
        title: 'I do not have any saved lineups yet',
        body: 'What probably happened: You are brand new to the app, or you have not created any lineups.\n\nHow to fix it now: Tap Start Game > New Game > Create New Lineup. The Lineup Editor opens — add your players, set the batting order, and save. Then you continue straight to Game Setup.\n\nHow to avoid it next time: After your first game, your lineup stays saved. You can also create more lineups from Saved Lineups on the Home grid.',
        tags: ['no lineups', 'empty', 'first lineup', 'create lineup'],
      },
      {
        title: 'I do not have any scheduled games yet',
        body: 'What probably happened: You picked Scheduled Game but you have not added any to the schedule.\n\nHow to fix it now: From the Schedule screen, tap "Add Scheduled Game" and fill in opponent name, date, time, and home/away. Then you can start it from the Start Game chooser.\n\nHow to avoid it next time: Plan a week or season ahead — schedule lets you pre-assign lineups and pre-fill Game Setup for each opponent.',
        tags: ['no scheduled games', 'schedule', 'empty schedule', 'create scheduled game'],
      },
      {
        title: 'I am confused — what is the difference between a lineup and a game?',
        body: 'What probably happened: The wording in the chooser is new, and a saved lineup vs an in-progress game can sound similar.\n\nHow to fix it now: A saved lineup is just your roster and batting order — it has no score, no inning, no events. A game in progress is an actual ongoing game built on top of a lineup, with score, outs, and at-bats recorded. Continue Game resumes the latter; Saved Lineups manages the former.\n\nHow to avoid it next time: Use Start Game > New Game to begin a fresh game from a lineup. Use Start Game > Continue Game (or the dark Home card) to pick back up an active game. Use Saved Lineups only when you want to edit, duplicate, or delete the roster itself.',
        tags: ['confused', 'lineup vs game', 'difference', 'saved lineup', 'game in progress'],
      },
      {
        title: 'I started the wrong game type',
        body: 'What probably happened: You picked New Game when you meant Continue Game, or you began a game from the wrong lineup.\n\nHow to fix it now: From the Live Game screen, open Game Menu and tap End Game (you can discard it from the prompt). Then tap Start Game on Home and pick the right option.\n\nHow to avoid it next time: Read the chooser cards before tapping. New Game = start fresh. Continue Game = resume. Scheduled Game = start from a planned game.',
        tags: ['wrong game', 'restart', 'mistake', 'discard game'],
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
  const [walkthroughItem, setWalkthroughItem] = useState<HelpItem | null>(null);

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
    const hasWalkthrough = !!item.steps && item.steps.length > 0;
    const isOpen = expandedItems.has(itemKey);
    return (
      <View style={[styles.topicRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.topicHeader}
          onPress={() => (hasWalkthrough ? setWalkthroughItem(item) : toggleItem(itemKey))}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <ThemedText variant="body" style={{ fontWeight: '500' }}>{item.title}</ThemedText>
            {hasWalkthrough && (
              <View style={styles.walkthroughHint}>
                <Feather name="play-circle" size={12} color={colors.primary} />
                <ThemedText variant="caption" color={colors.primary} style={{ fontWeight: '600' }}>
                  {item.steps!.length}-step walkthrough
                </ThemedText>
              </View>
            )}
          </View>
          <Feather
            name={hasWalkthrough ? 'chevron-right' : isOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.mutedForeground}
          />
        </TouchableOpacity>
        {!hasWalkthrough && isOpen && (
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

      <WalkthroughModal
        item={walkthroughItem}
        onClose={() => setWalkthroughItem(null)}
      />
    </View>
  );
}

// ─── Walkthrough modal ────────────────────────────────────────────────────────

function WalkthroughModal({
  item,
  onClose,
}: {
  item: HelpItem | null;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [stepIdx, setStepIdx] = useState(0);

  // Reset to first step whenever a new walkthrough opens.
  React.useEffect(() => {
    if (item) setStepIdx(0);
  }, [item]);

  if (!item || !item.steps) return null;
  const steps = item.steps;
  const step = steps[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === steps.length - 1;
  const topPad = Platform.OS === 'web' ? 24 : insets.top + 8;
  const botPad = Platform.OS === 'web' ? 24 : insets.bottom + 16;

  return (
    <Modal visible={!!item} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={[styles.wtContainer, { backgroundColor: colors.background, paddingTop: topPad, paddingBottom: botPad }]}>
        {/* Header */}
        <View style={styles.wtHeader}>
          <TouchableOpacity onPress={onClose} style={styles.wtClose} hitSlop={10}>
            <Feather name="x" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <ThemedText variant="caption" color={colors.mutedForeground} style={{ fontWeight: '600', letterSpacing: 0.5 }}>
            STEP {stepIdx + 1} OF {steps.length}
          </ThemedText>
          <View style={{ width: 32 }} />
        </View>

        {/* Progress dots */}
        <View style={styles.wtDots}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[
                styles.wtDot,
                {
                  backgroundColor: i <= stepIdx ? colors.primary : colors.border,
                  width: i === stepIdx ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Title of the topic (subtle) */}
        <ThemedText
          variant="caption"
          align="center"
          color={colors.mutedForeground}
          style={{ marginTop: 12, paddingHorizontal: 24 }}
        >
          {item.title}
        </ThemedText>

        {/* Step content */}
        <ScrollView
          contentContainerStyle={styles.wtBody}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText variant="h2" align="center" style={{ marginBottom: 16 }}>
            {step.title}
          </ThemedText>
          <ThemedText variant="body" align="center" style={{ lineHeight: 24 }}>
            {step.body}
          </ThemedText>
        </ScrollView>

        {/* Footer actions */}
        <View style={styles.wtFooter}>
          {!isFirst && (
            <Button
              title="Back"
              variant="outline"
              size="lg"
              onPress={() => setStepIdx((i) => Math.max(0, i - 1))}
              style={{ flex: 1 }}
            />
          )}
          {isLast ? (
            <Button title="Done" variant="primary" size="lg" onPress={onClose} style={{ flex: 1 }} />
          ) : (
            <Button
              title="Next"
              variant="primary"
              size="lg"
              onPress={() => setStepIdx((i) => Math.min(steps.length - 1, i + 1))}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </View>
    </Modal>
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
  walkthroughHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  wtContainer: { flex: 1 },
  wtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  wtClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  wtDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  wtDot: {
    height: 8,
    borderRadius: 4,
  },
  wtBody: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  wtFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
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
