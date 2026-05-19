import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import { EventType, GameEvent, GameRules, GameSetup, GameState, HalfInning, HitType } from '@/models/types';
import { clearActiveGame, generateId, saveActiveGame } from '@/services/storage';

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

interface GameContextValue {
  game: GameState | null;
  startGame: (setup: GameSetup) => void;
  recordBall: () => void;
  recordStrike: () => void;
  recordFoul: () => void;
  recordHit: (hitType?: HitType) => void;
  recordOut: () => void;
  recordStrikeout: () => void;
  recordWalk: () => void;
  recordHitByPitch: () => void;
  recordRunScored: (count?: number) => void;
  recordRbi: (count?: number) => void;
  recordEvent: (type: EventType, metadata?: Record<string, unknown>) => void;
  nextBatter: () => void;
  prevBatter: () => void;
  undoLastEvent: () => void;
  endHalfInning: () => void;
  adjustScore: (team: 'my' | 'opponent', delta: number) => void;
  endGame: () => void;
  updateGameSetup: (partial: Partial<GameSetup>) => void;
  restoreGame: (game: GameState) => void;
}

const GameContext = createContext<GameContextValue>({
  game: null,
  startGame: () => {},
  recordBall: () => {},
  recordStrike: () => {},
  recordFoul: () => {},
  recordHit: () => {},
  recordOut: () => {},
  recordStrikeout: () => {},
  recordWalk: () => {},
  recordHitByPitch: () => {},
  recordRunScored: () => {},
  recordRbi: () => {},
  recordEvent: () => {},
  nextBatter: () => {},
  prevBatter: () => {},
  undoLastEvent: () => {},
  endHalfInning: () => {},
  adjustScore: () => {},
  endGame: () => {},
  updateGameSetup: () => {},
  restoreGame: () => {},
});

function createEvent(
  gameId: string,
  playerId: string,
  eventType: EventType,
  inning: number,
  halfInning: HalfInning,
  metadata?: Record<string, unknown>
): GameEvent {
  return {
    id: generateId(),
    gameId,
    playerId,
    eventType,
    timestamp: new Date().toISOString(),
    inning,
    halfInning,
    metadata,
  };
}

function getActivePlayers(state: GameState) {
  return state.setup.lineupSnapshot.filter((p) => p.isActive);
}

function getCurrentPlayer(state: GameState) {
  const active = getActivePlayers(state);
  if (active.length === 0) return null;
  return active[state.currentBatterIndex % active.length];
}

function applyNextBatter(state: GameState): GameState {
  const active = getActivePlayers(state);
  if (active.length === 0) return state;
  const nextIndex = (state.currentBatterIndex + 1) % active.length;
  const currentPlayer = getCurrentPlayer(state);
  const event = createEvent(
    state.id,
    currentPlayer?.id ?? '',
    'next_batter',
    state.currentInning,
    state.halfInning
  );
  return {
    ...state,
    currentBatterIndex: nextIndex,
    balls: 0,
    strikes: 0,
    pitchCount: 0,
    events: [...state.events, event],
  };
}

function checkAutoAdvance(state: GameState, rules: GameRules): GameState {
  let next = state;

  if (next.outs >= rules.outsPerHalfInning) {
    next = applyEndHalfInning(next);
  }

  if (rules.maxRunsPerHalfInning !== null && next.runsThisHalfInning >= rules.maxRunsPerHalfInning) {
    next = applyEndHalfInning(next);
  }

  return next;
}

function applyEndHalfInning(state: GameState): GameState {
  // If already complete, don't advance further
  if (state.isComplete) return state;

  const rules = state.setup.rules;
  const event = createEvent(
    state.id,
    '',
    'half_inning_ended',
    state.currentInning,
    state.halfInning
  );

  // Update inning scores
  const scores = [...state.inningScores];
  const scoreIdx = scores.findIndex((s) => s.inning === state.currentInning);
  if (scoreIdx >= 0) {
    if (state.halfInning === 'top') {
      scores[scoreIdx] = { ...scores[scoreIdx], topRuns: state.runsThisHalfInning };
    } else {
      scores[scoreIdx] = { ...scores[scoreIdx], bottomRuns: state.runsThisHalfInning };
    }
  } else {
    scores.push({
      inning: state.currentInning,
      topRuns: state.halfInning === 'top' ? state.runsThisHalfInning : 0,
      bottomRuns: state.halfInning === 'bottom' ? state.runsThisHalfInning : 0,
    });
  }

  let nextInning = state.currentInning;
  let nextHalf: HalfInning = 'bottom';

  if (state.halfInning === 'top') {
    nextHalf = 'bottom';
  } else {
    nextInning = state.currentInning + 1;
    nextHalf = 'top';
  }

  // Auto-end game when all innings are complete
  const gameOver = nextInning > rules.innings;

  return {
    ...state,
    currentInning: nextInning,
    halfInning: nextHalf,
    outs: 0,
    balls: 0,
    strikes: 0,
    pitchCount: 0,
    runsThisHalfInning: 0,
    inningScores: scores,
    events: [...state.events, event],
    isComplete: gameOver,
    completedAt: gameOver ? new Date().toISOString() : state.completedAt,
  };
}

