import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, DEFAULT_SETTINGS, GameState, Lineup } from '@/models/types';

const KEYS = {
  LINEUPS: '@batter_up:lineups',
  GAMES: '@batter_up:games',
  SETTINGS: '@batter_up:settings',
  ACTIVE_GAME: '@batter_up:active_game',
};

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export { generateId };

// ─── Lineups ─────────────────────────────────────────────────────────────────

export async function getLineups(): Promise<Lineup[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.LINEUPS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveLineup(lineup: Lineup): Promise<void> {
  const lineups = await getLineups();
  const idx = lineups.findIndex((l) => l.id === lineup.id);
  const updated = { ...lineup, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    lineups[idx] = updated;
  } else {
    lineups.push(updated);
  }
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

// ─── Games ───────────────────────────────────────────────────────────────────

export async function getGames(): Promise<GameState[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.GAMES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCompletedGame(game: GameState): Promise<void> {
  const games = await getGames();
  const idx = games.findIndex((g) => g.id === game.id);
  if (idx >= 0) {
    games[idx] = game;
  } else {
    games.push(game);
  }
  await AsyncStorage.setItem(KEYS.GAMES, JSON.stringify(games));
}

export async function getActiveGame(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ACTIVE_GAME);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveActiveGame(game: GameState): Promise<void> {
  await AsyncStorage.setItem(KEYS.ACTIVE_GAME, JSON.stringify(game));
}

export async function clearActiveGame(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.ACTIVE_GAME);
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
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
