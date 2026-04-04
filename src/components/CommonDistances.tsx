import { SimpleGrid, UnstyledButton } from '@mantine/core';
import type { LagRow } from '../lib/types';
import { backswingRaw } from '../lib/backswing';
import { useUnits } from '../hooks/useUnits';

const COMMON_DISTANCES = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];

interface Props {
  stimp: number;
  distanceFactor: number;
  distanceOffset?: number;
  lagRows: LagRow[];
  onSelect: (distance: number) => void;
}

export function CommonDistances({ stimp, distanceFactor, distanceOffset = 0, lagRows, onSelect }: Props) {
  const { fmtDist, fmtBackswing } = useUnits();

  return (
    <div className="common-distances">
      <h2 className="section-title">
        Common Distances <span className="section-title-sub">· Backstroke</span>
      </h2>
      <SimpleGrid cols={{ base: 2, xs: 3, sm: 4 }} className="distance-grid">
        {COMMON_DISTANCES.map(feet => {
          const rawInches = backswingRaw(feet, stimp, lagRows, distanceFactor, distanceOffset);
          return (
            <UnstyledButton
              key={feet}
              className="distance-card"
              onClick={() => onSelect(feet)}
            >
              <div className="distance-card-feet">{fmtDist(feet)}</div>
              <div className="distance-card-bs">{rawInches !== null ? fmtBackswing(rawInches) : '—'}</div>
            </UnstyledButton>
          );
        })}
      </SimpleGrid>
    </div>
  );
}
