import type { LagRow } from '../lib/types';
import { getDistanceForBackswingInches } from '../lib/backswing';
import { useUnits } from '../hooks/useUnits';

// Landmark names and their offset (inches) from the middle of the trail foot.
// e.g. stanceWidth=12 → Middle Trail Foot=12", Outside Trail Foot=15", etc.
const LANDMARKS = [
  { name: 'Inside Trail Foot',  offset: -3 },
  { name: 'Middle Trail Foot',  offset:  0 },
  { name: 'Outside Trail Foot', offset:  3 },
  { name: '3" Past Outside',    offset:  6 },
  { name: '6" Past Outside',    offset:  9 },
  { name: '9" Past Outside',    offset: 12 },
  { name: '12" Past Outside',   offset: 15 },
  { name: '15" Past Outside',   offset: 18 },
];

interface Props {
  lagRows: LagRow[];
  distanceFactor: number;
  distanceOffset?: number;
  stanceWidth: number;
  stimp: number;
}

export function BackswingTable({ lagRows, distanceFactor, distanceOffset = 0, stanceWidth, stimp }: Props) {
  const { fmtDist, fmtBackswing } = useUnits();

  return (
    <div className="quick-table-section">
      <h2 className="section-title">Backstroke Reference <span className="section-title-sub">· Stimp {stimp}</span></h2>
      <div className="bs-table">
        <div className="bs-table-header">
          <span>Dist</span>
          <span>Stroke</span>
          <span>Landmark</span>
        </div>
        {LANDMARKS.map(({ name, offset }) => {
          const physicalBackswing = stanceWidth + offset;
          if (physicalBackswing <= 0) return null;
          const rawDist = getDistanceForBackswingInches(physicalBackswing, stimp, lagRows, distanceFactor, distanceOffset);
          if (rawDist === null) return null;
          return (
            <div key={name} className="bs-row">
              <span className="bs-dist">{fmtDist(Math.round(rawDist))}</span>
              <span className="bs-value">{fmtBackswing(physicalBackswing)}</span>
              <span className="bs-landmark">{name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
