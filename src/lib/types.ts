// ── Putting data JSON schema ─────────────────────────────────────────────────

export interface LagRow {
  inches: string;
  landmark: string;
  stimp9: string;
  stimp10: string;
  stimp11: string;
  original: boolean;
}

export interface BrysonRow {
  steps: number;
  feet: string;
  original?: boolean;
  pct1: string;
  pct2: string;
  pct3: string;
  pct4: string;
  pct5: string;
  pct6: string;
}

export interface PuttingData {
  lagPuttingTable: {
    title: string;
    description: string;
    slopeNote: string;
    columns: string[];
    rows: LagRow[];
  };
  brysonTable: {
    title: string;
    description: string;
    columns: string[];
    rows: BrysonRow[];
  };
}

// ── Application state ─────────────────────────────────────────────────────────

export interface Calibration {
  distanceFactor: number;
  stanceWidth: number; // inches from ball to middle of trail foot, default 12
}

// ── Parsed cell value ─────────────────────────────────────────────────────────

export interface ParsedCell {
  base: number;
  plusVariance: number;
  minusVariance: number;
}

// ── Lookup result (discriminated union) ───────────────────────────────────────

export interface ClockAnnotations {
  zblAimBase: number;
  lateralAim: number;
  breakAbs: number;
  breakFactor: number;  // signed: positive = R→L break, negative = L→R break, 0 = straight
  clockKey: string | null;
}

export type LookupResult =
  | { kind: 'empty'; message: string }
  | {
      kind: 'straight';
      backswing: number | null;
      zblDisplay: string;
      zblRaw: number;
      zblPlus: string | null;
      zblMinus: string | null;
      slopeLabel: string;
      slope: number;
      distance: number;
      stimp: number;
      uphillTotal: number;
      downhillTotal: number;
      uphillBS: number | null;
      downhillBS: number | null;
      annotations: ClockAnnotations;
    }
  | {
      kind: 'clock';
      backswing: number | null;
      namedAim: string | null;
      edgeAim: number;
      zblAimBase: number;
      breakAbs: number;
      breakFactor: number;
      uphillFactor: number;
      adjDist: number;
      slope: number;
      annotations: ClockAnnotations;
    };
