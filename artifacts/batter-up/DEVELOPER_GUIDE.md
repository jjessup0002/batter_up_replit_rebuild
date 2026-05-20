# Batter Up — Developer Guide

A comprehensive guide for any developer taking over this project. You should be able to understand the architecture, navigate the code, and make changes without running the app.

---

## 1. Product Overview

**Batter Up** is an offline-first mobile app for youth baseball and softball coaches. It runs entirely on the device via Expo/React Native. No backend. No login. No internet required.

**Core capabilities:**
- Build, save, edit, duplicate, and reorder batting lineups
- Run live game tracking with one-tap score/event recording
- Track per-player stats (batting average, RBIs, walks, strikeouts, etc.)
- View game summaries, season stats, and team records
- Plan upcoming games via a lightweight schedule
- Export/import full data backups
- Toggle between **Basic Mode** (simple) and **Advanced Mode** (full stats)

**Design constraints:**
- All data lives in `AsyncStorage`
- No `uuid` package; use `Date.now().toString() + Math.random().toString(36).substr(2, 9)`
- No emojis in UI copy
- Big, tappable buttons (designed for dugout use with gloves on)
- Brand colors: Primary `#0A74DA`, Accent `#F9A825`, Navy `#1A2C5B`

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK ~52 (React Native 0.76) |
| Router | Expo Router v4 (file-based) |
| Language | TypeScript 5.9 |
| State (app) | React Context + `useState` |
| State (game) | React Context + `useReducer` (event-sourcing) |
| Storage | `@react-native-async-storage/async-storage` |
| Styling | StyleSheet (no Tailwind, no styled-components) |
| Icons | `@expo/vector-icons` (Feather) |
| Haptics | `expo-haptics` |
| Build | Metro bundler (Expo default) |

The app is built inside a pnpm workspace but does **not** import from other workspace packages. It is a self-contained leaf package.

---

## 3. Directory Map

```
artifacts/batter-up/
├── app/                          # Expo Router screens (file-based routing)
│   ├── _layout.tsx               # Root layout: providers + onboarding gate
│   ├── home.tsx                  # Home screen (primary entry point)
│   ├── onboarding.tsx            # First-run setup wizard
│   ├── help.tsx                  # Help Center (accordion + walkthrough modals)
│   ├── tutorial.tsx              # Interactive tutorial overlay
│   ├── index.tsx                 # (unused — kept for router compat)
│   ├── settings.tsx              # Settings screen
│   ├── +not-found.tsx            # 404 fallback
│   ├── game/
│   │   ├── setup.tsx             # Game Setup screen (rules, opponent, lineup)
│   │   ├── live.tsx              # Live Game tracking screen (the main game UI)
│   │   ├── summary.tsx           # Post-game summary with stats table
│   │   └── edit-stats.tsx        # Edit past game stats (score + per-player overrides)
│   ├── lineups/
│   │   ├── index.tsx             # Saved Lineups list
│   │   └── editor.tsx            # Lineup Editor (create/edit players)
│   ├── schedule/
│   │   ├── index.tsx             # Scheduled games list
│   │   ├── editor.tsx            # Add/edit scheduled game
│   │   └── seasons.tsx           # Season management
│   └── stats/
│       └── index.tsx             # Stats & history (season records, per-player stats)
├── components/
│   ├── ui/                       # Shared UI primitives
│   │   ├── Button.tsx            # Primary button with variants + haptics
│   │   ├── ThemedText.tsx        # Typography with variants
│   │   └── Card.tsx              # Container card with theme-aware bg
│   └── LineupCard.tsx            # Lineup list item with actions
├── constants/
│   └── colors.ts                 # Light / dark theme token map
├── context/
│   ├── AppContext.tsx            # Global app settings + custom rule presets
│   └── GameContext.tsx           # Live game state machine (reducer)
├── hooks/
│   └── useColors.ts              # Returns theme-aware color tokens
├── models/
│   └── types.ts                  # All TypeScript interfaces + defaults
├── services/
│   ├── storage.ts                # AsyncStorage CRUD + backup/restore
│   └── statsCalculator.ts        # Aggregates events into PlayerStats
└── assets/
    └── images/                   # batter-up-logo.png, batter-up-logo-small.png
```

