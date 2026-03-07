import type { PuttingData } from '../lib/types';
// Bundled at build time — works 100% offline, no runtime fetch needed.
import rawData from '../../data/putting.json';

const puttingData = rawData as unknown as PuttingData;

/**
 * Returns the bundled putting data. Not a React hook (no hook APIs used
 * internally) — named without the `use` prefix to avoid ESLint
 * react-hooks/rules-of-hooks false positives.
 */
export function getPuttingData(): PuttingData {
  return puttingData;
}
