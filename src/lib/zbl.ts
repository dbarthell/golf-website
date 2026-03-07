import type { BrysonRow, ParsedCell } from './types';
import { lerp, parseCell } from './interpolation';

// ── Formatting ────────────────────────────────────────────────────────────────

/** Round to nearest 0.5", drop trailing .0 */
export function fmtInches(val: number): string {
  const r = Math.round(val * 2) / 2;
  return (r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)) + '"';
}

// ── Aim zone label ────────────────────────────────────────────────────────────

/**
 * Returns a named aim zone label, or null if the aim is outside the cup
 * (caller should then show edgeAim in inches).
 * Cup radius = 2.125" (4.25" diameter).
 * The 2.5" upper bound intentionally extends ~0.375" past the physical lip to
 * cover the rim-in band where the ball can still drop.
 */
export function aimPoint(lateralAim: number, breakFactor: number): string | null {
  const dir = breakFactor > 0 ? 'Right' : 'Left';
  if (lateralAim < 0.85) return `${dir} Center`;
  if (lateralAim < 1.6)  return `Inside ${dir}`;
  if (lateralAim < 2.5)  return `${dir} Edge`;
  return null; // outside cup: show inches out
}

// ── Bryson table lookup ───────────────────────────────────────────────────────

function findPuttingData(distanceFeet: number, rows: BrysonRow[]): BrysonRow | (BrysonRow & { original: false }) | null {
  // Exact match
  const exact = rows.find(r => parseFloat(r.feet) === distanceFeet);
  if (exact) return exact;

  let lower: BrysonRow | null = null;
  let upper: BrysonRow | null = null;

  for (const row of rows) {
    const feet = parseFloat(row.feet);
    if (feet < distanceFeet) lower = row;
    else if (feet > distanceFeet) { upper = row; break; }
  }

  if (!lower) return upper;
  if (!upper) return lower;

  const lf = parseFloat(lower.feet);
  const uf = parseFloat(upper.feet);
  const t = (distanceFeet - lf) / (uf - lf);

  const slopeKeys = ['pct1', 'pct2', 'pct3', 'pct4', 'pct5', 'pct6'] as const;
  const interpolated: Record<string, string> = {
    steps: lerp(lower.steps, upper.steps, t).toFixed(1),
    feet: String(distanceFeet),
  };

  for (const key of slopeKeys) {
    const lo = parseCell(lower[key]);
    const hi = parseCell(upper[key]);
    const base = lerp(lo.base, hi.base, t);
    const plus = lerp(lo.plusVariance, hi.plusVariance, t);
    const minus = lerp(lo.minusVariance, hi.minusVariance, t);
    const variance =
      plus > 0 || minus > 0
        ? ` +${Math.round(plus * 2) / 2}/−${Math.round(minus * 2) / 2}`
        : '';
    interpolated[key] = base.toFixed(1) + variance;
  }

  return interpolated as unknown as BrysonRow;
}

// ── ZBL vector ────────────────────────────────────────────────────────────────

export interface ZBLResult {
  aimInches: string;
  plusInches: string | null;
  minusInches: string | null;
}

export function calculateZBLVector(
  distanceFeet: number,
  slopePct: number,
  stimp: number,
  brysonRows: BrysonRow[],
): ZBLResult | null {
  const slope = parseFloat(String(slopePct)) || 0;

  if (slope <= 0) {
    return { aimInches: '0.0', plusInches: null, minusInches: null };
  }

  const brysonData = findPuttingData(distanceFeet, brysonRows);
  if (!brysonData) return null;

  const clampedSlope = Math.min(6, slope);
  const rawLower = Math.floor(clampedSlope);
  const rawUpper = Math.ceil(clampedSlope);
  const t = clampedSlope - rawLower;

  // Use unknown cast first to bridge the structural gap between BrysonRow and
  // an index-signature type (TypeScript can't directly cast between them).
  const row = brysonData as unknown as Record<string, string>;

  let parsed: ParsedCell;
  if (rawLower === 0 && rawUpper === 1 && t > 0) {
    // Sub-1% slope: interpolate proportionally between flat (0) and 1%
    const upper = parseCell(row['pct1']);
    parsed = {
      base: upper.base * t,
      plusVariance: upper.plusVariance * t,
      minusVariance: upper.minusVariance * t,
    };
  } else {
    const lowerSlope = Math.max(1, rawLower);
    const upperSlope = Math.min(6, rawUpper);
    if (lowerSlope === upperSlope || t === 0) {
      parsed = parseCell(row[`pct${lowerSlope}`]);
    } else {
      const lo = parseCell(row[`pct${lowerSlope}`]);
      const hi = parseCell(row[`pct${upperSlope}`]);
      parsed = {
        base: lerp(lo.base, hi.base, t),
        plusVariance: lerp(lo.plusVariance, hi.plusVariance, t),
        minusVariance: lerp(lo.minusVariance, hi.minusVariance, t),
      };
    }
  }

  const stimpScale = (stimp || 10) / 10;
  return {
    aimInches: (parsed.base * stimpScale).toFixed(1),
    plusInches: parsed.plusVariance > 0 ? (parsed.plusVariance * stimpScale).toFixed(1) : null,
    minusInches: parsed.minusVariance > 0 ? (parsed.minusVariance * stimpScale).toFixed(1) : null,
  };
}
