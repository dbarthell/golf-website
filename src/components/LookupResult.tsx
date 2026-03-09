import { useState } from 'react';
import type { LookupResult } from '../lib/types';
import { fmtInches } from '../lib/zbl';
import type { PuttOutcome } from '../hooks/usePuttLog';
import { useUnits } from '../hooks/useUnits';

interface PuttContext {
  distance: number;
  slope: number;
  stimp: number;
  clock: string | null;
}

interface Props {
  result: LookupResult | null;
  puttContext?: PuttContext;
  onLogPutt?: (entry: Omit<import('../hooks/usePuttLog').PuttEntry, 'id' | 'timestamp'>) => void;
}

const OUTCOMES: { key: PuttOutcome; label: string; emoji: string }[] = [
  { key: 'made',  label: 'Made',  emoji: '✓' },
  { key: 'short', label: 'Short', emoji: '↓' },
  { key: 'long',  label: 'Long',  emoji: '↑' },
  { key: 'left',  label: 'Left',  emoji: '←' },
  { key: 'right', label: 'Right', emoji: '→' },
];

export function LookupResultPanel({ result, puttContext, onLogPutt }: Props) {
  const { unit, fmtDist, fmtAim, fmtAimVariance, fmtBackswing } = useUnits();
  const [picking, setPicking] = useState(false);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);

  function handleOutcome(outcome: PuttOutcome) {
    if (!puttContext || !onLogPutt) return;
    onLogPutt({ ...puttContext, outcome });
    setPicking(false);
    setSavedLabel(`Logged: ${outcome}`);
    setTimeout(() => setSavedLabel(null), 2000);
  }

  const canLog = !!(puttContext && onLogPutt && result && result.kind !== 'empty');

  const logSection = canLog ? (
    <div className="log-putt-section">
      {savedLabel ? (
        <div className="outcome-saved">{savedLabel}</div>
      ) : picking ? (
        <div className="outcome-picker">
          {OUTCOMES.map(({ key, label, emoji }) => (
            <button
              key={key}
              className={`outcome-btn${key === 'made' ? ' outcome-btn-made' : ' outcome-btn-miss'}`}
              onClick={() => handleOutcome(key)}
            >
              <span className="outcome-emoji">{emoji}</span>
              <span className="outcome-label">{label}</span>
            </button>
          ))}
          <button className="outcome-cancel" onClick={() => setPicking(false)}>✕</button>
        </div>
      ) : (
        <button className="log-putt-btn" onClick={() => setPicking(true)}>
          Log this putt
        </button>
      )}
    </div>
  ) : null;

  if (!result || result.kind === 'empty') {
    return (
      <div className="lookup-result">
        <div className="result-empty">
          {result ? result.message : 'Enter a distance above'}
        </div>
      </div>
    );
  }

  if (result.kind === 'straight') {
    const {
      backswing, zblRaw, zblPlus, zblMinus, slopeLabel, slope, stimp,
      uphillTotal, downhillTotal, uphillBS, downhillBS,
    } = result;

    // Format aim value in the current unit
    const zblDisplayFmt = fmtAim(zblRaw);

    // Format a variance value in the current unit:
    // imperial → round to nearest 0.5" (return null if rounds to zero)
    // metric   → convert via fmtAimVariance (includes "cm" unit suffix)
    function vFmt(s: string | null): string | null {
      if (!s) return null;
      if (unit === 'm') {
        const cm = fmtAimVariance(s);
        return cm || null;
      }
      const r = Math.round(parseFloat(s) * 2) / 2;
      return r > 0 ? (r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)) + '"' : null;
    }
    // Always show a single ±N line using whichever side is available.
    // Minus is preferred (present on every row); plus is the fallback.
    const v = vFmt(zblMinus ?? zblPlus);

    const stimpScale = stimp / 10;
    const uphillRate   = Math.round(1   * stimpScale * 10) / 10;
    const downhillRate = Math.round(1.5 * stimpScale * 10) / 10;
    const flatNote = unit === 'm'
      ? `Uphill: +${(uphillRate * 0.3048).toFixed(1)} m/3 m/1%  ·  Downhill: −${(downhillRate * 0.3048).toFixed(1)} m/3 m/1%`
      : `Uphill: +${uphillRate} ft/10 ft/1%  ·  Downhill: −${downhillRate} ft/10 ft/1%`;

    return (
      <div className="lookup-result">
        <div className="result-content">
          <div className="result-row">
            <div className="result-item">
              <div className="result-value">{backswing !== null ? fmtBackswing(backswing) : '—'}</div>
              <div className="result-label">Backswing</div>
              {slope === 0 && (
                <div
                  className="slope-note"
                  dangerouslySetInnerHTML={{ __html: flatNote.replace('  ·  ', '<br>') }}
                />
              )}
            </div>
            <div className="result-divider" />
            <div className="result-item">
              <div className="result-value">{zblDisplayFmt}</div>
              <div className="result-label">{slopeLabel}</div>
              {v && (
                <div className="result-variance">&plusmn;{v}</div>
              )}
            </div>
          </div>

          {slope > 0 && (
            <div className="slope-row">
              <span className="slope-item slope-up">↑ {fmtDist(uphillTotal)} · {uphillBS !== null ? fmtBackswing(uphillBS) : '—'}</span>
              <span className="slope-item slope-down">↓ {fmtDist(downhillTotal)} · {downhillBS !== null ? fmtBackswing(downhillBS) : '—'}</span>
            </div>
          )}
        </div>
        {logSection}
      </div>
    );
  }

  // Clock mode
  const {
    backswing, namedAim, edgeAim, zblAimBase, breakAbs,
    breakFactor, uphillFactor, adjDist, slope,
  } = result;

  const breakDir = breakAbs < 0.05
    ? 'Straight'
    : breakFactor > 0 ? 'R→L' : 'L→R';

  // Format edge aim in the current unit
  const edgeAimFmt = unit === 'm'
    ? <>{fmtAim(edgeAim)}<span className="result-unit">out</span></>
    : <>{fmtInches(edgeAim)}<span className="result-unit">out</span></>;

  const zblAimFmt = unit === 'm'
    ? fmtAim(zblAimBase)
    : fmtInches(zblAimBase);

  const aimCell = breakAbs >= 0.05 ? (
    <div className="result-item">
      {namedAim
        ? <div className="result-value result-value-word">{namedAim}</div>
        : (
          <div className="result-value-with-unit">
            {edgeAimFmt}
          </div>
        )
      }
      <div className="result-label">Aim</div>
      <div className="result-zbl-ref">ZBL {zblAimFmt}</div>
    </div>
  ) : (
    <div className="result-item">
      <div className="result-value result-value-word">Straight</div>
      <div className="result-zbl-ref">ZBL {zblAimFmt}</div>
    </div>
  );

  const showSlopeRow = slope > 0 && Math.abs(uphillFactor) > 0.05;
  const isUphill = uphillFactor > 0;

  return (
    <div className="lookup-result">
      <div className="result-content">
        <div className="result-row">
          <div className="result-item">
            <div className="result-value">{backswing}</div>
            <div className="result-label">Backswing</div>
          </div>
          <div className="result-divider" />
          {aimCell}
        </div>

        {showSlopeRow && (
          <div className="slope-row slope-row-centered">
            <span className={`slope-dir ${isUphill ? 'slope-up' : 'slope-down'}`}>
              {isUphill ? '↑ Uphill' : '↓ Downhill'}
            </span>
            <span className="slope-dist">{fmtDist(adjDist)}</span>
          </div>
        )}

        {breakAbs >= 0.05 && (
          <div className="slope-row slope-row-centered" style={{ borderTop: 'none', paddingTop: 0 }}>
            <span className="slope-dir" style={{ color: 'var(--gray-400)' }}>{breakDir}</span>
          </div>
        )}
      </div>
      {logSection}
    </div>
  );
}