**Routing convention:**
- `app/game/setup.tsx` → `/game/setup`
- `app/lineups/editor.tsx` → `/lineups/editor`
- Query params are passed via `useLocalSearchParams()` and consumed on the target screen.

---

## 4. Data Model

Every data shape is defined in `models/types.ts`. Key models:

### Player
```typescript
interface Player {
  id: string;
  name: string;
  jerseyNumber: string;
  primaryPosition: string;
  secondaryPosition?: string;
  isActive: boolean;      // false = skipped in batting order during games
  battingOrder: number;
  createdAt: string;
}
```

### Lineup
```typescript
interface Lineup {
  id: string;
  name: string;
  teamName: string;
  players: Player[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}
```

### GameRules
```typescript
interface GameRules {
  mode: 'basic' | 'advanced';
  gameType: 'tball' | 'coach_pitch' | 'kid_pitch' | 'custom';
  innings: number;
  maxRunsPerHalfInning: number | null;
  outsPerHalfInning: number;
  ballsForWalk: number | null;
  strikesForStrikeout: number | null;
  maxPitchesPerBatter: number | null;
  foulOnFinalPitch: boolean;
  mercyRule: number | null;
  autoAdvanceBatter: boolean;
  trackBalls: boolean;
  trackStrikes: boolean;
  trackPitches: boolean;
}
```

### GameSetup
A snapshot of everything chosen on the **Game Setup** screen before play starts:
```typescript
interface GameSetup {
  lineupId: string;
  lineupSnapshot: Player[];   // copied from Lineup at game start
  teamName: string;
  opponentName: string;
  isHome: boolean;
  rules: GameRules;
  date: string;
  isDemoMode?: boolean;
  scheduledGameId?: string;
  seasonId?: string;
}
```

### GameState
The full in-memory representation of an active or completed game. Lives in `GameContext` while active, and is persisted to AsyncStorage after every action.
```typescript
interface GameState {
  id: string;
  setup: GameSetup;
  currentInning: number;
  halfInning: 'top' | 'bottom';
  currentBatterIndex: number;  // modulo'd against active player count
  myScore: number;
  opponentScore: number;
  balls: number;
  strikes: number;
  outs: number;
  runsThisHalfInning: number;
  pitchCount: number;
  inningScores: InningScore[];
  events: GameEvent[];        // event-sourced history (supports undo)
  isComplete: boolean;
  completedAt?: string;
  statOverrides?: Record<string, PlayerStatOverride>;
  manuallyCorrected?: boolean;
}
```

### ScheduledGame
```typescript
interface ScheduledGame {
  id: string;
  date: string;          // YYYY-MM-DD
  time?: string;         // HH:MM 24h
  opponentName: string;
  lineupId?: string;     // optional pre-assigned lineup
  venue?: string;
  notes?: string;
  status: 'upcoming' | 'completed' | 'delayed' | 'cancelled';
  completedGameId?: string;
  seasonId?: string;
  createdAt: string;
}
```

### AppSettings
See `models/types.ts` line 182. Includes mode, defaults, display preferences, onboarding flags, and review-prompt counters.

---

## 5. Storage Layer

All CRUD lives in `services/storage.ts`. Uses `@react-native-async-storage/async-storage`.

### AsyncStorage Keys
| Key | Data |
|---|---|
| `@batter_up:lineups` | `Lineup[]` |
| `@batter_up:games` | `GameState[]` (completed games only) |
| `@batter_up:active_game` | `GameState` (in-progress game) |
| `@batter_up:settings` | `AppSettings` |
| `@batter_up:presets` | `CustomPresets` (user-modified rule presets) |
| `@batter_up:schedule` | `ScheduledGame[]` |
| `@batter_up:seasons` | `Season[]` |

