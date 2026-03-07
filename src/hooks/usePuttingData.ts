// Bundled at build time so the app works fully offline.
import rawData from '../../data/putting.json';
import type { PuttingData } from '../lib/types';

export function usePuttingData(): { data: PuttingData; loading: false; error: null } {
  return {
    data: rawData as PuttingData,
    loading: false,
    error: null,
  };
}
