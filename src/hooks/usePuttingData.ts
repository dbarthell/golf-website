import type { PuttingData } from '../lib/types';
// Bundled at build time — works 100% offline, no runtime fetch needed.
import rawData from '../../data/putting.json';

const puttingData = rawData as unknown as PuttingData;

export function usePuttingData(): PuttingData {
  return puttingData;
}
