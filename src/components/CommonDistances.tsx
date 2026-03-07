import { SimpleGrid, UnstyledButton } from '@mantine/core';
import { backswingDisplay } from '../lib/backswing';
import type { LagRow } from '../lib/types';

const COMMON_DISTANCES = [3, 5, 6, 10, 15, 20, 25, 30, 40, 50, 65, 80];

interface CommonDistancesProps {
  stimp: number;
  distanceFactor: number;
  lagRows: LagRow[];
  onSelect: (dist: number) => void;
}

export default function CommonDistances({
  stimp,
  distanceFactor,
  lagRows,
  onSelect,
}: CommonDistancesProps) {
  return (
    <div className="common-distances">
      <h2 className="section-title">
        Common Distances <span className="section-title-sub">· Backswing</span>
      </h2>
      {/* cols breakpoints use the custom theme breakpoints: xs=375px, sm=480px */}
      <SimpleGrid cols={{ base: 2, xs: 3, sm: 4 }} spacing="xs">
        {COMMON_DISTANCES.map(feet => {
          const bs = backswingDisplay(feet, stimp, lagRows, distanceFactor);
          return (
            <UnstyledButton
              key={feet}
              className="distance-card"
              onClick={() => onSelect(feet)}
              aria-label={`${feet} feet, backswing ${bs}`}
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
