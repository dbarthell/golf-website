import { useState, useCallback } from 'react';
import type { BagData, BagClub, BagEntry, BagSettings } from '../lib/bag';
import { emptyBagData, DEFAULT_CLUBS } from '../lib/bag';
import { syncBagToWidget } from '../lib/bagBridge';

const STORAGE_KEY = 'bag-data';

function readBagData(): BagData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BagData;
      // Ensure settings exist (migration for older saves)
      if (!parsed.settings) parsed.settings = { pelzOffset: 5 };
      // Migrate old fixed-yard offset (was ≤50 yds) to percentage default
      if (parsed.settings.pelzOffset > 30) parsed.settings.pelzOffset = 5;
      // Always honour hasPelz from DEFAULT_CLUBS for known clubs —
      // stale localStorage data can have the wrong value after a code change.
      const migratedClubs = parsed.clubs.map(club => {
        const def = DEFAULT_CLUBS.find(d => d.id === club.id);
        return def ? { ...club, hasPelz: def.hasPelz } : club;
      });
      const migrated = { ...parsed, clubs: migratedClubs };
      // Write back so the corrected value persists
      writeBagData(migrated);
      return migrated;
    }
  } catch (_) {
    // ignore parse errors
  }
  return emptyBagData();
}

function writeBagData(data: BagData) {
  const json = JSON.stringify(data);
  localStorage.setItem(STORAGE_KEY, json);
  syncBagToWidget(json); // fire-and-forget to iOS App Group
}

export function useBagData() {
  const [bagData, setBagData] = useState<BagData>(readBagData);

  /** Update (or insert) the entry for a given club. Saves on blur pattern — call on each field change. */
  const setEntry = useCallback((entry: BagEntry) => {
    setBagData(prev => {
      const others = prev.entries.filter(e => e.clubId !== entry.clubId);
      const next: BagData = { ...prev, entries: [...others, entry] };
      writeBagData(next);
      return next;
    });
  }, []);

  /** Remove the entry for a club (clears all yardages). */
  const clearEntry = useCallback((clubId: string) => {
    setBagData(prev => {
      const next: BagData = {
        ...prev,
        entries: prev.entries.filter(e => e.clubId !== clubId),
      };
      writeBagData(next);
      return next;
    });
  }, []);

  /** Add a club to the bag (if not already present). */
  const addClub = useCallback((club: BagClub) => {
    setBagData(prev => {
      if (prev.clubs.some(c => c.id === club.id)) return prev;
      const clubs = [...prev.clubs, club].sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.id.localeCompare(b.id);
      });
      const next: BagData = { ...prev, clubs };
      writeBagData(next);
      return next;
    });
  }, []);

  /** Remove a club and its entry from the bag. */
  const removeClub = useCallback((clubId: string) => {
    setBagData(prev => {
      const next: BagData = {
        ...prev,
        clubs: prev.clubs.filter(c => c.id !== clubId),
        entries: prev.entries.filter(e => e.clubId !== clubId),
      };
      writeBagData(next);
      return next;
    });
  }, []);

  /** Update global settings (e.g. pelzOffset). */
  const updateSettings = useCallback((settings: Partial<BagSettings>) => {
    setBagData(prev => {
      const next: BagData = {
        ...prev,
        settings: { ...prev.settings, ...settings },
      };
      writeBagData(next);
      return next;
    });
  }, []);

  /** Get the entry for a specific club, or undefined if none. */
  const getEntry = useCallback(
    (clubId: string): BagEntry | undefined => {
      return bagData.entries.find(e => e.clubId === clubId);
    },
    [bagData.entries],
  );

  /** Clubs sorted by order, filtered to only those with entries (for the reference view). */
  const calibratedClubs = bagData.clubs
    .filter(c => bagData.entries.some(e => e.clubId === c.id && e.fullTotal > 0))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  /** All clubs sorted by order, reversed (LW → Driver, matching the reference view). */
  const allClubs = [...bagData.clubs]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .reverse();

  return {
    bagData,
    allClubs,
    calibratedClubs,
    setEntry,
    clearEntry,
    addClub,
    removeClub,
    updateSettings,
    getEntry,
  };
}
