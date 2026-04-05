import { Link } from 'react-router-dom';
import { IconPencil } from '@tabler/icons-react';

import { useBagData } from '../hooks/useBagData';
import {
  computedPelzTotal,
  computedPelzCarry,
  isPelzCalibrated,
} from '../lib/bag';

export function BagPage() {
  const { calibratedClubs, bagData, getEntry } = useBagData();
  const { settings } = bagData;
  const offset = settings.pelzOffset;

  const rows = [...calibratedClubs].reverse().map(club => {
    const entry = getEntry(club.id)!;
    const fullTotal = entry.fullTotal;
    const fullCarry = entry.fullCarry;
    const pelzTotal = club.hasPelz ? computedPelzTotal(entry, offset) : null;
    const pelzCarry = club.hasPelz ? computedPelzCarry(entry, offset) : null;
    const pelzCal   = club.hasPelz ? isPelzCalibrated(entry) : false;
    return { club, fullTotal, fullCarry, pelzTotal, pelzCarry, pelzCal };
  });

  const hasAny = rows.length > 0;

  return (
    <>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="app-header bag-header">
        <span className="bag-module-title">My Clubs</span>
        <Link to="/bag/edit" className="full-view-link" aria-label="Edit clubs">
          <IconPencil size={20} stroke={2} />
        </Link>
      </div>

      {!hasAny ? (
        <div className="bag-empty-state">
          <p className="bag-empty-title">No clubs yet</p>
          <p className="bag-empty-body">Add your yardages to see your full bag reference.</p>
          <Link to="/bag/edit" className="bag-empty-cta">Enter yardages →</Link>
        </div>
      ) : (
        <div className="bag-grid-wrap">
        <div className="bag-grid">
          {rows.map(({ club, fullTotal, fullCarry, pelzTotal, pelzCarry, pelzCal }) => {
            const isEstimated = !pelzCal && club.hasPelz;

            return (
              <div
                key={club.id}
                className="bag-card"
              >
                <div className="bag-card-row">
                  <span className="bag-card-tag">{club.label}</span>
                  <span className="bag-card-row-nums">
                    <span className="bag-card-full">{fullTotal}</span>
                    {fullCarry !== null && <span className="bag-card-carry">{fullCarry}c</span>}
                  </span>
                </div>

                {club.hasPelz && pelzTotal !== null && (
                  <div className="bag-card-row">
                    <span className="bag-card-tag bag-card-tag--sub">Flighted</span>
                    <span className="bag-card-row-nums">
                      <span className={`bag-card-pelz${isEstimated ? ' bag-card-pelz--est' : ' bag-card-pelz--cal'}`}>
                        {isEstimated ? '~' : ''}{pelzTotal}
                      </span>
                      {pelzCarry !== null && <span className="bag-card-carry">{pelzCarry}c</span>}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>
      )}
    </>
  );
}
