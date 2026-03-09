import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IconArrowLeft } from '@tabler/icons-react';

import { getPuttingData } from '../hooks/usePuttingData';
import { useCalibration } from '../hooks/useCalibration';
import { useUnits } from '../hooks/useUnits';
import { StimpToggle } from '../components/StimpToggle';
import { findBackswingInches } from '../lib/backswing';

const TEST_DISTANCES = [6, 10, 15, 20, 30];
const PREVIEW_DISTANCES = [5, 10, 15, 20, 25, 30, 40, 50];

// ── Calibration status ────────────────────────────────────────────────────────

function factorToPct(df: number): number {
  const min = 0.6, center = 1.0, max = 1.5;
  if (df <= center) return ((df - min) / (center - min)) * 50;
  return 50 + ((df - center) / (max - center)) * 50;
}

function factorNote(df: number): string {
  if (df < 0.85) return 'Your stroke is noticeably shorter than the Bryson baseline.';
  if (df > 1.15) return 'Your stroke is noticeably longer than the Bryson baseline.';
  if (df < 0.97) return 'Your stroke is slightly shorter than the baseline.';
  if (df > 1.03) return 'Your stroke is slightly longer than the baseline.';
  return 'Your stroke matches the baseline — no adjustment applied.';
}

// ── Page component ────────────────────────────────────────────────────────────

