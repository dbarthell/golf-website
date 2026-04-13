import { useState, useCallback } from 'react';
import { usePuttLog, type PuttEntry } from './usePuttLog';

const GAME_HOLE_KEY = 'puttlog-game-hole';

function readCurrentHole(): number {
  try {
    const raw = localStorage.getItem(GAME_HOLE_KEY);
    if (raw) {
      const n = parseInt(raw, 10);
      if (n >= 1 && n <= 18) return n;
    }
  } catch { /* ignore */ }
  return 1;
}

export function useGameMode() {
  const {
    activeGameRoundId,
    activeGameRound,
    startGame: startGameBase,
    endGame,
    deleteGameRound,
    addPutt,
    deletePutt,
    allGameRoundIds,
    getRound,
  } = usePuttLog();

  const [currentHole, setCurrentHole] = useState<number>(readCurrentHole);

  const startGame = useCallback((): string => {
    const id = startGameBase();
    setCurrentHole(1);
    return id;
  }, [startGameBase]);

  const advanceHole = useCallback(() => {
    setCurrentHole(prev => {
      const next = Math.min(18, prev + 1);
      localStorage.setItem(GAME_HOLE_KEY, String(next));
      return next;
    });
  }, []);

  const goToHole = useCallback((n: number) => {
    const clamped = Math.max(1, Math.min(18, n));
    localStorage.setItem(GAME_HOLE_KEY, String(clamped));
    setCurrentHole(clamped);
  }, []);

  const logGamePutt = useCallback(
    (entry: Omit<PuttEntry, 'id' | 'timestamp' | 'hole'>) => {
      if (!activeGameRoundId) return;
      addPutt({ ...entry, hole: currentHole }, activeGameRoundId);
    },
    [activeGameRoundId, currentHole, addPutt],
  );

  return {
    activeGameRoundId,
    activeGameRound,
    currentHole,
    goToHole,
    advanceHole,
    logGamePutt,
    startGame,
    endGame,
    deleteGameRound,
    addPutt,
    deletePutt,
    allGameRoundIds,
    getRound,
  };
}
