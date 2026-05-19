# Batter Up

A mobile app for youth baseball and softball coaches to manage batting lineups, track live games, and review stats — all offline, no account needed.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Batter Up app runs via the `artifacts/batter-up: expo` workflow

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (React Native) with Expo Router
- Storage: AsyncStorage — fully offline, no backend for app data
- API: Express 5 (api-server, not used by mobile app data)
- Build: esbuild (API server CJS bundle)

## Where things live

- `artifacts/batter-up/` — Expo mobile app
- `artifacts/batter-up/app/` — All screens (file-based routing)
- `artifacts/batter-up/context/` — AppContext (settings), GameContext (game state)
- `artifacts/batter-up/services/` — storage.ts, statsCalculator.ts
- `artifacts/batter-up/models/types.ts` — All TypeScript models
- `artifacts/batter-up/constants/colors.ts` — Brand tokens
- `artifacts/batter-up/assets/images/` — Logo files

## Architecture decisions

- All data stored in AsyncStorage — no backend, no login, fully offline
- Game state managed via useReducer in GameContext with event sourcing (events stack for undo)
- Two modes (Basic / Advanced) controlled by AppSettings, gate feature visibility at render time
- Batting order auto-scrolls via FlatList ref + scrollToIndex on batter change
- Game rule presets (T-Ball, Coach Pitch, Kid Pitch, Custom) pre-fill GameSetup screen

## Product

Batter Up helps coaches:
- Create, save, edit, duplicate, and load batting lineups with drag reorder
- Run live game tracking with score, inning, current/on-deck batter display
- Record hits, outs, walks, runs, balls, strikes, and more with one tap
- Undo any game event
- Auto-advance batter and inning based on configurable rules
- View game summaries with player stats table and top performers
- Track season stats and team record over time
- Choose Basic Mode (simple) or Advanced Mode (detailed stats)
- Configure via onboarding wizard (first run) or Settings screen

## User preferences

- Use brand colors: Primary #0A74DA, Accent #F9A825, Navy #1A2C5B
- Logo files: batter-up-logo.png (full), batter-up-logo-small.png (icon)
- No emojis in UI
- Big, tappable buttons — designed for dugout use

## Gotchas

- Do NOT add a backend database — all data must stay in AsyncStorage
- Do NOT use the 'uuid' package — use `Date.now().toString() + Math.random().toString(36).substr(2, 9)`
- Restart the expo workflow only when dependencies change, not for code edits (HMR handles it)
- expo-file-system, expo-sharing, expo-document-picker are installed for backup/restore
- Alert.alert on web is unreliable for 3+ buttons — use Modal-based ConfirmModal instead
- endGame() just dispatches END_GAME; navigation is handled by useEffect watching game.isComplete
- Auto-end game is implemented in applyEndHalfInning: when nextInning > rules.innings, isComplete = true

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for mobile app conventions
