import { useState, useCallback } from 'react';
import type { WedgeCalibrationData, WedgeEntry, WedgeClubId, WedgePosition } from '../lib/wedge';
import { deriveAllFromAnchor, deriveAllFromTwoAnchors, emptyCalibration, POSITION_ORDER } from '../lib/wedge';

const STORAGE_KEY = 'wedge-cal';

/**
 * Normalise anchors from the old string format { gw: 'full' }
 * to the new array format { gw: ['full'] }.
 */
function normaliseAnchors(
  raw: Record<string, unknown>,
): WedgeCalibrationData['anchors'] {
  const result: WedgeCalibrationData['anchors'] = {};
  for (const [clubId, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      result[clubId as WedgeClubId] = [value as WedgePosition];
    } else if (Array.isArray(value)) {
      result[clubId as WedgeClubId] = value as WedgePosition[];
    }
  }
  return result;
}

/**
 * Migrate old 4-position data and normalise anchor format.
 */
function migrateCalibration(data: WedgeCalibrationData): WedgeCalibrationData {
  // Normalise anchors to array format
  const anchors = normaliseAnchors(data.anchors as Record<string, unknown>);
  let entries = [...data.entries];
  let changed = JSON.stringify(anchors) !== JSON.stringify(data.anchors);

  for (const [clubId, anchorPositions] of Object.entries(anchors) as [WedgeClubId, WedgePosition[]][]) {
    const clubEntries = entries.filter(e => e.clubId === clubId);
    const hasAll = POSITION_ORDER.every(pos => clubEntries.some(e => e.clockPosition === pos));
    if (!hasAll && anchorPositions.length > 0) {
      const [pos1, pos2] = anchorPositions;
      const entry1 = clubEntries.find(e => e.clockPosition === pos1);
      if (entry1) {
        let derived: WedgeEntry[];
        if (pos2) {
          const entry2 = clubEntries.find(e => e.clockPosition === pos2);
          derived = entry2
            ? deriveAllFromTwoAnchors(clubId, pos1, entry1.yards, pos2, entry2.yards)
            : deriveAllFromAnchor(clubId, pos1, entry1.yards);
        } else {
          derived = deriveAllFromAnchor(clubId, pos1, entry1.yards);
        }
        entries = [...entries.filter(e => e.clubId !== clubId), ...derived];
        changed = true;
      }
    }
  }

  if (changed) {
    const next: WedgeCalibrationData = { entries, anchors };
    writeCalibration(next);
    return next;
  }
  return { ...data, anchors };
}

function readCalibration(): WedgeCalibrationData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrateCalibration(JSON.parse(raw) as WedgeCalibrationData);
  } catch (_) {
    // ignore
  }
  return emptyCalibration();
}

function writeCalibration(data: WedgeCalibrationData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useWedgeCalibration() {
  const [calibration, setCalibration] = useState<WedgeCalibrationData>(readCalibration);

  /**
   * Set 1 or 2 anchors for a club and re-derive all entries.
   * Two anchors uses linear interpolation for better accuracy.
   */
  const setAnchor = useCallback((
    clubId: WedgeClubId,
    position: WedgePosition,
    yards: number,
    second?: { position: WedgePosition; yards: number },
  ) => {
    setCalibration(prev => {
      const otherEntries = prev.entries.filter(e => e.clubId !== clubId);
      let derived: WedgeEntry[];
      let anchorPositions: WedgePosition[];

      if (second) {
        derived = deriveAllFromTwoAnchors(
          clubId,
          position, yards,
          second.position, second.yards,
        );
        anchorPositions = [position, second.position];
      } else {
        derived = deriveAllFromAnchor(clubId, position, yards);
        anchorPositions = [position];
      }

      const next: WedgeCalibrationData = {
        entries: [...otherEntries, ...derived],
        anchors: { ...prev.anchors, [clubId]: anchorPositions },
      };
      writeCalibration(next);
      return next;
    });
  }, []);

  /** Manually override a single position entry (marks derived=false). */
  const overrideEntry = useCallback((
    clubId: WedgeClubId,
    position: WedgePosition,
    yards: number,
    flightYards?: number,
  ) => {
    setCalibration(prev => {
      const entries = prev.entries.map(e => {
        if (e.clubId === clubId && e.clockPosition === position) {
          return {
            ...e,
            yards,
            flightYards: flightYards ?? e.flightYards,
            derived: false,
          };
        }
        return e;
      });
      // If entry doesn't exist yet, add it
      const exists = prev.entries.some(e => e.clubId === clubId && e.clockPosition === position);
      if (!exists) {
        const newEntry: WedgeEntry = {
          clubId,
          clockPosition: position,
          yards,
          flightYards: flightYards ?? Math.max(0, yards - 5),
          derived: false,
        };
        const next: WedgeCalibrationData = {
          ...prev,
          entries: [...prev.entries, newEntry],
        };
        writeCalibration(next);
        return next;
      }
      const next: WedgeCalibrationData = { ...prev, entries };
      writeCalibration(next);
      return next;
    });
  }, []);

  /** Re-derive all entries for a club from its stored anchor(s). */
  const rederive = useCallback((clubId: WedgeClubId) => {
    setCalibration(prev => {
      const anchorPositions = prev.anchors[clubId];
      if (!anchorPositions || anchorPositions.length === 0) return prev;

      const [pos1, pos2] = anchorPositions;
      const entry1 = prev.entries.find(e => e.clubId === clubId && e.clockPosition === pos1);
      if (!entry1) return prev;

      let derived: WedgeEntry[];
      if (pos2) {
        const entry2 = prev.entries.find(e => e.clubId === clubId && e.clockPosition === pos2);
        if (entry2) {
          derived = deriveAllFromTwoAnchors(clubId, pos1, entry1.yards, pos2, entry2.yards);
        } else {
          derived = deriveAllFromAnchor(clubId, pos1, entry1.yards);
        }
      } else {
        derived = deriveAllFromAnchor(clubId, pos1, entry1.yards);
      }

      const otherEntries = prev.entries.filter(e => e.clubId !== clubId);
      const next: WedgeCalibrationData = { ...prev, entries: [...otherEntries, ...derived] };
      writeCalibration(next);
      return next;
    });
  }, []);

  /** Reset a single club's calibration. */
  const resetClub = useCallback((clubId: WedgeClubId) => {
    setCalibration(prev => {
      const entries = prev.entries.filter(e => e.clubId !== clubId);
      const anchors = { ...prev.anchors };
      delete anchors[clubId];
      const next: WedgeCalibrationData = { entries, anchors };
      writeCalibration(next);
      return next;
    });
  }, []);

  /** Get all entries for a specific club, sorted by clock position order. */
  const getClubEntries = useCallback((clubId: WedgeClubId, cal?: WedgeCalibrationData) => {
    const data = cal ?? calibration;
    return data.entries
      .filter(e => e.clubId === clubId)
      .sort((a, b) => {
        const order = POSITION_ORDER;
        return order.indexOf(a.clockPosition) - order.indexOf(b.clockPosition);
      });
  }, [calibration]);

  const isCalibrated = useCallback((clubId: WedgeClubId) => {
    return calibration.entries.some(e => e.clubId === clubId);
  }, [calibration]);

  return {
    calibration,
    setAnchor,
    overrideEntry,
    rederive,
    resetClub,
    getClubEntries,
    isCalibrated,
  };
}
