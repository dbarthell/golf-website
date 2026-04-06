// ── Types ─────────────────────────────────────────────────────────────────────

export type ClubCategory = 'driver' | 'wood' | 'hybrid' | 'iron' | 'wedge';

export interface BagClub {
  id: string;          // 'dr', '3w', '4h', '7i', 'pw', etc.
  label: string;       // 'Driver', '3W', '4H', '7i', 'PW'
  category: ClubCategory;
  order: number;       // ascending = longer club first (Driver = 0)
  hasPelz: boolean;    // true for irons + wedges; false for driver/woods
}

export interface BagEntry {
  clubId: string;
  fullTotal: number;         // REQUIRED — gate for showing club in the table
  fullCarry: number | null;  // optional
  pelzTotal: number | null;  // null = auto-extrapolate from fullTotal
  pelzCarry: number | null;  // null = auto-extrapolate from fullCarry (if present)
  pelzOverride: boolean;     // true = user manually set pelz values
}

export interface BagSettings {
  pelzOffset: number;        // default 5 — percentage less than full to estimate flighted yardage
}

export interface BagData {
  clubs: BagClub[];
  entries: BagEntry[];
  settings: BagSettings;
}

// ── Default club set ──────────────────────────────────────────────────────────

export const DEFAULT_CLUBS: BagClub[] = [
  { id: 'dr',  label: 'DR',  category: 'driver', order: 0,  hasPelz: false },
  { id: '3w',  label: '3W',  category: 'wood',   order: 1,  hasPelz: false },
  { id: '3i',  label: '3i',  category: 'iron',   order: 2,  hasPelz: true  },
  { id: '4i',  label: '4i',  category: 'iron',   order: 3,  hasPelz: true  },
  { id: '5i',  label: '5i',  category: 'iron',   order: 4,  hasPelz: true  },
  { id: '6i',  label: '6i',  category: 'iron',   order: 5,  hasPelz: true  },
  { id: '7i',  label: '7i',  category: 'iron',   order: 6,  hasPelz: true  },
  { id: '8i',  label: '8i',  category: 'iron',   order: 7,  hasPelz: true  },
  { id: '9i',  label: '9i',  category: 'iron',   order: 8,  hasPelz: true  },
  { id: 'pw',  label: 'PW',  category: 'wedge',  order: 9,  hasPelz: true  },
  { id: 'gw',  label: 'GW',  category: 'wedge',  order: 10, hasPelz: true  },
  { id: 'sw',  label: 'SW',  category: 'wedge',  order: 11, hasPelz: true  },
  { id: 'lw',  label: 'LW',  category: 'wedge',  order: 12, hasPelz: true  },
];

/** Extra clubs a user might want to add (not in default set) */
export const EXTRA_CLUBS: BagClub[] = [
  { id: '2i',  label: '2i',       category: 'iron',   order: 2,  hasPelz: true  },
  { id: '5w',  label: '5W',       category: 'wood',   order: 1,  hasPelz: false },
  { id: '3h',  label: '3H',       category: 'hybrid', order: 1,  hasPelz: false },
  { id: '4h',  label: '4H',       category: 'hybrid', order: 2,  hasPelz: false },
  { id: '7w',  label: '7W',       category: 'wood',   order: 2,  hasPelz: false },
  { id: 'md',  label: 'Mini DR',  category: 'driver', order: 0,  hasPelz: false },
];

export const DEFAULT_SETTINGS: BagSettings = {
  pelzOffset: 5,
};

// ── Pelz computation helpers ──────────────────────────────────────────────────

/**
 * Returns the effective 10:30 total yardage.
 * If the user has manually calibrated (pelzOverride=true), returns their measured value.
 * Otherwise returns fullTotal - offset as a rough estimate.
 */
export function computedPelzTotal(entry: BagEntry, offset: number): number {
  return entry.pelzOverride && entry.pelzTotal !== null
    ? entry.pelzTotal
    : Math.round(entry.fullTotal * (1 - offset / 100));
}

/**
 * Returns the effective flighted carry yardage, or null if no carry data.
 */
export function computedPelzCarry(entry: BagEntry, offset: number): number | null {
  if (entry.pelzOverride) return entry.pelzCarry;
  return entry.fullCarry !== null
    ? Math.round(entry.fullCarry * (1 - offset / 100))
    : null;
}

/**
 * True if this entry has a real measured 10:30 value (not just an estimate).
 */
export function isPelzCalibrated(entry: BagEntry): boolean {
  return entry.pelzOverride;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function emptyBagData(): BagData {
  return {
    clubs: DEFAULT_CLUBS,
    entries: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}