### Critical functions
- `getActiveGame()` / `saveActiveGame()` — the in-progress game is **double-written**: to `ACTIVE_GAME` key after every action in `GameContext`, and also mirrored into the `games` array when completed.
- `saveLineup(lineup)` — upsert into the `lineups` array.
- `markLineupUsed(id)` — updates `lastUsedAt` so the Home screen can sort "recently used".
- `checkForAutoBackup()` / `restoreFromBackup()` — reads/writes a JSON file in `FileSystem.documentDirectory`. Used for the "Welcome back" restore prompt on fresh installs.

### ID generation
```typescript
export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
```
Never install `uuid`.

---

## 6. GameContext — The State Machine

`context/GameContext.tsx` is the heart of the app. It uses a `useReducer` pattern with **event sourcing**: every action appends a `GameEvent` to `state.events`, which enables full `UNDO`.

### Actions (dispatch types)
```typescript
type GameAction =
  | { type: 'START_GAME'; payload: GameSetup }
  | { type: 'RECORD_EVENT'; payload: { eventType: EventType; playerId?: string; metadata?: Record<string, unknown> } }
  | { type: 'NEXT_BATTER' }
  | { type: 'PREV_BATTER' }
  | { type: 'UNDO' }
  | { type: 'END_HALF_INNING' }
  | { type: 'ADJUST_SCORE'; payload: { team: 'my' | 'opponent'; delta: number } }
  | { type: 'END_GAME' }
  | { type: 'UPDATE_SETUP'; payload: Partial<GameSetup> }
  | { type: 'RESTORE'; payload: GameState };
```

### Key helpers inside GameContext
- `getActivePlayers(state)` — filters `lineupSnapshot` by `isActive`
- `getCurrentPlayer(state)` — active player at `currentBatterIndex % active.length`
- `applyNextBatter(state)` — increments `currentBatterIndex`, resets balls/strikes, appends `next_batter` event
- `applyEndHalfInning(state)` — flips half-inning, resets outs/runs/balls/strikes/pitchCount, auto-ends game if `nextInning > rules.innings`
- `applyEvent(state, eventType, metadata)` — records the event, runs side effects (e.g. `run_scored` adds to score), auto-advances batter on outs/walks/Ks
- `applyUndo(state)` — pops the last event and reverses its side effects by inspecting `eventType`

### Persistence
Every reducer transition ends with `saveActiveGame(nextState)`. The game is saved to AsyncStorage after **every single action**. This is why a coach can kill the app mid-game and resume perfectly.

### Exposed API (`useGame()`)
```typescript
const {
  game,               // current GameState or null
  startGame,          // takes GameSetup, initializes a new GameState
  recordBall,         // shorthand for RECORD_EVENT('ball')
  recordStrike,       // shorthand for RECORD_EVENT('strike')
  recordHit(hitType), // shorthand for RECORD_EVENT('single'|'double'...)
  recordOut,          // shorthand
  recordStrikeout,    // shorthand
  recordWalk,         // shorthand
  recordHitByPitch,   // shorthand
  recordRunScored,    // shorthand
  recordRbi,          // shorthand
  nextBatter,         // dispatches NEXT_BATTER
  prevBatter,         // dispatches PREV_BATTER
  undoLastEvent,      // dispatches UNDO
  endHalfInning,      // dispatches END_HALF_INNING
  adjustScore,        // dispatches ADJUST_SCORE
  endGame,            // dispatches END_GAME (marks complete; summary screen watches for this)
  updateGameSetup,    // dispatches UPDATE_SETUP (used by mid-game lineup editor)
  restoreGame,        // dispatches RESTORE (rehydrates from AsyncStorage on app launch)
} = useGame();
```

---

## 7. AppContext — Global Settings

`context/AppContext.tsx` manages:
- `AppSettings` (mode, defaults, display preferences)
- `CustomPresets` (user-modified rule presets per game type)
- Loading state (`isLoading`) while booting

It fetches `getSettings()` and `getCustomPresets()` on mount. All mutations write back to AsyncStorage immediately.

### How presets work
Each `GameType` has a default `GameRules` in `GAME_RULE_PRESETS`. The user can tweak these on the Game Setup screen and save them as custom presets. The next time they pick that game type, the custom preset loads instead of the hardcoded default.

