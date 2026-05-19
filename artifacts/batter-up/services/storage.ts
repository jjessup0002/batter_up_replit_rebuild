import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import {
  AppBackup, AppSettings, CustomPresets, DEFAULT_SETTINGS,
  GAME_RULE_PRESETS, GameState, Lineup, ScheduledGame,
} from '@/models/types';

const KEYS = {
  LINEUPS: '@batter_up:lineups',
  GAMES: '@batter_up:games',
  SETTINGS: '@batter_up:settings',
  ACTIVE_GAME: '@batter_up:active_game',
  PRESETS: '@batter_up:presets',
  SCHEDULE: '@batter_up:schedule',
};

const AUTO_BACKUP_FILENAME = 'batter-up-auto-backup.json';

function autoBackupPath(): string | null {
  if (!FileSystem.documentDirectory) return null;
  return FileSystem.documentDirectory + AUTO_BACKUP_FILENAME;
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// ─── Lineups ──────────────────────────────────────────────────────────────────

export async function getLineups(): Promise<Lineup[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.LINEUPS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveLineup(lineup: Lineup): Promise<void> {
  const lineups = await getLineups();
  const idx = lineups.findIndex((l) => l.id === lineup.id);
  const updated = { ...lineup, updatedAt: new Date().toISOString() };
  if (idx >= 0) lineups[idx] = updated; else lineups.push(updated);
  await AsyncStorage.setItem(KEYS.LINEUPS, JSON.stringify(lineups));
}

export async function deleteLineup(id: string): Promise<void> {
  const lineups = await getLineups();
  await AsyncStorage.setItem(KEYS.LINEUPS, JSON.stringify(lineups.filter((l) => l.id !== id)));
}

export async function markLineupUsed(id: string): Promise<void> {
  const lineups = await getLineups();
  const idx = lineups.findIndex((l) => l.id === id);
  if (idx >= 0) {
    lineups[idx] = { ...lineups[idx], lastUsedAt: new Date().toISOString() };
    await AsyncStorage.setItem(KEYS.LINEUPS, JSON.stringify(lineups));
  }
}

// ─── Games ────────────────────────────────────────────────────────────────────

export async function getGames(): Promise<GameState[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.GAMES);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveCompletedGame(game: GameState): Promise<void> {
  const games = await getGames();
  const idx = games.findIndex((g) => g.id === game.id);
  if (idx >= 0) games[idx] = game; else games.push(game);
  await AsyncStorage.setItem(KEYS.GAMES, JSON.stringify(games));
}

export async function deleteGame(id: string): Promise<void> {
  const games = await getGames();
  await AsyncStorage.setItem(KEYS.GAMES, JSON.stringify(games.filter((g) => g.id !== id)));
}

export async function getActiveGame(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ACTIVE_GAME);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function saveActiveGame(game: GameState): Promise<void> {
  await AsyncStorage.setItem(KEYS.ACTIVE_GAME, JSON.stringify(game));
}

export async function clearActiveGame(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.ACTIVE_GAME);
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await saveSettings(updated);
  return updated;
}

// ─── Game Type Presets ────────────────────────────────────────────────────────

export async function getCustomPresets(): Promise<CustomPresets> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PRESETS);
    if (!raw) return { ...GAME_RULE_PRESETS };
    const saved = JSON.parse(raw) as Partial<CustomPresets>;
    return {
      tball: { ...GAME_RULE_PRESETS.tball, ...saved.tball },
      coach_pitch: { ...GAME_RULE_PRESETS.coach_pitch, ...saved.coach_pitch },
      kid_pitch: { ...GAME_RULE_PRESETS.kid_pitch, ...saved.kid_pitch },
      custom: { ...GAME_RULE_PRESETS.custom, ...saved.custom },
    };
  } catch { return { ...GAME_RULE_PRESETS }; }
}

