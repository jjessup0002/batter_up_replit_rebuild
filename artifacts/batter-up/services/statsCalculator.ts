import { GameEvent, GameState, Player, PlayerStats } from '@/models/types';

export function calculatePlayerStats(
  playerId: string,
  playerName: string,
  games: GameState[]
): PlayerStats {
  const stats: PlayerStats = {
    playerId,
    playerName,
    gamesPlayed: 0,
    plateAppearances: 0,
    atBats: 0,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    runs: 0,
    rbis: 0,
    walks: 0,
    strikeouts: 0,
    hitByPitch: 0,
    reachedOnError: 0,
    sacrifices: 0,
    totalBases: 0,
    battingAverage: 0,
    onBasePercentage: 0,
    sluggingPercentage: 0,
    ops: 0,
  };

  for (const game of games) {
    const playerEvents = game.events.filter((e) => e.playerId === playerId);
    if (playerEvents.length === 0) continue;
    stats.gamesPlayed++;

    for (const event of playerEvents) {
      switch (event.eventType) {
        case 'single':
          stats.plateAppearances++;
          stats.atBats++;
          stats.hits++;
          stats.singles++;
          stats.totalBases += 1;
          break;
        case 'double':
          stats.plateAppearances++;
          stats.atBats++;
          stats.hits++;
          stats.doubles++;
          stats.totalBases += 2;
          break;
        case 'triple':
          stats.plateAppearances++;
          stats.atBats++;
          stats.hits++;
          stats.triples++;
          stats.totalBases += 3;
          break;
        case 'homerun':
          stats.plateAppearances++;
          stats.atBats++;
          stats.hits++;
          stats.homeRuns++;
          stats.totalBases += 4;
          break;
        case 'hit':
          stats.plateAppearances++;
          stats.atBats++;
          stats.hits++;
          stats.singles++;
          stats.totalBases += 1;
          break;
        case 'out':
        case 'strikeout':
          stats.plateAppearances++;
          stats.atBats++;
          if (event.eventType === 'strikeout') stats.strikeouts++;
          break;
        case 'walk':
          stats.plateAppearances++;
          stats.walks++;
          break;
        case 'hit_by_pitch':
          stats.plateAppearances++;
          stats.hitByPitch++;
          break;
        case 'reached_on_error':
          stats.plateAppearances++;
          stats.atBats++;
          stats.reachedOnError++;
          break;
        case 'sacrifice':
          stats.plateAppearances++;
          stats.sacrifices++;
          break;
        case 'run_scored':
          stats.runs++;
          break;
        case 'rbi':
          stats.rbis += (event.metadata?.count as number) ?? 1;
          break;
      }
    }
  }

  if (stats.atBats > 0) {
    stats.battingAverage = stats.hits / stats.atBats;
    stats.sluggingPercentage = stats.totalBases / stats.atBats;
  }
  const obpDenom = stats.atBats + stats.walks + stats.hitByPitch + stats.sacrifices;
  if (obpDenom > 0) {
    stats.onBasePercentage = (stats.hits + stats.walks + stats.hitByPitch) / obpDenom;
  }
  stats.ops = stats.onBasePercentage + stats.sluggingPercentage;

  return stats;
}

export function formatStat(value: number, decimals = 3): string {
  if (value === 0) return '.000';
  return value.toFixed(decimals).replace(/^0/, '');
}

export function getTopPerformers(
  games: GameState[],
  players: { id: string; name: string }[]
): { hits: PlayerStats | null; runs: PlayerStats | null; rbis: PlayerStats | null } {
  const allStats = players.map((p) => calculatePlayerStats(p.id, p.name, games));

  const byHits = [...allStats].sort((a, b) => b.hits - a.hits);
  const byRuns = [...allStats].sort((a, b) => b.runs - a.runs);
  const byRbis = [...allStats].sort((a, b) => b.rbis - a.rbis);

  return {
    hits: byHits[0]?.hits > 0 ? byHits[0] : null,
    runs: byRuns[0]?.runs > 0 ? byRuns[0] : null,
    rbis: byRbis[0]?.rbis > 0 ? byRbis[0] : null,
  };
}
