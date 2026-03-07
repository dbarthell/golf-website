import { useState, useCallback } from 'react';

export interface LookupState {
  distance: number | null;
  slope: number;
  stimp: number;
  currentClock: string | null;
}

export function useLookupState() {
  const [distance, setDistanceRaw] = useState<number | null>(() => {
    const saved = localStorage.getItem('putt-distance');
    return saved ? parseFloat(saved) : null;
  });

  const [slope, setSlopeRaw] = useState<number>(() => {
    const saved = localStorage.getItem('putt-slope');
    return saved ? parseFloat(saved) : 2;
  });

  const [stimp, setStimpRaw] = useState<number>(() => {
    const saved = localStorage.getItem('putt-stimp');
    return saved ? parseFloat(saved) : 10;
  });

  const [currentClock, setCurrentClock] = useState<string | null>(null);

  const setDistance = useCallback((val: number | null) => {
    setDistanceRaw(val);
    if (val !== null) localStorage.setItem('putt-distance', String(val));
    else localStorage.removeItem('putt-distance');
  }, []);

  const setSlope = useCallback((val: number) => {
    setSlopeRaw(val);
    localStorage.setItem('putt-slope', String(val));
  }, []);

  const setStimp = useCallback((val: number) => {
    setStimpRaw(val);
    localStorage.setItem('putt-stimp', String(val));
  }, []);

  const toggleClock = useCallback((key: string) => {
    setCurrentClock(prev => (prev === key ? null : key));
  }, []);

  return {
    distance, setDistance,
    slope, setSlope,
    stimp, setStimp,
    currentClock, toggleClock, setCurrentClock,
  };
}