---

## 8. Screen-by-Screen Navigation Map

### Home (`home.tsx`)
- **Primary action:** big "Start Game" button → opens a 2-step bottom-sheet modal
  - Step 1: choose **New Game / Continue Game / Scheduled Game**
  - Step 2 (New Game): choose **Load Saved Lineup** (`/lineups?pickForGame=1`) or **Create New Lineup** (`/lineups/editor?returnTo=setup`)
- **Game in Progress card** (dark navy bg) appears when `game && !game.isComplete`. Tapping Resume → `/game/live`
- **Secondary grid:** Saved Lineups, Schedule, Stats & History, Help Center, Settings
- **Stats strip:** count of lineups + completed games
- **Recent lineup chip:** de-emphasized footer link to `/lineups`

### Game Setup (`game/setup.tsx`)
- Consumes query params: `lineupId`, `scheduledGameId`, `opponent`
- Loads saved lineups and seasons
- User picks: lineup, opponent, home/away, season, mode (basic/advanced), game type preset
- Preset buttons (T-Ball / Coach Pitch / Kid Pitch / Custom) pre-fill `GameRules`
- Advanced section toggles: innings, outs, run limit, balls, strikes, pitches, mercy rule
- "Start Game" button calls `startGame(setup)` → pushes `/game/live`
- If `isDemoMode`, starts a practice game that does not count toward season stats

### Live Game (`game/live.tsx`)
The most complex screen (~1156 lines). Layout:
- **Header:** score, inning, half-inning indicator, outs, pitch count (advanced only)
- **Batter banner:** "Now batting" + "On deck" cards
- **Lineup list:** FlatList of active players; current batter highlighted in primary color; on-deck in secondary
- **Action buttons (Basic):** Next, Prev, Run +, Undo, End Inning
- **Action buttons (Advanced):** Ball, Strike, Foul, Hit (single/double/triple/HR), Out, Strikeout, Walk, HBP, Run, RBI, End Half-Inning
- **Game Menu (modal):** Edit Lineup, Game Options, Switch Mode, End Game, Cancel
- **Edit Lineup modal:** rename, reorder, toggle active, add players (full inline editor)
- **ConfirmModal:** used for destructive actions (End Game, Switch Mode)

### Game Summary (`game/summary.tsx`)
- Consumes `gameId` param (or defaults to most recent game)
- Displays: final score, inning-by-inning breakdown, top performers, per-player stats table
- Actions: Share (text summary), Edit Game Stats, View Full Stats, Back to Home
- Shows "Stats manually corrected" badge if `manuallyCorrected === true`
- `useFocusEffect` refreshes data on return from `edit-stats.tsx`

### Edit Game Stats (`game/edit-stats.tsx`)
- Allows editing per-inning scores and per-player stat overrides for a completed game
- Score steppers update `inningScores[]`; total score is recomputed from innings
- Player stat overrides are stored in `game.statOverrides` and fully replace event-derived stats for that player in `statsCalculator.ts`
- Saves back via `updateGame()` in storage

### Saved Lineups (`lineups/index.tsx`)
- List of all lineups sorted by `lastUsedAt` / `updatedAt`
- `pickForGame=1` query param transforms the screen into a **Choose Lineup** picker for the Start Game flow
- Each card: Start Game, Edit, Duplicate, Delete, Favorite
- Empty state: "Create Lineup" button

### Lineup Editor (`lineups/editor.tsx`)
- Create or edit a lineup
- Fields: lineup name, team name
- Player list: name, jersey #, position, active toggle, drag reorder
- Add Player form inline at bottom
- Save writes to AsyncStorage; if `returnTo=setup`, navigates to `/game/setup?lineupId=...` instead of going back

### Schedule (`schedule/index.tsx`)
- List of upcoming / past scheduled games
- Season filter at top
- Actions: start the game (→ setup), edit, mark completed/cancelled

### Schedule Editor (`schedule/editor.tsx`)
- Form: opponent, date picker, time picker, home/away toggle, venue, notes, season, optional lineup

