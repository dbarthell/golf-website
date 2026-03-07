import { lerp } from './interpolation';
import { fmtInches } from './zbl';
import type { LagRow } from './types';

export function getDistanceForStimp(row: LagRow, stimp: number): number {
  const d9  = parseFloat(row.stimp9.replace(' ft', ''));
  const d10 = parseFloat(row.stimp10.replace(' ft', ''));
  const d11 = parseFloat(row.stimp11.replace(' ft', ''));
  if (stimp <= 9)  return d9;
  if (stimp <= 10) return lerp(d9, d10, stimp - 9);
  if (stimp <= 11) return lerp(d10, d11, stimp - 10);
  // Extrapolate beyond stimp 11 using the 10→11 rate
  return d11 + (d11 - d10) * (stimp - 11);
}

export function findBackswingData(
  distanceFeet: number,
  stimp: number,
  rows: LagRow[],
): { inches: string; landmark: string; original: boolean } | null {
  let lower: LagRow | null = null;
  let upper: LagRow | null = null;

  for (const row of rows) {
    const feet = getDistanceForStimp(row, stimp);
    if (feet < distanceFeet) {
      lower = row;
    } else if (feet > distanceFeet) {
      upper = row;
      break;
    } else {
      return row; // exact match
    }
  }

  if (!lower) return upper ?? null;
  if (!upper) return lower;

  const lowerFeet = getDistanceForStimp(lower, stimp);
  const upperFeet = getDistanceForStimp(upper, stimp);
  const t = (distanceFeet - lowerFeet) / (upperFeet - lowerFeet);

  const lowerInches = parseFloat(lower.inches.replace('"', ''));
  const upperInches = parseFloat(upper.inches.replace('"', ''));
  const interpolatedInches = lerp(lowerInches, upperInches, t);

  return {
    inches: interpolatedInches.toFixed(1) + '"',
    landmark: '(interpolated)',
    original: false,
  };
}

// "1 foot past the cup" backswing: look up dist+1, apply calibration factor
export function backswingDisplay(
  distFeet: number,
  stimp: number,
  rows: LagRow[],
  distanceFactor: number,
): string {
  const data = findBackswingData(distFeet + 1, stimp, rows);
  if (!data) return '—';
  const raw = parseFloat(data.inches.replace('"', ''));
  return fmtInches(raw * distanceFactor);
}

// Returns raw inches (number) for calibration page use
export function findBackswingInches(
  distanceFeet: number,
  stimp: number,
  rows: LagRow[],
): number | null {
  const data = findBackswingData(distanceFeet, stimp, rows);
  if (!data) return null;
  return parseFloat(data.inches.replace('"', ''));
}
