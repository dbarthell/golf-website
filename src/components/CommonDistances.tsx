import { SimpleGrid, UnstyledButton } from '@mantine/core';
import type { LagRow } from '../lib/types';
import { backswingDisplay } from '../lib/backswing';

const COMMON_DISTANCES = [3, 5, 6, 10, 15, 20, 25, 30, 40, 50, 65, 80];

interface Props {
  stimp: number;
  distanceFactor: number;
  lagRows: LagRow[];
  onSelect: (distance: number) => void;
}

export function CommonDistances({ stimp, distanceFactor, lagRows, onSelect }: Props) {
  return (
    <div className="common-distances">
      <h2 className="section-title">
        Common Distances <span className="section-title-sub">· Backswing</span>
      </h2>
      <SimpleGrid cols={{ base: 2, xs: 3, sm: 4 }} className="distance-grid">
        {COMMON_DISTANCES.map(feet => {
          const bs = backswingDisplay(feet, stimp, lagRows, distanceFactor);
          return (
            <UnstyledButton
              key={feet}
              className="distance-card"
              onClick={() => onSelect(feet)}
            >
              <div className="distance-card-feet">{feet} ft</div>
              <div className="distance-card-bs">{bs}</div>
            </UnstyledButton>
          );
        })}
      </SimpleGrid>
    </div>
  );
}
