import { IconClock } from '@tabler/icons-react';
import { CLOCK_POSITIONS, WEDGE_CLUBS } from '../lib/wedge';
import type { WedgeEntry, WedgeClubId, WedgePosition, WedgeCalibrationData } from '../lib/wedge';

interface WedgeMatrixProps {
  entries: WedgeEntry[];
  showFlight?: boolean;
  /** Highlight these rows */
  highlightPositions?: WedgePosition[];
  highlightClub?: WedgeClubId;
  /** Anchors map — cells that are measured positions show a gold dot */
  anchors?: WedgeCalibrationData['anchors'];
}

export function WedgeMatrix({
  entries,
  showFlight = false,
  highlightPositions = [],
  highlightClub,
  anchors = {},
}: WedgeMatrixProps) {
  function getEntry(clubId: WedgeClubId, pos: WedgePosition): WedgeEntry | undefined {
    return entries.find(e => e.clubId === clubId && e.clockPosition === pos);
  }

  function cellValue(entry: WedgeEntry | undefined): string {
    if (!entry) return '—';
    const val = showFlight ? (entry.flightYards ?? entry.yards - 5) : entry.yards;
    return String(val);
  }

  function isAnchor(clubId: WedgeClubId, pos: WedgePosition): boolean {
    return (anchors[clubId] ?? []).includes(pos);
  }

  return (
    <div className="wedge-matrix-wrap">
      <table className="wedge-matrix">
        <thead>
          <tr>
            <th className="wedge-matrix-pos-col">
              <IconClock size={14} stroke={2} style={{ opacity: 0.60, display: 'block', margin: '0 auto' }} />
            </th>
            {WEDGE_CLUBS.map(club => (
              <th
                key={club.id}
                className={`wedge-matrix-club-col${highlightClub === club.id ? ' wedge-matrix-club-highlighted' : ''}`}
              >
                {club.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CLOCK_POSITIONS.filter(pos => pos.calibrate || ['8', '10', '11'].includes(pos.key)).map(pos => {
            const rowHighlighted = highlightPositions.includes(pos.key);
            return (
              <tr
                key={pos.key}
                className={`wedge-matrix-row${rowHighlighted ? ' wedge-matrix-row--highlight' : ''}${!pos.calibrate ? ' wedge-matrix-row--intermed' : ''}`}
              >
                <td className="wedge-matrix-pos">
                  <span className={`wedge-pos-label${!pos.calibrate ? ' wedge-pos-label--intermed' : ''}`}>
                    {pos.label}
                  </span>
                </td>
                {WEDGE_CLUBS.map(club => {
                  const entry = getEntry(club.id, pos.key);
                  const val   = cellValue(entry);
                  const isCellHighlight = rowHighlighted && (!highlightClub || highlightClub === club.id);
                  const anchor = isAnchor(club.id, pos.key);
                  return (
                    <td
                      key={club.id}
                      className={`wedge-matrix-cell${isCellHighlight ? ' wedge-matrix-cell--highlight' : ''}${highlightClub === club.id ? ' wedge-matrix-club-highlighted' : ''}`}
                    >
                      <span className={`wedge-cell-inner${anchor ? ' wedge-cell-inner--anchor' : ''}`}>
                        {val}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