### Stats (`stats/index.tsx`)
- Season selector → season record (W/L/T)
- Per-player stats table: sortable by AVG, H, R, RBI, AB, BB, K
- Game history list → tap to view summary

### Help Center (`help.tsx`)
- 3 sections: Quick Start, Tutorial Library, Troubleshooting
- Each item is an accordion. Items with `steps[]` open a `WalkthroughModal` (guided modal with progress dots + Back/Next/Done)
- Content is hardcoded in `HELP_DATA` array

### Settings (`settings.tsx`)
- Game mode (Basic/Advanced)
- Default rules per game type
- Display (system/light/dark), text size
- Data & Backup (export/import JSON)
- Review prompt toggles
- Help links

---

## 9. Game Flow (End-to-End)

### New Game
```
Home → Start Game → New Game → Load Saved Lineup  → /lineups?pickForGame=1
                                                → tap lineup → /game/setup?lineupId=...
                                                → Start Game → startGame(setup) → /game/live

Home → Start Game → New Game → Create New Lineup  → /lineups/editor?returnTo=setup
                                                → save → /game/setup?lineupId=...
                                                → Start Game → /game/live
```

### Continue Game
```
Home → Game in Progress card (Resume) → /game/live
   OR
Home → Start Game → Continue Game → /game/live
```
No Game Setup screen is shown.

### Scheduled Game
```
Home → Start Game → Scheduled Game → /schedule
   → tap a scheduled game → /game/setup?scheduledGameId=...&opponent=...
   → Start Game → /game/live
```

### Ending a Game
```
Live Game → End Game (menu or auto-end when innings exhausted)
   → dispatch END_GAME (isComplete = true, completedAt set)
   → useEffect in live.tsx detects isComplete → push /game/summary?gameId=...
```

---

## 10. Stats Calculation

`services/statsCalculator.ts` aggregates `GameEvent[]` into `PlayerStats`.

### Per-event mapping
- `single` → PA+1, AB+1, H+1, singles+1, TB+1
- `double` → PA+1, AB+1, H+1, doubles+1, TB+2
- `triple` → PA+1, AB+1, H+1, triples+1, TB+3
- `homerun` → PA+1, AB+1, H+1, homeRuns+1, TB+4
- `out` → PA+1, AB+1
- `strikeout` → PA+1, AB+1, strikeouts+1
- `walk` → PA+1, walks+1 (AB unchanged)
- `hit_by_pitch` → PA+1, hitByPitch+1 (AB unchanged)
- `reached_on_error` → PA+1, reachedOnError+1 (AB unchanged)
- `sacrifice` → sacrifices+1 (AB unchanged)
- `run_scored` → runs+1
- `rbi` → rbis+1

### Derived stats
- **AVG** = H / AB (0 if AB=0)
- **OBP** = (H + BB + HBP) / (AB + BB + HBP) (0 if denom=0)
- **SLG** = TB / AB (0 if AB=0)
- **OPS** = OBP + SLG
- **K%** = K / AB
- **BB%** = BB / AB

### Manual overrides
If a game has `statOverrides[playerId]`, those values **replace** the event-derived stats for that player in that game. This is used by the Edit Game Stats screen. Because overrides do not store hit-type breakdown, all overridden hits are counted as singles for TB/SLG purposes.

### Season-level aggregation
`calculatePlayerStats(playerId, playerName, games[])` loops over all games the player appeared in and sums the stats. This is called from `stats/index.tsx` with the full completed-games array.

---

## 11. Rules Engine & Presets

### Presets (hardcoded defaults)
| Game Type | Mode | Innings | Outs | Run Limit | Balls | Strikes | Pitches | Notes |
|---|---|---|---|---|---|---|---|---|
| T-Ball | basic | 5 | 3 | 6 | null | null | null | No pitching |
| Coach Pitch | basic | 6 | 3 | 6 | null | null | 6 | Limited pitches |
| Kid Pitch | advanced | 6 | 3 | null | 4 | 3 | null | Full tracking |
| Custom | advanced | 7 | 3 | null | 4 | 3 | null | User-defined |

