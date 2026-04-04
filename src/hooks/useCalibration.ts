import { useState, useCallback } from 'react';
import type { Calibration } from '../lib/types';

const CAL_KEY = 'putt-cal';
const DEFAULT_CAL: Calibration = { distanceFactor: 1.0, distanceOffset: 0, stanceWidth: 12 };

function readCalibration(): Calibration {
  try {
    const saved = localStorage.getItem(CAL_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<Calibration>;
      return {
        distanceFactor: parsed.distanceFactor ?? 1.0,
        distanceOffset: parsed.distanceOffset ?? 0,
        stanceWidth: parsed.stanceWidth ?? 12,
      };
    }
  } catch (_) {
    // ignore parse errors
  }
  return { ...DEFAULT_CAL };
}

export function useCalibration() {
  const [calibration, setCalibration] = useState<Calibration>(readCalibration);

  const saveCalibration = useCallback((cal: Calibration) => {
    localStorage.setItem(CAL_KEY, JSON.stringify(cal));
    setCalibration(cal);
  }, []);

  const resetCalibration = useCallback(() => {
    localStorage.setItem(CAL_KEY, JSON.stringify(DEFAULT_CAL));
    setCalibration({ ...DEFAULT_CAL });
  }, []);

  return { calibration, saveCalibration, resetCalibration };
}