export async function saveCustomPresets(presets: CustomPresets): Promise<void> {
  await AsyncStorage.setItem(KEYS.PRESETS, JSON.stringify(presets));
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export async function getSchedule(): Promise<ScheduledGame[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SCHEDULE);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveScheduledGame(game: ScheduledGame): Promise<void> {
  const schedule = await getSchedule();
  const idx = schedule.findIndex((s) => s.id === game.id);
  if (idx >= 0) schedule[idx] = game; else schedule.push(game);
  await AsyncStorage.setItem(KEYS.SCHEDULE, JSON.stringify(schedule));
}

export async function deleteScheduledGame(id: string): Promise<void> {
  const schedule = await getSchedule();
  await AsyncStorage.setItem(KEYS.SCHEDULE, JSON.stringify(schedule.filter((s) => s.id !== id)));
}

export async function markScheduledGameComplete(id: string, completedGameId: string): Promise<void> {
  const schedule = await getSchedule();
  const idx = schedule.findIndex((s) => s.id === id);
  if (idx >= 0) {
    schedule[idx] = { ...schedule[idx], status: 'completed', completedGameId };
    await AsyncStorage.setItem(KEYS.SCHEDULE, JSON.stringify(schedule));
  }
}

export async function getNextScheduledGame(): Promise<ScheduledGame | null> {
  const schedule = await getSchedule();
  const now = new Date().toISOString().slice(0, 10);
  const upcoming = schedule
    .filter((s) => s.status === 'upcoming' && s.date >= now)
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
}

// ─── Review tracking ──────────────────────────────────────────────────────────

export async function incrementGameSessions(): Promise<number> {
  const s = await getSettings();
  const count = (s.gameSessionsCompleted ?? 0) + 1;
  await saveSettings({ ...s, gameSessionsCompleted: count });
  return count;
}

export function shouldShowReviewPrompt(s: AppSettings): boolean {
  if (s.hasClickedReview) return false;
  const count = s.gameSessionsCompleted ?? 0;
  if (count <= 0) return false;
  // Show at 3rd game, then every 4 games after each decline
  if (count === 3) return true;
  if (s.reviewDeclineCount > 0 && count > 3) {
    return (count - 3) % 4 === 0;
  }
  return false;
}

// ─── Backup ───────────────────────────────────────────────────────────────────

export async function getBackupData(): Promise<AppBackup> {
  const [lineups, games, settings, presets, schedule] = await Promise.all([
    getLineups(), getGames(), getSettings(), getCustomPresets(), getSchedule(),
  ]);
  return { version: 1, exportedAt: new Date().toISOString(), lineups, games, settings, presets, schedule };
}

export async function restoreFromBackup(backup: AppBackup): Promise<void> {
  if (!backup || backup.version !== 1) throw new Error('Invalid or incompatible backup file.');
  await Promise.all([
    AsyncStorage.setItem(KEYS.LINEUPS, JSON.stringify(backup.lineups ?? [])),
    AsyncStorage.setItem(KEYS.GAMES, JSON.stringify(backup.games ?? [])),
    AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(backup.settings ?? DEFAULT_SETTINGS)),
    AsyncStorage.setItem(KEYS.PRESETS, JSON.stringify(backup.presets ?? GAME_RULE_PRESETS)),
    AsyncStorage.setItem(KEYS.SCHEDULE, JSON.stringify(backup.schedule ?? [])),
  ]);
}

// ─── Auto-Backup ──────────────────────────────────────────────────────────────

export async function performAutoBackup(): Promise<void> {
  const path = autoBackupPath();
  if (!path) return;
  const data = await getBackupData();
  await FileSystem.writeAsStringAsync(path, JSON.stringify(data), {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

export async function checkForAutoBackup(): Promise<AppBackup | null> {
  const path = autoBackupPath();
  if (!path) return null;
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const json = await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.UTF8 });
    const backup = JSON.parse(json) as AppBackup;
    return backup.version === 1 ? backup : null;
  } catch { return null; }
}

export async function deleteAutoBackup(): Promise<void> {
  const path = autoBackupPath();
  if (!path) return;
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) await FileSystem.deleteAsync(path);
  } catch {}
}
