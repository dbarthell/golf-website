import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { IconArrowLeft, IconTrash, IconPlus, IconCheck } from '@tabler/icons-react';

import { useBagData } from '../hooks/useBagData';
import { EXTRA_CLUBS, DEFAULT_CLUBS } from '../lib/bag';
import type { BagEntry, BagClub } from '../lib/bag';

// ── Single club row ───────────────────────────────────────────────────────────

interface ClubRowProps {
  club: BagClub;
  existing: BagEntry | undefined;
  pelzOffset: number;
  onSetEntry: (entry: BagEntry) => void;
  onClearEntry: (clubId: string) => void;
  onRemove: (id: string) => void;
}

function ClubRow({ club, existing, pelzOffset, onSetEntry, onClearEntry, onRemove }: ClubRowProps) {
  // Local field state — initialized once from existing entry
  const [fullTotal, setFullTotal]       = useState<string>(() => existing?.fullTotal ? String(existing.fullTotal) : '');
  const [fullCarry, setFullCarry]       = useState<string>(() => existing?.fullCarry ? String(existing.fullCarry) : '');
  const [pelzTotal, setPelzTotal]       = useState<string>(() => existing?.pelzOverride && existing.pelzTotal ? String(existing.pelzTotal) : '');
  const [pelzCarry, setPelzCarry]       = useState<string>(() => existing?.pelzOverride && existing.pelzCarry ? String(existing.pelzCarry) : '');
  const [pelzUnlocked, setPelzUnlocked] = useState(() => existing?.pelzOverride ?? false);

  const isCalibrated = pelzUnlocked && !!pelzTotal;

  function buildEntry(): BagEntry | null {
    const ft = parseInt(fullTotal, 10);
    if (!ft || ft <= 0) return null;
    const fc = parseInt(fullCarry, 10) || null;

    let pt: number | null = null;
    let pc: number | null = null;
    let override = false;

    if (pelzUnlocked) {
      pt = parseInt(pelzTotal, 10) || null;
      pc = parseInt(pelzCarry, 10) || null;
      override = pt !== null;
    }

    return { clubId: club.id, fullTotal: ft, fullCarry: fc, pelzTotal: pt, pelzCarry: pc, pelzOverride: override };
  }

  function handleBlur() {
    const entry = buildEntry();
    if (entry) {
      onSetEntry(entry);
    } else {
      onClearEntry(club.id);
    }
  }

  function handleUnlockPelz() {
    setPelzUnlocked(true);
    if (!pelzTotal) {
      const ft = parseInt(fullTotal, 10);
      if (ft > 0) setPelzTotal(String(Math.round(ft * (1 - pelzOffset / 100))));
    }
    if (!pelzCarry) {
      const fc = parseInt(fullCarry, 10);
      if (fc > 0) setPelzCarry(String(Math.round(fc * (1 - pelzOffset / 100))));
    }
  }

  const estPelzTotal = (() => { const ft = parseInt(fullTotal, 10); return ft > 0 ? Math.round(ft * (1 - pelzOffset / 100)) : null; })();
  const estPelzCarry = (() => { const fc = parseInt(fullCarry, 10); return fc > 0 ? Math.round(fc * (1 - pelzOffset / 100)) : null; })();

  return (
    <div className="bag-edit-row">
      <div className="bag-edit-row-header">
        <span className="bag-edit-club-label">{club.label}</span>
        <button className="bag-edit-remove-btn" onClick={() => onRemove(club.id)} aria-label={`Remove ${club.label}`}>
          <IconTrash size={16} stroke={1.75} />
        </button>
      </div>

      <div className="bag-edit-fields">
        {/* Full swing */}
        <div className="bag-edit-field-group">
          <span className="bag-edit-swing-label">Full</span>
          <div className="bag-edit-field-pair">
            <div className="bag-edit-field">
              <label className="bag-edit-field-label">Total</label>
              <input type="number" inputMode="numeric" className="bag-edit-input"
                value={fullTotal} onChange={e => setFullTotal(e.target.value)}
                onBlur={handleBlur} onFocus={e => e.currentTarget.select()}
                placeholder="—" min={1} max={400} />
            </div>
            <div className="bag-edit-field">
              <label className="bag-edit-field-label">Carry</label>
              <input type="number" inputMode="numeric" className="bag-edit-input bag-edit-input--optional"
                value={fullCarry} onChange={e => setFullCarry(e.target.value)}
                onBlur={handleBlur} onFocus={e => e.currentTarget.select()}
                placeholder="opt." min={1} max={400} />
            </div>
          </div>
        </div>

        {/* 10:30 — irons/wedges only */}
        {club.hasPelz && (
          <div className="bag-edit-field-group bag-edit-field-group--pelz">
            <span className="bag-edit-swing-label">
              Flighted
              {isCalibrated && <span className="bag-edit-calibrated-dot" title="Measured" />}
            </span>

            {!pelzUnlocked ? (
              <button className="bag-edit-pelz-estimate" onClick={handleUnlockPelz} disabled={!fullTotal}>
                {estPelzTotal !== null ? (
                  <>
                    <span className="bag-edit-est-value">~{estPelzTotal}</span>
                    {estPelzCarry !== null && <span className="bag-edit-est-carry"> / ~{estPelzCarry}</span>}
                    <span className="bag-edit-est-label"> est. — tap to enter real</span>
                  </>
                ) : (
                  <span className="bag-edit-est-label">Enter full yardage first</span>
                )}
              </button>
            ) : (
              <div className="bag-edit-field-pair">
                <div className="bag-edit-field">
                  <label className="bag-edit-field-label">
                    Total {isCalibrated && <IconCheck size={11} className="bag-edit-check" />}
                  </label>
                  <input type="number" inputMode="numeric" className="bag-edit-input"
                    value={pelzTotal} onChange={e => setPelzTotal(e.target.value)}
                    onBlur={handleBlur} onFocus={e => e.currentTarget.select()}
                    placeholder="—" min={1} max={400} autoFocus />
                </div>
                <div className="bag-edit-field">
                  <label className="bag-edit-field-label">Carry</label>
                  <input type="number" inputMode="numeric" className="bag-edit-input bag-edit-input--optional"
                    value={pelzCarry} onChange={e => setPelzCarry(e.target.value)}
                    onBlur={handleBlur} onFocus={e => e.currentTarget.select()}
                    placeholder="opt." min={1} max={400} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Club bottom sheet ─────────────────────────────────────────────────────

interface AddClubSheetProps {
  existingIds: string[];
  onAdd: (club: BagClub) => void;
  onClose: () => void;
}

function AddClubSheet({ existingIds, onAdd, onClose }: AddClubSheetProps) {
  const [customLabel, setCustomLabel] = useState('');
  // Show any default clubs that have been removed, plus the extras list
  const available = [...DEFAULT_CLUBS, ...EXTRA_CLUBS]
    .filter(c => !existingIds.includes(c.id))
    .filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i) // dedupe
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .reverse();

  function addCustom() {
    const label = customLabel.trim().toUpperCase();
    if (!label) return;
    const id = label.toLowerCase().replace(/\s+/g, '-');
    onAdd({ id, label, category: 'iron', order: 99, hasPelz: true });
    onClose();
  }

  return (
    <div className="bag-sheet-backdrop" onClick={onClose}>
      <div className="bag-sheet" onClick={e => e.stopPropagation()}>
        <div className="bag-sheet-handle" />
        <h3 className="bag-sheet-title">Add a club</h3>

        {available.length > 0 && (
          <div className="bag-sheet-options">
            {available.map(club => (
              <button key={club.id} className="bag-sheet-option" onClick={() => { onAdd(club); onClose(); }}>
                {club.label}
              </button>
            ))}
          </div>
        )}

        <div className="bag-sheet-custom">
          <label className="bag-edit-field-label">Custom club name</label>
          <div className="bag-sheet-custom-row">
            <input type="text" className="bag-edit-input bag-sheet-custom-input"
              placeholder="e.g. 2H, 7W..."
              value={customLabel} onChange={e => setCustomLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCustom(); }} />
            <button className="bag-sheet-custom-add" onClick={addCustom} disabled={!customLabel.trim()}>
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function BagEditPage() {
  const { allClubs, bagData, addClub, removeClub, setEntry, clearEntry, getEntry, updateSettings } = useBagData();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const offsetRef = useRef<HTMLInputElement>(null);

  const pelzOffset = bagData.settings.pelzOffset;

  function handleOffsetBlur() {
    const val = parseInt(offsetRef.current?.value ?? '', 10);
    if (!isNaN(val) && val >= 0 && val <= 50) {
      updateSettings({ pelzOffset: val });
    }
  }

  return (
    <>
      <div className="app-header app-header--centered-title">
        <Link to="/bag" className="wedge-back-link" aria-label="Back to My Clubs">
          <IconArrowLeft size={20} stroke={2} />
        </Link>
        <span className="wedge-header-title">Edit Clubs</span>
        <span style={{ width: 20 }} />
      </div>

      <div className="bag-edit-body">

        {/* ── Pelz offset ─────────────────────────────────────────────────── */}
        <div className="bag-edit-offset-card">
          <div className="bag-edit-offset-row">
            <label className="bag-edit-offset-label" htmlFor="pelz-offset">
              Flighted default estimate
            </label>
            <div className="bag-edit-offset-input-wrap">
              <input id="pelz-offset" type="number" inputMode="numeric"
                className="bag-edit-input bag-edit-offset-input"
                ref={offsetRef} defaultValue={pelzOffset}
                onBlur={handleOffsetBlur} onFocus={e => e.currentTarget.select()}
                min={0} max={30} />
              <span className="bag-edit-offset-unit">% less than full</span>
            </div>
          </div>
          <p className="bag-edit-offset-hint">
            Used only for clubs you haven't measured yet — your actual flighted
            yardage is unique to you. Enter real numbers below when you have them.
          </p>
        </div>

        <p className="bag-edit-pelz-note">
          <strong>Flighted</strong> = lower flight, less spin. Better for poorer conditions.
        </p>

        {/* ── Club rows ────────────────────────────────────────────────────── */}
        {allClubs.map(club => (
          <ClubRow
            key={club.id}
            club={club}
            existing={getEntry(club.id)}
            pelzOffset={pelzOffset}
            onSetEntry={setEntry}
            onClearEntry={clearEntry}
            onRemove={removeClub}
          />
        ))}

        <button className="bag-edit-add-btn" onClick={() => setShowAddSheet(true)}>
          <IconPlus size={18} stroke={2} />
          Add a club
        </button>

      </div>

      {showAddSheet && (
        <AddClubSheet
          existingIds={allClubs.map(c => c.id)}
          onAdd={addClub}
          onClose={() => setShowAddSheet(false)}
        />
      )}
    </>
  );
}
