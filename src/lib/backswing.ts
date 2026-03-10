import type { LagRow } from './types';
import { lerp } from './interpolation';
import { fmtInches } from './zbl';

// ── Stimp distance helper ─────────────────────────────────────────────────────

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

// ── Backswing row lookup ──────────────────────────────────────────────────────

export interface BackswingResult {
  inches: string;
  landmark: string;
  original: boolean;
}

export function findBackswingData(
  distanceFeet: number,
  stimp: number,
  rows: LagRow[],
): BackswingResult | null {
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
      return { inches: row.inches, landmark: row.landmark, original: row.original };
    }
  }

  if (!lower) return upper ? { inches: upper.inches, landmark: upper.landmark, original: upper.original } : null;
  if (!upper) return { inches: lower.inches, landmark: lower.landmark, original: lower.original };

  const lf = getDistanceForStimp(lower, stimp);
  const uf = getDistanceForStimp(upper, stimp);
  const t = (distanceFeet - lf) / (uf - lf);

  const interpolatedInches = lerp(
    parseFloat(lower.inches.replace('"', '')),
    parseFloat(upper.inches.replace('"', '')),
    t,
  );

  return {
    inches: interpolatedInches.toFixed(1) + '"',
    landmark: '(interpolated)',
    original: false,
  };
}

/** Raw backswing inches for a distance + stimp; returns null if out of range. */
export function findBackswingInches(
  distanceFeet: number,
  stimp: number,
  rows: LagRow[],
): number | null {
  const result = findBackswingData(distanceFeet, stimp, rows);
  if (!result) return null;
  return parseFloat(result.inches.replace('"', ''));
}

/**
 * Raw calibrated backswing inches for "1 foot past the cup".
 * Returns null if out of range. Use with fmtBackswing() from useUnits for display.
 */
export function backswingRaw(
  distFeet: number,
  stimp: number,
  rows: LagRow[],
  distanceFactor: number,
): number | null {
  const data = findBackswingData(distFeet + 1, stimp, rows);
  if (!data) return null;
  const raw = parseFloat(data.inches.replace('"', ''));
  return raw * distanceFactor;
}

/**
 * "1 foot past the cup" backswing display string, with calibration factor applied.
 * @deprecated Use backswingRaw() + fmtBackswing() from useUnits for unit-aware display.
 */
export function backswingDisplay(
  distFeet: number,
  stimp: number,
  rows: LagRow[],
  distanceFactor: number,
): string {
  const raw = backswingRaw(distFeet, stimp, rows, distanceFactor);
  return raw !== null ? fmtInches(raw) : '—';
}