function gameReducer(state: GameState | null, action: GameAction): GameState | null {
  if (action.type === 'RESTORE') return action.payload;

  if (action.type === 'START_GAME') {
    const setup = action.payload;
    return {
      id: generateId(),
      setup,
      currentInning: 1,
      halfInning: setup.isHome ? 'bottom' : 'top',
      currentBatterIndex: 0,
      myScore: 0,
      opponentScore: 0,
      balls: 0,
      strikes: 0,
      outs: 0,
      runsThisHalfInning: 0,
      pitchCount: 0,
      inningScores: [],
      events: [],
      isComplete: false,
    };
  }

  if (!state) return state;
  const rules = state.setup.rules;

  switch (action.type) {
    case 'RECORD_EVENT': {
      const currentPlayer = getCurrentPlayer(state);
      const playerId = action.payload.playerId ?? currentPlayer?.id ?? '';
      const event = createEvent(
        state.id,
        playerId,
        action.payload.eventType,
        state.currentInning,
        state.halfInning,
        action.payload.metadata
      );

      let next: GameState = { ...state, events: [...state.events, event] };

      switch (action.payload.eventType) {
        case 'ball': {
          const newBalls = state.balls + 1;
          if (rules.ballsForWalk !== null && newBalls >= rules.ballsForWalk) {
            const walkEvent = createEvent(state.id, playerId, 'walk', state.currentInning, state.halfInning);
            next = { ...next, balls: 0, strikes: 0, pitchCount: state.pitchCount + 1, events: [...next.events, walkEvent] };
            next = applyNextBatter(next);
          } else {
            next = { ...next, balls: newBalls, pitchCount: state.pitchCount + 1 };
          }
          break;
        }
        case 'strike': {
          const newStrikes = state.strikes + 1;
          if (rules.strikesForStrikeout !== null && newStrikes >= rules.strikesForStrikeout) {
            const strikeoutEvent = createEvent(state.id, playerId, 'strikeout', state.currentInning, state.halfInning);
            next = { ...next, outs: state.outs + 1, balls: 0, strikes: 0, pitchCount: state.pitchCount + 1, events: [...next.events, strikeoutEvent] };
            next = applyNextBatter(next);
            next = checkAutoAdvance(next, rules);
          } else {
            next = { ...next, strikes: newStrikes, pitchCount: state.pitchCount + 1 };
          }
          break;
        }
        case 'foul': {
          const newStrikes = state.strikes < (rules.strikesForStrikeout ?? 3) - 1 ? state.strikes + 1 : state.strikes;
          next = { ...next, strikes: newStrikes, pitchCount: state.pitchCount + 1 };
          break;
        }
        case 'hit':
        case 'single':
        case 'double':
        case 'triple':
        case 'homerun': {
          next = { ...next, balls: 0, strikes: 0, pitchCount: 0 };
          if (action.payload.eventType === 'homerun') {
            next = { ...next, myScore: state.myScore + 1, runsThisHalfInning: state.runsThisHalfInning + 1 };
          }
          if (rules.autoAdvanceBatter) next = applyNextBatter(next);
          break;
        }
        case 'out': {
          next = { ...next, outs: state.outs + 1, balls: 0, strikes: 0, pitchCount: 0 };
          if (rules.autoAdvanceBatter) next = applyNextBatter(next);
          next = checkAutoAdvance(next, rules);
          break;
        }
        case 'walk':
        case 'hit_by_pitch':
        case 'reached_on_error':
        case 'fielders_choice': {
          next = { ...next, balls: 0, strikes: 0, pitchCount: 0 };
          if (rules.autoAdvanceBatter) next = applyNextBatter(next);
          break;
        }
        case 'sacrifice': {
          next = { ...next, outs: state.outs + 1, balls: 0, strikes: 0, pitchCount: 0 };
          if (rules.autoAdvanceBatter) next = applyNextBatter(next);
          next = checkAutoAdvance(next, rules);
          break;
        }
        case 'run_scored': {
          const count = (action.payload.metadata?.count as number) ?? 1;
          next = { ...next, myScore: state.myScore + count, runsThisHalfInning: state.runsThisHalfInning + count };
          next = checkAutoAdvance(next, rules);
          break;
        }
        case 'score_adjusted': {
          const team = action.payload.metadata?.team as 'my' | 'opponent';
          const delta = action.payload.metadata?.delta as number;
          if (team === 'my') next = { ...next, myScore: Math.max(0, state.myScore + delta) };
          else next = { ...next, opponentScore: Math.max(0, state.opponentScore + delta) };
          break;
        }
      }

      return next;
    }

    case 'NEXT_BATTER':
      return applyNextBatter(state);

    case 'PREV_BATTER': {
      const active = getActivePlayers(state);
      if (active.length === 0) return state;
      const prevIndex = (state.currentBatterIndex - 1 + active.length) % active.length;
      return { ...state, currentBatterIndex: prevIndex, balls: 0, strikes: 0, pitchCount: 0 };
    }

    case 'UNDO': {
      if (state.events.length === 0) return state;
      const newEvents = state.events.slice(0, -1);
      const lastEvent = state.events[state.events.length - 1];

      let next = { ...state, events: newEvents };

      switch (lastEvent.eventType) {
        case 'ball':
          next = { ...next, balls: Math.max(0, state.balls - 1) };
          break;
        case 'strike':
          next = { ...next, strikes: Math.max(0, state.strikes - 1) };
          break;
        case 'foul':
          next = { ...next, strikes: Math.max(0, state.strikes - 1) };
          break;
        case 'out':
          next = { ...next, outs: Math.max(0, state.outs - 1) };
          break;
        case 'run_scored':
          next = { ...next, myScore: Math.max(0, state.myScore - 1), runsThisHalfInning: Math.max(0, state.runsThisHalfInning - 1) };
          break;
        case 'next_batter': {
          const active = getActivePlayers(state);
          const prevIndex = (state.currentBatterIndex - 1 + active.length) % active.length;
          next = { ...next, currentBatterIndex: prevIndex, balls: 0, strikes: 0, pitchCount: 0 };
          break;
        }
        case 'half_inning_ended': {
          const prevHalf: HalfInning = state.halfInning === 'top' ? 'bottom' : 'top';
          const prevInning = prevHalf === 'bottom' ? state.currentInning : state.currentInning - 1;
          next = { ...next, halfInning: prevHalf, currentInning: Math.max(1, prevInning), isComplete: false, completedAt: undefined };
          break;
        }
      }

      return next;
    }

    case 'END_HALF_INNING':
      return applyEndHalfInning(state);

    case 'ADJUST_SCORE': {
      if (action.payload.team === 'my') {
        return { ...state, myScore: Math.max(0, state.myScore + action.payload.delta) };
      }
      return { ...state, opponentScore: Math.max(0, state.opponentScore + action.payload.delta) };
    }

    case 'END_GAME':
      return { ...state, isComplete: true, completedAt: new Date().toISOString() };

    case 'UPDATE_SETUP':
      return { ...state, setup: { ...state.setup, ...action.payload } };

    default:
      return state;
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [game, dispatch] = useReducer(gameReducer, null);

  useEffect(() => {
    if (game && !game.isComplete) {
      saveActiveGame(game).catch(() => {});
    }
  }, [game]);

  const startGame = useCallback((setup: GameSetup) => {
    dispatch({ type: 'START_GAME', payload: setup });
  }, []);

  const recordEvent = useCallback((type: EventType, metadata?: Record<string, unknown>) => {
    dispatch({ type: 'RECORD_EVENT', payload: { eventType: type, metadata } });
  }, []);

  const recordBall = useCallback(() => recordEvent('ball'), [recordEvent]);
  const recordStrike = useCallback(() => recordEvent('strike'), [recordEvent]);
  const recordFoul = useCallback(() => recordEvent('foul'), [recordEvent]);
  const recordHit = useCallback((hitType?: HitType) => recordEvent(hitType ?? 'hit'), [recordEvent]);
  const recordOut = useCallback(() => recordEvent('out'), [recordEvent]);
  const recordStrikeout = useCallback(() => recordEvent('strikeout'), [recordEvent]);
  const recordWalk = useCallback(() => recordEvent('walk'), [recordEvent]);
  const recordHitByPitch = useCallback(() => recordEvent('hit_by_pitch'), [recordEvent]);
  const recordRunScored = useCallback((count = 1) => recordEvent('run_scored', { count }), [recordEvent]);
  const recordRbi = useCallback((count = 1) => recordEvent('rbi', { count }), [recordEvent]);
  const nextBatter = useCallback(() => dispatch({ type: 'NEXT_BATTER' }), []);
  const prevBatter = useCallback(() => dispatch({ type: 'PREV_BATTER' }), []);
  const undoLastEvent = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const endHalfInning = useCallback(() => dispatch({ type: 'END_HALF_INNING' }), []);
  const adjustScore = useCallback((team: 'my' | 'opponent', delta: number) => {
    dispatch({ type: 'ADJUST_SCORE', payload: { team, delta } });
  }, []);
  const endGame = useCallback(() => {
    dispatch({ type: 'END_GAME' });
    clearActiveGame().catch(() => {});
  }, []);
  const updateGameSetup = useCallback((partial: Partial<GameSetup>) => {
    dispatch({ type: 'UPDATE_SETUP', payload: partial });
  }, []);
  const restoreGame = useCallback((g: GameState) => {
    dispatch({ type: 'RESTORE', payload: g });
  }, []);

  return (
    <GameContext.Provider value={{
      game,
      startGame, recordBall, recordStrike, recordFoul, recordHit,
      recordOut, recordStrikeout, recordWalk, recordHitByPitch,
      recordRunScored, recordRbi, recordEvent,
      nextBatter, prevBatter, undoLastEvent, endHalfInning,
      adjustScore, endGame, updateGameSetup, restoreGame,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
