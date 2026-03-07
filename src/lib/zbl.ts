import { lerp, parseCell } from './interpolation';
import type { BrysonRow } from './types';

export interface ZBLResult {
  aimInches: string;
  plusInches: string | null;
  minusInches: string | null;
}

export function fmtInches(val: number): string {
  const r = Math.round(val * 2) / 2;
  return (r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)) + '"';
}

// Returns a named aim zone label, or null if outside the cup (show inches instead).
// Cup radius = 2.125" (4.25" diameter).
export function aimPoint(lateralAim: number, breakFactor: number): string | null {
  const dir = breakFactor > 0 ? 'Right' : 'Left';
  if (lateralAim < 0.85) return `${dir} Center`;
  if (lateralAim < 1.6)  return `Inside ${dir}`;
  if (lateralAim < 2.5)  return `${dir} Edge`;
  return null; // outside cup: show inches out
}

function findPuttingRow(distanceFeet: number, rows: BrysonRow[]): BrysonRow | null {
  const exactMatch = rows.find(r => parseFloat(r.feet) === distanceFeet);
  if (exactMatch) return exactMatch;

  let lower: BrysonRow | null = null;
  let upper: BrysonRow | null = null;

  for (const row of rows) {
    const feet = parseFloat(row.feet);
    if (feet < distanceFeet) {
      lower = row;
    } else if (feet > distanceFeet) {
      upper = row;
      break;
    }
  }

  if (!lower) return upper;
  if (!upper) return lower;

  const lowerFeet = parseFloat(lower.feet);
  const upperFeet = parseFloat(upper.feet);
  const t = (distanceFeet - lowerFeet) / (upperFeet - lowerFeet);

  const interpolated: BrysonRow = {
    steps: lerp(parseFloat(String(lower.steps)), parseFloat(String(upper.steps)), t),
    feet: distanceFeet.toString(),
    original: false,
    pct1: '', pct2: '', pct3: '', pct4: '', pct5: '', pct6: '',
  };

  (['pct1', 'pct2', 'pct3', 'pct4', 'pct5', 'pct6'] as const).forEach(key => {
    const lp = parseCell(lower![key]);
    const up = parseCell(upper![key]);
    const iBase  = lerp(lp.base, up.base, t);
    const iPlus  = lerp(lp.plusVariance, up.plusVariance, t);
    const iMinus = lerp(lp.minusVariance, up.minusVariance, t);
    const rPlus  = Math.round(iPlus  * 2) / 2;
    const rMinus = Math.round(iMinus * 2) / 2;
    let val = iBase.toFixed(1);
    if (rPlus > 0 || rMinus > 0) {
      if (rPlus === rMinus) val += ` ±${rPlus}`;
      else if (rPlus > 0 && rMinus > 0) val += ` +${rPlus}/−${rMinus}`;
      else if (rPlus > 0) val += ` +${rPlus}`;
      else val += ` −${rMinus}`;
    }
    interpolated[key] = val;
  });

  return interpolated;
}

export function calculateZBLVector(
  distanceFeet: number,
  slopePct: number | string,
  stimp: number,
  brysonRows: BrysonRow[],
): ZBLResult {
  const slope = parseFloat(String(slopePct)) || 0;

  if (slope <= 0) {
    return { aimInches: '0.0', plusInches: null, minusInches: null };
  }

  const brysonData = findPuttingRow(distanceFeet, brysonRows);
  if (!brysonData) return { aimInches: '0.0', plusInches: null, minusInches: null };

  // Clamp to data range (1–6%)
  const clampedSlope = Math.min(6, slope);
  const lowerSlope = Math.max(1, Math.floor(clampedSlope));
  const upperSlope = Math.min(6, Math.ceil(clampedSlope));
  const t = clampedSlope - Math.floor(clampedSlope);

  let parsed: ReturnType<typeof parseCell>;
  if (lowerSlope === upperSlope || t === 0) {
    parsed = parseCell(brysonData[`pct${lowerSlope}` as keyof BrysonRow] as string);
  } else if (Math.floor(clampedSlope) === 0) {
    const upper = parseCell(brysonData['pct1']);
    parsed = {
      base: lerp(0, upper.base, t),
      plusVariance: lerp(0, upper.plusVariance, t),
      minusVariance: lerp(0, upper.minusVariance, t),
    };
  } else {
    const lower = parseCell(brysonData[`pct${lowerSlope}` as keyof BrysonRow] as string);
    const upper = parseCell(brysonData[`pct${upperSlope}` as keyof BrysonRow] as string);
    parsed = {
      base: lerp(lower.base, upper.base, t),
      plusVariance: lerp(lower.plusVariance, upper.plusVariance, t),
      minusVariance: lerp(lower.minusVariance, upper.minusVariance, t),
    };
  }

  const stimpScale = (stimp || 10) / 10;
  const aimInches   = (parsed.base * stimpScale).toFixed(1);
  const plusInches  = parsed.plusVariance  > 0 ? (parsed.plusVariance  * stimpScale).toFixed(1) : null;
  const minusInches = parsed.minusVariance > 0 ? (parsed.minusVariance * stimpScale).toFixed(1) : null;

  return { aimInches, plusInches, minusInches };
}
