// ── Wedge clock-system types & constants ─────────────────────────────────────

export type WedgeClubId = 'lw' | 'sw' | 'gw';
// All 7 named positions — 4 are calibration anchors, 3 are display/derived only
export type WedgePosition = '7.5' | '8' | '8.5' | '9' | '9.5' | '10' | '10.5' | '11' | '11.5' | 'full';

export interface WedgeClub {
  id: WedgeClubId;
  label: string;
}

export interface WedgeEntry {
  clubId: WedgeClubId;
  clockPosition: WedgePosition;
  yards: number;          // normal carry — neutral ball position
  flightYards?: number;   // flight version — ball back ~½ ball, lower/less spin
  derived: boolean;       // true = computed from anchor, false = manually set
}

export interface WedgeCalibrationData {
  entries: WedgeEntry[];
  /** 1 or 2 measured positions per club (2 gives linear-fit accuracy) */
  anchors: Partial<Record<WedgeClubId, WedgePosition[]>>;
}

// ── Club definitions ──────────────────────────────────────────────────────────

export const WEDGE_CLUBS: WedgeClub[] = [
  { id: 'lw', label: 'LW' },
  { id: 'sw', label: 'SW' },
  { id: 'gw', label: 'GW' },
];

// ── Clock positions ───────────────────────────────────────────────────────────

export interface ClockPositionDef {
  key: WedgePosition;
  label: string;
  ratio: number;      // fraction of full-swing distance
  angleDeg: number;   // 0° = 12:00 (Full), negative = CCW (left arm back)
  /** If true, shown as an anchor option in the calibration picker */
  calibrate: boolean;
}

export const CLOCK_POSITIONS: ClockPositionDef[] = [
  { key: '7.5',  label: '7:30',  ratio: 0.55, angleDeg: -135, calibrate: true  },
  { key: '8',    label: '8:00',  ratio: 0.65, angleDeg: -120, calibrate: false },
  { key: '8.5',  label: '8:30',  ratio: 0.70, angleDeg: -105, calibrate: false },
  { key: '9',    label: '9:00',  ratio: 0.75, angleDeg:  -90, calibrate: true  },
  { key: '9.5',  label: '9:30',  ratio: 0.80, angleDeg:  -75, calibrate: false },
  { key: '10',   label: '10:00', ratio: 0.85, angleDeg:  -60, calibrate: false },
  { key: '10.5', label: '10:30', ratio: 0.92, angleDeg:  -45, calibrate: true  },
  { key: '11',   label: '11:00', ratio: 0.96, angleDeg:  -30, calibrate: false },
  { key: '11.5', label: '11:30', ratio: 0.98, angleDeg:  -15, calibrate: false },
  { key: 'full', label: 'Full',  ratio: 1.00, angleDeg:    0, calibrate: true  },
];

/** Ordered list of all position keys, for sorting */
export const POSITION_ORDER: WedgePosition[] = ['7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', 'full'];

export function getClockDef(key: WedgePosition): ClockPositionDef {
  return CLOCK_POSITIONS.find(p => p.key === key)!;
}

// ── Derivation ────────────────────────────────────────────────────────────────

/**
 * Given one anchor (club + position + yards), derive all 7 position entries.
 * All values are rounded to the nearest whole yard.
 * flightYards defaults to yards − 5.
 */
export function deriveAllFromAnchor(
  clubId: WedgeClubId,
  anchorPosition: WedgePosition,
  anchorYards: number,
): WedgeEntry[] {
  const anchorDef = getClockDef(anchorPosition);
  const fullYards = anchorYards / anchorDef.ratio;

  return CLOCK_POSITIONS.map(pos => {
    const yards = Math.round(fullYards * pos.ratio);
    const isAnchor = pos.key === anchorPosition;
    return {
      clubId,
      clockPosition: pos.key,
      yards,
      flightYards: Math.max(0, yards - 5),
      derived: !isAnchor,
    };
  });
}

/**
 * Given two anchors, fit a line through both points and derive all 7 entries.
 * More accurate than single-anchor because it captures each club's actual ratio curve.
 */
export function deriveAllFromTwoAnchors(
  clubId: WedgeClubId,
  pos1: WedgePosition, yards1: number,
  pos2: WedgePosition, yards2: number,
): WedgeEntry[] {
  const r1 = getClockDef(pos1).ratio;
  const r2 = getClockDef(pos2).ratio;
  // Linear fit: yards = a * ratio + b
  const a = (yards2 - yards1) / (r2 - r1);
  const b = yards1 - a * r1;
  const anchorKeys: WedgePosition[] = [pos1, pos2];
  return CLOCK_POSITIONS.map(pos => {
    const yards = Math.max(1, Math.round(a * pos.ratio + b));
    return {
      clubId,
      clockPosition: pos.key,
      yards,
      flightYards: Math.max(0, yards - 5),
      derived: !anchorKeys.includes(pos.key),
    };
  });
}

// ── Empty calibration helper ─────────────────────────────────────────────────

export function emptyCalibration(): WedgeCalibrationData {
  return { entries: [], anchors: {} };
}
