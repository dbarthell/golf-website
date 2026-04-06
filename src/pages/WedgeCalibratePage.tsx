import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconArrowLeft, IconChevronDown, IconChevronUp } from '@tabler/icons-react';

import { useWedgeCalibration } from '../hooks/useWedgeCalibration';
import { WEDGE_CLUBS, CLOCK_POSITIONS } from '../lib/wedge';
import type { WedgeCalibrationData, WedgeClubId, WedgePosition } from '../lib/wedge';

// ── Single-club calibration card ──────────────────────────────────────────────

interface ClubCalCardProps {
  clubId: WedgeClubId;
  label: string;
  calibration: WedgeCalibrationData;
  setAnchor: ReturnType<typeof useWedgeCalibration>['setAnchor'];
  overrideEntry: ReturnType<typeof useWedgeCalibration>['overrideEntry'];
  resetClub: ReturnType<typeof useWedgeCalibration>['resetClub'];
  getClubEntries: ReturnType<typeof useWedgeCalibration>['getClubEntries'];
}

function ClubCalCard({
  clubId,
  label,
  calibration,
  setAnchor,
  overrideEntry,
  resetClub,
  getClubEntries,
}: ClubCalCardProps) {
  const anchorPositions = calibration.anchors[clubId] ?? [];
  const anchorPos  = anchorPositions[0] ?? null;
  const anchorPos2 = anchorPositions[1] ?? null;

  const [selectedPos,  setSelectedPos]  = useState<WedgePosition | null>(anchorPos);
  const [anchorYards,  setAnchorYards]  = useState<number | ''>(() => {
    const entry = calibration.entries.find(e => e.clubId === clubId && e.clockPosition === anchorPos);
    return entry?.yards ?? '';
  });
  const [selectedPos2, setSelectedPos2] = useState<WedgePosition | null>(anchorPos2);
  const [anchorYards2, setAnchorYards2] = useState<number | ''>(() => {
    const entry = calibration.entries.find(e => e.clubId === clubId && e.clockPosition === anchorPos2);
    return entry?.yards ?? '';
  });
  const [showOverrides, setShowOverrides] = useState(false);
  const [saved, setSaved] = useState(false);

  const entries = getClubEntries(clubId);
  const isCalibrated = entries.length > 0;

  function handleDerive() {
    if (!selectedPos || !anchorYards) return;
    const hasBoth = selectedPos2 && anchorYards2 && selectedPos2 !== selectedPos;
    setAnchor(
      clubId,
      selectedPos,
      Number(anchorYards),
      hasBoth ? { position: selectedPos2!, yards: Number(anchorYards2) } : undefined,
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  // Per-position override state (local only, committed on blur)
  const [overrideValues, setOverrideValues] = useState<Partial<Record<WedgePosition, { yards: string; flight: string }>>>({});

  function handleOverrideChange(
    pos: WedgePosition,
    field: 'yards' | 'flight',
    value: string,
  ) {
    setOverrideValues(prev => ({
      ...prev,
      [pos]: { yards: prev[pos]?.yards ?? '', flight: prev[pos]?.flight ?? '', [field]: value },
    }));
  }

  function handleOverrideBlur(pos: WedgePosition) {
    const vals = overrideValues[pos];
    const entry = entries.find(e => e.clockPosition === pos);
    const yardsStr = vals?.yards;
    const flightStr = vals?.flight;
    const yards = yardsStr ? Number(yardsStr) : entry?.yards;
    const flight = flightStr ? Number(flightStr) : entry?.flightYards;
    if (yards && yards > 0) {
      overrideEntry(clubId, pos, yards, flight);
    }
  }

  function getOverrideYards(pos: WedgePosition): string {
    const local = overrideValues[pos]?.yards;
    if (local !== undefined) return local;
    const entry = entries.find(e => e.clockPosition === pos);
    return entry ? String(entry.yards) : '';
  }

  function getOverrideFlight(pos: WedgePosition): string {
    const local = overrideValues[pos]?.flight;
    if (local !== undefined) return local;
    const entry = entries.find(e => e.clockPosition === pos);
    return entry?.flightYards !== undefined ? String(entry.flightYards) : '';
  }

  return (
    <div className="wedge-cal-card">
      <div className="wedge-cal-card-header">
        <h3 className="wedge-cal-club-title">{label}</h3>
        {isCalibrated && (
          <button
            className="wedge-cal-reset-btn"
            onClick={() => {
              resetClub(clubId);
              setSelectedPos(null);
              setAnchorYards('');
              setSelectedPos2(null);
              setAnchorYards2('');
              setOverrideValues({});
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* ── Anchor section ──────────────────────────────────────────────── */}
      <div className="wedge-cal-anchor">
        <p className="wedge-cal-anchor-hint">
          Enter your yardage for one swing position. Add a second for a sharper fit.
        </p>

        {/* ── First anchor ── */}
        <p className="wedge-cal-anchor-label">Your yardage</p>
        <div className="wedge-cal-pos-row">
          {CLOCK_POSITIONS.filter(p => p.calibrate).map(pos => (
            <button
              key={pos.key}
              className={`wedge-cal-pos-btn${selectedPos === pos.key ? ' wedge-cal-pos-btn--active' : ''}`}
              onClick={() => setSelectedPos(pos.key)}
            >
              {pos.label}
            </button>
          ))}
        </div>
        <div className="wedge-cal-yardage-row">
          <label className="wedge-cal-label">
            {selectedPos
              ? `${CLOCK_POSITIONS.find(p => p.key === selectedPos)?.label} distance (yds)`
              : 'Carry yardage (yds)'}
          </label>
          <input
            type="number"
            className="wedge-cal-input"
            value={anchorYards}
            onChange={e => setAnchorYards(e.target.value === '' ? '' : Number(e.target.value))}
            onFocus={e => e.target.select()}
            placeholder="90"
            min={1}
            max={300}
          />
        </div>

        {/* ── Second anchor (optional) ── */}
        <p className="wedge-cal-anchor-label wedge-cal-anchor-label--optional">
          Second distance <span className="wedge-cal-optional-tag">optional</span>
        </p>
        <div className="wedge-cal-pos-row">
          {CLOCK_POSITIONS.filter(p => p.calibrate).map(pos => (
            <button
              key={pos.key}
              className={`wedge-cal-pos-btn${selectedPos2 === pos.key ? ' wedge-cal-pos-btn--active' : ''}${selectedPos === pos.key ? ' wedge-cal-pos-btn--used' : ''}`}
              onClick={() => setSelectedPos2(prev => prev === pos.key ? null : pos.key)}
              disabled={selectedPos === pos.key}
            >
              {pos.label}
            </button>
          ))}
        </div>
        <div className="wedge-cal-yardage-row">
          <label className="wedge-cal-label">
            {selectedPos2
              ? `${CLOCK_POSITIONS.find(p => p.key === selectedPos2)?.label} distance (yds)`
              : 'Carry yardage (yds)'}
          </label>
          <input
            type="number"
            className="wedge-cal-input"
            value={anchorYards2}
            onChange={e => setAnchorYards2(e.target.value === '' ? '' : Number(e.target.value))}
            onFocus={e => e.target.select()}
            placeholder="120"
            min={1}
            max={300}
            disabled={!selectedPos2}
          />
        </div>

        <button
          className={`wedge-cal-derive-btn${saved ? ' wedge-cal-derive-btn--saved' : ''}`}
          onClick={handleDerive}
          disabled={!selectedPos || !anchorYards}
        >
          {saved ? 'Saved ✓' : 'Apply to all'}
        </button>
      </div>

      {/* ── Override section (collapsed by default) ─────────────────────── */}
      {isCalibrated && (
        <div className="wedge-cal-overrides">
          <button
            className="wedge-cal-overrides-toggle"
            onClick={() => setShowOverrides(v => !v)}
          >
            <span>Fine-tune individual positions</span>
            {showOverrides ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </button>

          {showOverrides && (
            <div className="wedge-cal-override-grid">
              <div className="wedge-cal-override-header">
                <span>Position</span>
                <span>Carry (yds)</span>
                <span>Flight (yds)</span>
                <span>Source</span>
              </div>
              {CLOCK_POSITIONS.filter(p => p.calibrate).map(pos => {
                const entry = entries.find(e => e.clockPosition === pos.key);
                const isAnchor = (calibration.anchors[clubId] ?? []).includes(pos.key);
                return (
                  <div
                    key={pos.key}
                    className={`wedge-cal-override-row${isAnchor ? ' wedge-cal-override-row--anchor' : ''}`}
                  >
                    <span className="wedge-cal-override-pos">{pos.label}</span>
                    <input
                      type="number"
                      className="wedge-cal-override-input"
                      value={getOverrideYards(pos.key)}
                      onChange={e => handleOverrideChange(pos.key, 'yards', e.target.value)}
                      onBlur={() => handleOverrideBlur(pos.key)}
                      onFocus={e => e.target.select()}
                      placeholder="—"
                      min={1}
                      max={300}
                    />
                    <input
                      type="number"
                      className="wedge-cal-override-input"
                      value={getOverrideFlight(pos.key)}
                      onChange={e => handleOverrideChange(pos.key, 'flight', e.target.value)}
                      onBlur={() => handleOverrideBlur(pos.key)}
                      onFocus={e => e.target.select()}
                      placeholder="—"
                      min={1}
                      max={300}
                    />
                    <span className={`wedge-cal-source${entry?.derived ? ' wedge-cal-source--est' : ''}`}>
                      {isAnchor ? 'anchor' : entry?.derived ? 'est.' : 'manual'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function WedgeCalibratePage() {
  const { calibration, setAnchor, overrideEntry, resetClub, getClubEntries } =
    useWedgeCalibration();

  return (
    <>
      {/* Header */}
      <div className="app-header app-header--centered-title">
        <Link to="/wedges" className="wedge-back-link">
          <IconArrowLeft size={20} stroke={2} />
        </Link>
        <span className="wedge-header-title">Calibrate</span>
        <span style={{ width: 20 }} />
      </div>

      <div className="wedge-cal-body">
        <p className="wedge-cal-intro">
          Calibrate each wedge to the clock system. Enter your yardage for one swing and we'll fill in the rest.
        </p>

        {WEDGE_CLUBS.map(club => (
          <ClubCalCard
            key={club.id}
            clubId={club.id}
            label={club.label}
            calibration={calibration}
            setAnchor={setAnchor}
            overrideEntry={overrideEntry}
            resetClub={resetClub}
            getClubEntries={getClubEntries}
          />
        ))}

        <div className="wedge-cal-tip">
          <strong>Tip:</strong> Think in 5-yard increments, not exact yardages.
          Pick the nearest 5-yard "feel" and commit. Positions marked <em>est.</em> are derived —
          go verify them on the range!
        </div>
      </div>
    </>
  );
}
