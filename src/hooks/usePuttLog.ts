import { useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PuttOutcome = 'made' | 'short' | 'long' | 'left' | 'right';

export interface PuttEntry {
  id: string;
  timestamp: number;
  distance: number;
  slope: number;
  stimp: number;
  clock: string | null;
  outcome: PuttOutcome;
  hole?: number; // 1–18, present only for game-mode putts
}

export interface PuttRound {
  roundId: string;
  mode: 'practice' | 'game';
  startedAt?: number;   // epoch ms, for game rounds
  completedAt?: number; // epoch ms, set when user ends the round
  entries: PuttEntry[];
}

// ── Storage keys ──────────────────────────────────────────────────────────────

const INDEX_KEY = 'puttlog-index';
const GAME_INDEX_KEY = 'puttlog-game-index';
const ACTIVE_GAME_KEY = 'puttlog-active-game';
const roundKey = (id: string) => `puttlog-round-${id}`;
const roundMetaKey = (id: string) => `puttlog-meta-${id}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

export function todayRoundId(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function gameRoundId(): string {
  return 'game-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function readIndex(): string[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch { /* ignore */ }
  return [];
}

function readGameIndex(): string[] {
  try {
    const raw = localStorage.getItem(GAME_INDEX_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch { /* ignore */ }
  return [];
}

function readRound(roundId: string): PuttEntry[] {
  try {
    const raw = localStorage.getItem(roundKey(roundId));
    if (raw) return JSON.parse(raw) as PuttEntry[];
  } catch { /* ignore */ }
  return [];
}

function readRoundMeta(roundId: string): Omit<PuttRound, 'entries'> {
  try {
    const raw = localStorage.getItem(roundMetaKey(roundId));
    if (raw) return JSON.parse(raw) as Omit<PuttRound, 'entries'>;
  } catch { /* ignore */ }
  // Fallback for old practice rounds that have no meta
  return { roundId, mode: 'practice' };
}

function writeRound(roundId: string, entries: PuttEntry[]): void {
  localStorage.setItem(roundKey(roundId), JSON.stringify(entries));
}

function writeRoundMeta(meta: Omit<PuttRound, 'entries'>): void {
  localStorage.setItem(roundMetaKey(meta.roundId), JSON.stringify(meta));
}

function upsertIndex(roundId: string): void {
  const idx = readIndex();
  if (!idx.includes(roundId)) {
    const next = [...idx, roundId].sort();
    localStorage.setItem(INDEX_KEY, JSON.stringify(next));
  }
}

function upsertGameIndex(roundId: string): void {
  const idx = readGameIndex();
  if (!idx.includes(roundId)) {
    // newest first — prepend
    localStorage.setItem(GAME_INDEX_KEY, JSON.stringify([roundId, ...idx]));
  }
}

// ── Streak helper ─────────────────────────────────────────────────────────────

const STREAK_MIN_DISTANCE = 5; // only count putts ≥ 5 ft toward a streak

function computeStreak(entries: PuttEntry[]): number {
  let streak = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.distance < STREAK_MIN_DISTANCE) continue; // skip short putts
    if (e.outcome === 'made') streak++;
    else break;
  }
  return streak;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePuttLog() {
  const [tick, setTick] = useState(0);

  const deletePutt = useCallback((roundId: string, entryId: string) => {
    const entries = readRound(roundId).filter(e => e.id !== entryId);
    writeRound(roundId, entries);
    setTick(t => t + 1);
  }, []);

  // Re-read from localStorage whenever tick changes
  void tick;

  const todayId = todayRoundId();
  // Newest-first list of all practice round IDs that have been logged
  const allRoundIds = readIndex().slice().sort().reverse();
  const todayEntries = readRound(todayId);
  const currentRound: PuttRound = { roundId: todayId, mode: 'practice', entries: todayEntries };
  const currentStreak = computeStreak(todayEntries);

  const getRound = (roundId: string): PuttRound => {
    const meta = readRoundMeta(roundId);
    return { ...meta, entries: readRound(roundId) };
  };

  // ── Game round management ─────────────────────────────────────────────────

  const activeGameRoundId: string | null =
    localStorage.getItem(ACTIVE_GAME_KEY) || null;

  const activeGameRound: PuttRound | null = activeGameRoundId
    ? getRound(activeGameRoundId)
    : null;

  const allGameRoundIds = readGameIndex(); // newest first

  const startGame = useCallback((): string => {
    const id = gameRoundId();
    const meta: Omit<PuttRound, 'entries'> = {
      roundId: id,
      mode: 'game',
      startedAt: Date.now(),
    };
    writeRound(id, []);
    writeRoundMeta(meta);
    upsertGameIndex(id);
    localStorage.setItem(ACTIVE_GAME_KEY, id);
    localStorage.setItem('puttlog-game-hole', '1');
    setTick(t => t + 1);
    return id;
  }, []);

  const endGame = useCallback((roundId: string): void => {
    const meta = readRoundMeta(roundId);
    writeRoundMeta({ ...meta, completedAt: Date.now() });
    localStorage.removeItem(ACTIVE_GAME_KEY);
    localStorage.removeItem('puttlog-game-hole');
    setTick(t => t + 1);
  }, []);

  const deleteGameRound = useCallback((roundId: string): void => {
    localStorage.removeItem(roundKey(roundId));
    localStorage.removeItem(roundMetaKey(roundId));
    // Remove from game index
    const idx = readGameIndex().filter(id => id !== roundId);
    localStorage.setItem(GAME_INDEX_KEY, JSON.stringify(idx));
    // If this was the active game, clear it
    if (localStorage.getItem(ACTIVE_GAME_KEY) === roundId) {
      localStorage.removeItem(ACTIVE_GAME_KEY);
      localStorage.removeItem('puttlog-game-hole');
    }
    setTick(t => t + 1);
  }, []);

  const addPutt = useCallback(
    (entry: Omit<PuttEntry, 'id' | 'timestamp'>, targetRoundId?: string) => {
      const roundId = targetRoundId ?? todayRoundId();
      const entries = readRound(roundId);
      entries.push({ ...entry, id: genId(), timestamp: Date.now() });
      writeRound(roundId, entries);
      if (!targetRoundId) {
        // practice round
        upsertIndex(roundId);
      }
      setTick(t => t + 1);
    },
    [],
  );

  return {
    addPutt, deletePutt, allRoundIds, currentRound, getRound, todayId, currentStreak,
    startGame, endGame, deleteGameRound, activeGameRoundId, activeGameRound, allGameRoundIds,
  };
}
