export interface LagRow {
  inches: string;
  landmark: string;
  stimp9: string;
  stimp10: string;
  stimp11: string;
  original: boolean;
}

export interface BrysonRow {
  steps: number | string;
  feet: string;
  original: boolean;
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
    rows: LagRow[];
  };
  brysonTable: {
    title: string;
    description: string;
    rows: BrysonRow[];
  };
}

export interface Calibration {
  distanceFactor: number;
}