### Auto-advance behavior
- `autoAdvanceBatter: true` (all presets) means the batter advances automatically after a recorded out, walk, or strikeout.
- Half-inning ends automatically when `outs >= outsPerHalfInning` or `runsThisHalfInning >= maxRunsPerHalfInning`.
- Game ends automatically when the next half-inning would exceed `rules.innings`.

### Mercy rule
If `mercyRule` is set and `myScore - opponentScore >= mercyRule` (or vice versa) for 2+ consecutive half-innings, the game can be ended early. (UI toggle exists; full enforcement is in `GameContext`.)

---

## 12. Design System

### Typography (`ThemedText`)
| Variant | Size | Weight | Usage |
|---|---|---|---|
| `h1` | 28px | 700 | Major headings |
| `h2` | 22px | 700 | Section headings |
| `h3` | 18px | 600 | Card titles |
| `body` | 16px | 400 | Body text |
| `label` | 14px | 600 | Form labels |
| `caption` | 13px | 400 | Metadata, hints |
| `button` | 16px | 600 | Button text |

### Colors (`useColors()`)
Returns the active theme (light/dark) from `constants/colors.ts`. Tokens include:
- `background`, `foreground`, `card`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `success`, `navy`
- Each token has a `*Foreground` companion for text on that background.

### Buttons (`Button`)
Variants: `primary`, `secondary`, `accent`, `outline`, `ghost`, `destructive`
Sizes: `sm`, `md`, `lg`, `xl`
Props: `fullWidth`, `loading`, `icon`, `iconPosition`, `disabled`
Every press fires a light haptic via `expo-haptics`.

### Cards (`Card`)
Simple wrapper with `borderRadius`, `backgroundColor: colors.card`, and optional shadow. Accepts `style` override.

---

## 13. Offline & Backup Architecture

### Why no backend?
The app is designed for rural fields with spotty cell service. All data is local.

### Auto-backup
When `autoBackupEnabled` is true, a JSON file is written to `FileSystem.documentDirectory + 'batter-up-auto-backup.json'` after every meaningful mutation. The file is overwritten each time.

### Restore flow
On a fresh install with 0 lineups and 0 games, `home.tsx` checks for the auto-backup file. If found, it shows the "Welcome back!" modal with lineup/game counts. Tapping "Restore My Data" calls `restoreFromBackup()` which:
1. Parses the JSON
2. Writes all arrays back to AsyncStorage
3. Calls `reloadSettings()` and `reloadPresets()`
4. Calls `loadData()` to refresh the Home screen

### Manual export/import
In Settings > Data & Backup, users can export a `.json` file via `expo-sharing` and import one via `expo-document-picker`. The same `AppBackup` schema is used.

---

## 14. Common Patterns & Conventions

### Passing intent through query params
When the Start Game flow needs to change behavior on a destination screen, use query params:
- `pickForGame=1` on `/lineups` → shows "Choose Lineup" picker mode
- `returnTo=setup` on `/lineups/editor` → after save, routes to `/game/setup` instead of going back

### Modal stack inside a screen
Several screens manage their own modals locally (e.g. `live.tsx` has `showGameMenu`, `showEditLineup`, `showEndGameConfirm`, `showModeSwitchConfirm`). Each modal is a local `useState` boolean. No global modal manager.

### ConfirmModal
A reusable modal component (defined inline in some screens) with a title, message, and Confirm/Cancel buttons. Used when native `Alert.alert` would be unreliable (especially on web with >2 buttons).

### useFocusEffect for data refresh
Screens that display lists (Home, Lineups, Stats, Schedule) use `useFocusEffect` to reload from AsyncStorage every time the screen gains focus. This fixes the "I just saved something but the previous screen still shows stale data" bug.

### Event sourcing for undo
Every action in `GameContext` appends a `GameEvent`. `UNDO` pops the last event and reverses its side effects. This means:
- You can undo **any** action (balls, strikes, runs, batter changes, score adjustments)
- The full history is preserved for the game's lifetime
- Events are not persisted beyond the `GameState` object (they live inside `state.events`)

