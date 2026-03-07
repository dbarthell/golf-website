import { useState, useCallback } from 'react';

function readNum(key: string, fallback: number): number {
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}

export function useLookupState() {
  const [distance, setDistanceRaw] = useState<number | ''>(() => {
    const v = localStorage.getItem('putt-distance');
    if (!v) return '';
    const n = parseFloat(v);
    return isNaN(n) ? '' : n;
  });

  const [slope, setSlopeRaw] = useState<number>(() => readNum('putt-slope', 2));
  const [stimp, setStimpRaw] = useState<number>(() => readNum('putt-stimp', 10));

  const [clock, setClockRaw] = useState<string | null>(() => {
    const v = localStorage.getItem('putt-clock');
    return v && v !== '' ? v : null;
  });

  const setDistance = useCallback((val: number | '') => {
    setDistanceRaw(val);
    if (val !== '') localStorage.setItem('putt-distance', String(val));
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

  const setClock = useCallback((val: string | null) => {
    setClockRaw(val);
    localStorage.setItem('putt-clock', val ?? '');
  }, []);

  return { distance, setDistance, slope, setSlope, stimp, setStimp, clock, setClock };
}