export function CalibratePage() {
  const data = getPuttingData();
  const { calibration, saveCalibration, resetCalibration } = useCalibration();
  const { unit, toggleUnit, fmtDist, fmtBackswing } = useUnits();
  const location = useLocation();
  const navigate = useNavigate();
  const fromOnboarding = new URLSearchParams(location.search).get('from') === 'onboarding';

  const [testStimp, setTestStimp] = useState(10);
  const [testDist, setTestDist]   = useState(10);
  // myInches null → not yet initialised from calibration
  const [myInches, setMyInches]   = useState<number | null>(null);
  const [saveLabel, setSaveLabel] = useState('Save Calibration');

  const lagRows = data.lagPuttingTable.rows;

  // Re-initialise myInches whenever stimp, distance, or calibration changes
  useEffect(() => {
    const baseline = findBackswingInches(testDist, testStimp, lagRows);
    if (baseline === null) { setMyInches(null); return; }
    const raw = Math.round(baseline * calibration.distanceFactor * 4) / 4;
    setMyInches(Math.max(0.5, Math.min(baseline * 2, raw)));
  }, [testDist, testStimp, calibration.distanceFactor, lagRows]);

  const baseline = findBackswingInches(testDist, testStimp, lagRows);

  function adjustMy(delta: number) {
    if (myInches === null) return;
    const next = Math.max(0.5, myInches + delta);
    setMyInches(Math.round(next * 4) / 4);
  }

  function handleSave() {
    if (baseline === null || myInches === null) return;
    const distanceFactor = Math.round((myInches / baseline) * 1000) / 1000;
    saveCalibration({ distanceFactor });
    if (fromOnboarding) {
      navigate('/');
      return;
    }
    setSaveLabel('Saved!');
    setTimeout(() => setSaveLabel('Save Calibration'), 1500);
  }

  function handleReset() {
    if (confirm('Reset to baseline? All calibration will be cleared.')) {
      resetCalibration();
    }
  }

  const df = calibration.distanceFactor;
  const pct = factorToPct(df);
  const barLeft  = Math.min(50, pct);
  const barWidth = Math.abs(pct - 50);
  const barColor = df >= 1.0 ? 'var(--green-accent)' : 'var(--gray-400)';
  const pctStr   = df === 1.0
    ? 'No adjustment'
    : `${df > 1.0 ? '+' : ''}${Math.round((df - 1.0) * 100)}% vs baseline`;

  return (
    <>
      {/* Header */}
      <div className="log-header">
        <Link
          to="/"
          className={`back-link${fromOnboarding ? ' invisible' : ''}`}
          aria-hidden={fromOnboarding}
        >
          <IconArrowLeft size={16} stroke={2} />
          Back
        </Link>
        <div className="header-brand">
          <img src="images/new-logo.png" alt="" className="header-logo" />
          <h1>Calibrate</h1>
        </div>
        <button
          className="unit-toggle"
          onClick={toggleUnit}
          aria-label={`Switch to ${unit === 'ft' ? 'metres' : 'feet'}`}
        >
          {unit === 'ft' ? 'ft' : 'm'}
        </button>
      </div>

      <p className="cal-intro">
        Pick a distance you know well and adjust the backswing until it matches
        your stroke. The app will scale all other distances to match.
      </p>

      {/* Status card */}
      <div className="status-card">
        <div className="status-row">
          <span className="status-label">Your Stroke</span>
          <span className="status-value">{df.toFixed(2)}×</span>
        </div>
        <div className="status-bar-wrap">
          <div
            className="status-bar"
            style={{ left: `${barLeft}%`, width: `${barWidth}%`, background: barColor }}
          />
          <div className="status-bar-center" />
        </div>
        <div className="status-note">
          {pctStr} — {factorNote(df)}
        </div>
      </div>

      {/* Tool card */}
      <div className="tool-card">
        {/* Stimp toggle */}
        <div className="tool-field">
          <label className="tool-label">Green Speed (Stimp)</label>
          <StimpToggle value={testStimp} onChange={setTestStimp} variant="light" />
        </div>

        {/* Distance chips */}
        <div className="tool-field">
          <label className="tool-label">Test Distance</label>
          <div className="dist-chips">
            {TEST_DISTANCES.map(d => (
              <button
                key={d}
                className={`dist-chip${testDist === d ? ' dist-chip-active' : ''}`}
                onClick={() => setTestDist(d)}
              >
                {fmtDist(d)}
              </button>
            ))}
          </div>
        </div>

        {/* Baseline vs My Backswing */}
        <div className="adjust-area">
          <div className="adjust-col">
            <div className="adjust-label">Baseline</div>
            <div className="adjust-value baseline-val">
              {baseline !== null ? fmtBackswing(baseline) : '—'}
            </div>
          </div>
          <div className="adjust-arrow">→</div>
          <div className="adjust-col">
            <div className="adjust-label">My Backswing</div>
            <div className="adjust-my-row">
              <button className="adj-btn" onClick={() => adjustMy(-0.25)} aria-label="Decrease">−</button>
              <div className="adjust-value my-val">
                {myInches !== null ? fmtBackswing(myInches) : '—'}
              </div>
              <button className="adj-btn" onClick={() => adjustMy(+0.25)} aria-label="Increase">+</button>
            </div>
          </div>
        </div>

        <button className="save-btn" onClick={handleSave}>{saveLabel}</button>
        <button className="reset-btn" onClick={handleReset}>Reset to Baseline</button>
      </div>

      {/* Preview table */}
      <div className="preview-card">
        <div className="preview-title">How This Changes Your Numbers</div>
        <div>
          <div className="preview-header">
            <div className="preview-header-dist">Dist</div>
            <div className="preview-header-col">Baseline</div>
            <div className="preview-header-arrow">·</div>
            <div className="preview-header-col">Your Swing</div>
          </div>
          {PREVIEW_DISTANCES.map(d => {
            const bl = findBackswingInches(d, testStimp, lagRows);
            if (bl === null) return null;
            const mine    = bl * df;
            const isSame  = Math.abs(df - 1.0) < 0.01;
            const isTest  = d === testDist;
            return (
              <div key={d} className={`preview-row${isTest ? ' preview-highlight' : ''}`}>
                <div className="preview-dist">{fmtDist(d)}</div>
                <div className="preview-baseline">{fmtBackswing(bl)}</div>
                <div className="preview-arrow">→</div>
                <div className={`preview-mine${isSame ? ' same' : ''}`}>
                  {isSame ? fmtBackswing(bl) : fmtBackswing(mine)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
