import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconAdjustments } from '@tabler/icons-react';

import { useWedgeCalibration } from '../hooks/useWedgeCalibration';
import { WedgeClockFace } from '../components/WedgeClockFace';
import { WedgeMatrix } from '../components/WedgeMatrix';
import { WEDGE_CLUBS, CLOCK_POSITIONS } from '../lib/wedge';
// CLOCK_POSITIONS used for posDef lookup below
import type { WedgeClubId, WedgePosition } from '../lib/wedge';

export function WedgePage() {
  const { calibration, getClubEntries, isCalibrated } = useWedgeCalibration();

  const [activeClub, setActiveClub]           = useState<WedgeClubId>('gw');
  const [selectedPosition, setSelectedPosition] = useState<WedgePosition | null>(null);
  const [showFlight, setShowFlight]            = useState(false);

  const allEntries  = calibration.entries;
  const clubEntries = getClubEntries(activeClub);
  const anyCalibrated = WEDGE_CLUBS.some(c => isCalibrated(c.id));

  // When user switches clubs, keep the selected position if it exists for the new club
  function handleClubChange(clubId: WedgeClubId) {
    setActiveClub(clubId);
  }

  function handlePositionSelect(pos: WedgePosition) {
    setSelectedPosition(prev => prev === pos ? null : pos); // tap again to deselect
  }

  // Resolve yardage for selected position in active club
  const selectedEntry = selectedPosition
    ? clubEntries.find(e => e.clockPosition === selectedPosition)
    : null;

  const yards = selectedEntry
    ? (showFlight ? (selectedEntry.flightYards ?? selectedEntry.yards - 5) : selectedEntry.yards)
    : null;

  const posDef = selectedPosition ? CLOCK_POSITIONS.find(p => p.key === selectedPosition) : null;
  const yardageLabel   = yards !== null ? `${yards} YDS` : '';
  const yardageSublabel = posDef?.label ?? '';


  return (
    <>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="app-header bag-header">
        <span className="bag-module-title">Wedges</span>
        <Link to="/wedges/calibrate" className="full-view-link">
          <IconAdjustments size={20} stroke={2} />
          <span className="full-view-link-label">Calibrate</span>
        </Link>
      </div>

      {/* ── Club tabs ─────────────────────────────────────────────────────── */}
      <div className="wedge-lookup-body">
        <div className="wedge-club-tabs">
          {WEDGE_CLUBS.map(club => (
            <button
              key={club.id}
              className={`wedge-club-tab${activeClub === club.id ? ' wedge-club-tab--active' : ''}${!isCalibrated(club.id) ? ' wedge-club-tab--uncal' : ''}`}
              onClick={() => handleClubChange(club.id)}
            >
              {club.label}
              {!isCalibrated(club.id) && <span className="wedge-uncal-dot" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Clock face ────────────────────────────────────────────────────── */}
      <div className="wedge-clock-section">
        {!anyCalibrated ? (
          <div className="wedge-uncalibrated-msg">
            <p>No wedges calibrated yet.</p>
            <Link to="/wedges/calibrate" className="wedge-calibrate-cta">
              Calibrate your wedges →
            </Link>
          </div>
        ) : (
          <WedgeClockFace
            clubId={activeClub}
            entries={clubEntries}
            selectedPosition={selectedPosition}
            onPositionSelect={handlePositionSelect}
            yardageLabel={yardageLabel}
            yardageSublabel={yardageSublabel}
          />
        )}
      </div>

      {/* ── All Wedges matrix ──────────────────────────────────────────────── */}
      {anyCalibrated && (
        <div className="wedge-matrix-section">
          <div className="wedge-matrix-header">
            <h3 className="wedge-matrix-title">Distance Chart</h3>
            <div className="wedge-flight-toggle">
              <button
                className={`wedge-flight-btn${!showFlight ? ' wedge-flight-btn--active' : ''}`}
                onClick={() => setShowFlight(false)}
              >Normal</button>
              <button
                className={`wedge-flight-btn${showFlight ? ' wedge-flight-btn--active' : ''}`}
                onClick={() => setShowFlight(true)}
              >Flight</button>
            </div>
          </div>
          <p className="wedge-flight-explain">
            {showFlight
              ? 'Ball back ~½ ball at address — same swing, lower/less spin, ~5 yds less carry'
              : 'Neutral ball position · tap Flight for the low-spin option'}
          </p>
          <WedgeMatrix
            entries={allEntries}
            showFlight={showFlight}
            highlightPositions={selectedPosition ? [selectedPosition] : []}
            anchors={calibration.anchors}
          />
        </div>
      )}
    </>
  );
}
