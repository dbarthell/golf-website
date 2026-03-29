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
}

export interface PuttRound {
  roundId: string;
  entries: PuttEntry[];
}

// ── Storage keys ──────────────────────────────────────────────────────────────

const INDEX_KEY = 'puttlog-index';
const roundKey = (id: string) => `puttlog-round-${id}`;

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

function readIndex(): string[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
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

function writeRound(roundId: string, entries: PuttEntry[]): void {
  localStorage.setItem(roundKey(roundId), JSON.stringify(entries));
}

function upsertIndex(roundId: string): void {
  const idx = readIndex();
  if (!idx.includes(roundId)) {
    const next = [...idx, roundId].sort();
    localStorage.setItem(INDEX_KEY, JSON.stringify(next));
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

  const addPutt = useCallback(
    (entry: Omit<PuttEntry, 'id' | 'timestamp'>) => {
      const roundId = todayRoundId();
      const entries = readRound(roundId);
      entries.push({ ...entry, id: genId(), timestamp: Date.now() });
      writeRound(roundId, entries);
      upsertIndex(roundId);
      setTick(t => t + 1);
    },
    [],
  );

  const deletePutt = useCallback((roundId: string, entryId: string) => {
    const entries = readRound(roundId).filter(e => e.id !== entryId);
    writeRound(roundId, entries);
    setTick(t => t + 1);
  }, []);

  // Re-read from localStorage whenever tick changes
  void tick;

  const todayId = todayRoundId();
  // Newest-first list of all round IDs that have been logged
  const allRoundIds = readIndex().slice().sort().reverse();
  const todayEntries = readRound(todayId);
  const currentRound: PuttRound = { roundId: todayId, entries: todayEntries };
  const currentStreak = computeStreak(todayEntries);

  const getRound = (roundId: string): PuttRound => ({
    roundId,
    entries: readRound(roundId),
  });

  return { addPutt, deletePutt, allRoundIds, currentRound, getRound, todayId, currentStreak };
}