---

## 15. How to Add a New Screen

1. Create the file in `app/` (or a subfolder). Use `default export function MyScreen() {}`.
2. Use `useColors()` + `useSafeAreaInsets()` for layout.
3. If the screen needs data, read from `services/storage.ts` in `useFocusEffect`.
4. Navigate to it with `router.push('/my-screen')`.
5. If it needs query params, consume them with `useLocalSearchParams()`.
6. Add the route to any relevant Help / Tutorial copy in `help.tsx`.

---

## 16. How to Add a New Game Action

1. Add the `EventType` to `models/types.ts`.
2. In `GameContext.tsx`:
   - Add a shorthand method to the context value interface.
   - Implement the method in the provider (it should call `recordEvent`).
   - If the event needs side effects (score changes, auto-advance, etc.), add a `case` in `applyEvent()`.
3. If the event affects stats, add the mapping in `statsCalculator.ts`.
4. Add the button to `live.tsx` (inside the `isBasic ? ... : ...` block).
5. Add undo reversal logic in `applyUndo()` if the event mutates state.

---

## 17. Gotchas & Pitfalls

| Issue | Why it happens | Fix |
|---|---|---|
| `currentBatterIndex` goes out of sync after editing lineup | `lineupSnapshot` length changed but `currentBatterIndex` is not adjusted | We use modulo against `activePlayers.length` everywhere; the index stays valid as long as >0 active players |
| Game in Progress card flickers on launch | Two separate `useFocusEffect`s were syncing `hasResumeableGame` | Solved: derive it directly from `game` state in the render body |
| Continue Game option disabled briefly | AsyncStorage restore of active game hasn't finished yet | Solved: `useFocusEffect` restores the game into `GameContext` on first focus; `hasResumeableGame` is then derived from context |
| Summary screen shows stale stats after editing | `summary.tsx` used `useEffect` on mount only | Solved: switched to `useFocusEffect` so it refreshes when returning from `edit-stats.tsx` |
| Web alerts with 3+ buttons are unreliable | React Native's `Alert.alert` uses browser `alert()` which only supports OK/Cancel | Solved: use the inline `ConfirmModal` component instead |
| `shadow*` style props deprecated warning | Expo SDK 52 warns on `shadowColor` etc. | Use `boxShadow` instead (low priority; app works fine) |
| Typecheck disagrees with editor | Cross-package type references in composite projects | Trust `pnpm run typecheck` over editor/LSP |

---

## 18. Running & Verifying

```bash
# Typecheck (always trust this over editor state)
cd artifacts/batter-up && pnpm run typecheck

# Start the dev server (runs via workflow, not bash)
# The Expo workflow is "artifacts/batter-up: expo"
```

No backend is needed. The API server workflow (`artifacts/api-server`) is not used by the mobile app.

---

## 19. Feature Checklist (What's Implemented)

- [x] Create, save, edit, duplicate, delete lineups
- [x] Drag-reorder batting order
- [x] Toggle players active/inactive
- [x] Start Game chooser (New / Continue / Scheduled)
- [x] Game Setup with presets (T-Ball / Coach Pitch / Kid Pitch / Custom)
- [x] Basic Mode (score, inning, outs, next batter)
- [x] Advanced Mode (balls, strikes, pitches, hit types, RBIs, walks, Ks)
- [x] Live game tracking with one-tap actions
- [x] Undo any event
- [x] Auto-advance batter and inning based on rules
- [x] Edit lineup mid-game
- [x] Game summary with inning breakdown + stats table
- [x] Edit past game stats (score + per-player overrides)
- [x] Season stats and team record
- [x] Scheduled games + seasons
- [x] Settings (mode, defaults, display, backup)
- [x] Help Center with walkthrough tutorials
- [x] Onboarding wizard (first run)
- [x] Data export/import (JSON)
- [x] Auto-backup to device file system
- [x] Review prompt after completed games

---

*End of guide. For questions about specific files, see inline comments and JSDoc inside the source code.*
