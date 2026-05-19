export type AppMode = 'basic' | 'advanced';
export type GameType = 'tball' | 'coach_pitch' | 'kid_pitch' | 'custom';
export type HalfInning = 'top' | 'bottom';
export type HitType = 'single' | 'double' | 'triple' | 'homerun';
export type EventType =
  | 'ball' | 'strike' | 'foul' | 'hit' | 'single' | 'double' | 'triple' | 'homerun'
  | 'out' | 'strikeout' | 'walk' | 'hit_by_pitch' | 'run_scored' | 'rbi'
  | 'reached_on_error' | 'fielders_choice' | 'sacrifice'
  | 'stolen_base' | 'caught_stealing' | 'runner_out'
  | 'inning_advanced' | 'half_inning_ended' | 'score_adjusted'
  | 'player_advanced' | 'undo' | 'next_batter' | 'end_game';

export interface Player {
  id: string;
  name: string;
  jerseyNumber: string;
  primaryPosition: string;
  secondaryPosition?: string;
  isActive: boolean;
  battingOrder: number;
  createdAt: string;
}

export interface Lineup {
  id: string;
  name: string;
  teamName: string;
  players: Player[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface GameRules {
  mode: AppMode;
  gameType: GameType;
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

export interface GameSetup {
  lineupId: string;
  lineupSnapshot: Player[];
  teamName: string;
  opponentName: string;
  isHome: boolean;
  rules: GameRules;
  date: string;
  isDemoMode?: boolean;
  scheduledGameId?: string;
  seasonId?: string;
}

export interface GameEvent {
  id: string;
  gameId: string;
  playerId: string;
  eventType: EventType;
  timestamp: string;
  inning: number;
  halfInning: HalfInning;
  metadata?: Record<string, unknown>;
}

export interface InningScore {
  inning: number;
  topRuns: number;
  bottomRuns: number;
}

export interface GameState {
  id: string;
  setup: GameSetup;
  currentInning: number;
  halfInning: HalfInning;
  currentBatterIndex: number;
  myScore: number;
  opponentScore: number;
  balls: number;
  strikes: number;
  outs: number;
  runsThisHalfInning: number;
  pitchCount: number;
  inningScores: InningScore[];
  events: GameEvent[];
  isComplete: boolean;
  completedAt?: string;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  plateAppearances: number;
  atBats: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  runs: number;
  rbis: number;
  walks: number;
  strikeouts: number;
  hitByPitch: number;
  reachedOnError: number;
  sacrifices: number;
  totalBases: number;
  battingAverage: number;
  onBasePercentage: number;
  sluggingPercentage: number;
  ops: number;
}

// ─── Seasons ───────────────────────────────────────────────────────────────────

export type SeasonType = 'preseason' | 'regular' | 'tournament';

export interface Season {
  id: string;
  name: string;
  type: SeasonType;
  year: number;
  createdAt: string;
  isActive: boolean;
}

export const SEASON_TYPE_LABELS: Record<SeasonType, string> = {
  preseason: 'Preseason',
  regular: 'Regular Season',
  tournament: 'Tournament',
};

// ─── Schedule ─────────────────────────────────────────────────────────────────

export type ScheduleStatus = 'upcoming' | 'completed' | 'delayed' | 'cancelled';

export interface ScheduledGame {
  id: string;
  date: string;       // ISO date string (YYYY-MM-DD)
  time?: string;      // HH:MM (24h)
  opponentName: string;
  lineupId?: string;
  venue?: string;
  notes?: string;
  status: ScheduleStatus;
  completedGameId?: string;
  seasonId?: string;
  createdAt: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface AppSettings {
  mode: AppMode;
  defaultGameType: GameType;
  defaultInnings: number;
  defaultMaxRunsPerHalfInning: number | null;
  defaultOutsPerHalfInning: number;
  defaultBallsForWalk: number | null;
  defaultStrikesForStrikeout: number | null;
  defaultMaxPitches: number | null;
  requireJerseyNumber: boolean;
  requirePosition: boolean;
  preventDuplicateJerseys: boolean;
  darkMode: boolean;
  largeTextMode: boolean;
  onboardingComplete: boolean;
  autoBackupEnabled: boolean;
  hasAskedAboutBackup: boolean;
  hasDeclinedAutoRestore: boolean;
  activeSeasonId?: string;
  // Review prompts
  gameSessionsCompleted: number;
  reviewDeclineCount: number;
  hasClickedReview: boolean;
  // Tutorial
  tutorialComplete: boolean;
}

export type CustomPresets = Record<GameType, Partial<GameRules>>;

export const DEFAULT_SETTINGS: AppSettings = {
  mode: 'basic',
  defaultGameType: 'kid_pitch',
  defaultInnings: 6,
  defaultMaxRunsPerHalfInning: null,
  defaultOutsPerHalfInning: 3,
  defaultBallsForWalk: 4,
  defaultStrikesForStrikeout: 3,
  defaultMaxPitches: null,
  requireJerseyNumber: false,
  requirePosition: false,
  preventDuplicateJerseys: false,
  darkMode: false,
  largeTextMode: false,
  onboardingComplete: false,
  autoBackupEnabled: false,
  hasAskedAboutBackup: false,
  hasDeclinedAutoRestore: false,
  activeSeasonId: undefined,
  gameSessionsCompleted: 0,
  reviewDeclineCount: 0,
  hasClickedReview: false,
  tutorialComplete: false,
};

export const GAME_RULE_PRESETS: CustomPresets = {
  tball: {
    mode: 'basic', gameType: 'tball', innings: 5, maxRunsPerHalfInning: 6,
    outsPerHalfInning: 3, ballsForWalk: null, strikesForStrikeout: null,
    maxPitchesPerBatter: null, trackBalls: false, trackStrikes: false,
    trackPitches: false, autoAdvanceBatter: true,
  },
  coach_pitch: {
    mode: 'basic', gameType: 'coach_pitch', innings: 6, maxRunsPerHalfInning: 6,
    outsPerHalfInning: 3, ballsForWalk: null, strikesForStrikeout: null,
    maxPitchesPerBatter: 6, trackBalls: false, trackStrikes: true,
    trackPitches: true, autoAdvanceBatter: true,
  },
  kid_pitch: {
    mode: 'advanced', gameType: 'kid_pitch', innings: 6, maxRunsPerHalfInning: null,
    outsPerHalfInning: 3, ballsForWalk: 4, strikesForStrikeout: 3,
    maxPitchesPerBatter: null, trackBalls: true, trackStrikes: true,
    trackPitches: true, autoAdvanceBatter: true,
  },
  custom: {
    mode: 'advanced', gameType: 'custom', innings: 7, maxRunsPerHalfInning: null,
    outsPerHalfInning: 3, ballsForWalk: 4, strikesForStrikeout: 3,
    maxPitchesPerBatter: null, trackBalls: true, trackStrikes: true,
    trackPitches: true, autoAdvanceBatter: true,
  },
};

export interface AppBackup {
  version: number;
  exportedAt: string;
  lineups: Lineup[];
  games: GameState[];
  settings: AppSettings;
  presets: CustomPresets;
  schedule?: ScheduledGame[];
  seasons?: Season[];
}
