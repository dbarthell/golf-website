import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IconArrowLeft } from '@tabler/icons-react';

import { getPuttingData } from '../hooks/usePuttingData';
import { useCalibration } from '../hooks/useCalibration';
import { useUnits } from '../hooks/useUnits';
import { StimpToggle } from '../components/StimpToggle';
import { findBackswingInches, backswingRaw } from '../lib/backswing';

const TEST_DISTANCES = [6, 10, 15, 20, 30];
const PREVIEW_DISTANCES = [5, 10, 15, 20, 25, 30, 40, 50];
const DEFAULT_BACKSWING = 10;

// ── Page component ────────────────────────────────────────────────────────────

export function CalibratePage() {
  const data = getPuttingData();
  const { calibration, saveCalibration, resetCalibration } = useCalibration();
  const { unit, toggleUnit, fmtDist, fmtBackswing } = useUnits();
  const location = useLocation();
  const navigate = useNavigate();
  const fromOnboarding = new URLSearchParams(location.search).get('from') === 'onboarding';

  const [testStimp, setTestStimpRaw] = useState(() => {
    const stored = localStorage.getItem('putt-stimp');
    const parsed = stored ? parseFloat(stored) : NaN;
    const val = isNaN(parsed) ? 9 : parsed;
    localStorage.setItem('putt-stimp', String(val));
    return val;
  });

  function setTestStimp(val: number) {
    setTestStimpRaw(val);
    localStorage.setItem('putt-stimp', String(val));
  }
  const [testDist, setTestDist]   = useState(10);
  const [myInches, setMyInches]   = useState<number>(DEFAULT_BACKSWING);
  const [saved, setSaved]         = useState(false);

  const lagRows = data.lagPuttingTable.rows;

  // Re-initialise myInches when calibration exists, or reset to default when distance/stimp changes
  useEffect(() => {
    const baseline = findBackswingInches(testDist + 1, testStimp, lagRows);
    if (baseline === null) return;
    if (calibration.distanceFactor !== 1.0) {
      const raw = Math.round(baseline * calibration.distanceFactor * 4) / 4;
      setMyInches(Math.max(0.5, Math.min(baseline * 2, raw)));
    } else {
      setMyInches(DEFAULT_BACKSWING);
    }
  }, [testDist, testStimp, calibration.distanceFactor, lagRows]);

  const baseline = findBackswingInches(testDist + 1, testStimp, lagRows);
  const df = calibration.distanceFactor;

  function adjustMy(delta: number) {
    const next = Math.max(0.5, myInches + delta);
    setMyInches(Math.round(next * 4) / 4);
  }

  function handleSave() {
    if (baseline === null) return;
    const distanceFactor = Math.round((myInches / baseline) * 1000) / 1000;
    saveCalibration({ distanceFactor });
    setSaved(true);
  }

  function handleReset() {
    if (confirm('Reset to baseline? All calibration will be cleared.')) {
      resetCalibration();
      setSaved(false);
    }
  }

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
        <h1>Calibrate</h1>
        <button
          className="unit-toggle"
          onClick={toggleUnit}
          aria-label={`Switch to ${unit === 'ft' ? 'metres' : 'feet'}`}
        >
          {unit === 'ft' ? 'ft' : 'm'}
        </button>
      </div>

      {/* Tool card */}
      <div className="tool-card">
        <div className="cal-intro">
          <p>Set your green speed and test distance below. A ruler or measuring tape will help you get the exact length.</p>
          <p>Adjust + and − until the backswing length rolls the ball 1–2 feet past the cup, then hit Save — the app scales every other distance to fit your stroke.</p>
        </div>

        {/* Stimp toggle */}
        <div className="tool-field">
          <label className="tool-label">Green Speed (Stimp)</label>
          <StimpToggle value={testStimp} onChange={setTestStimp} variant="light" />
          <p className="field-hint">Not sure? 9 is typical for most public courses.</p>
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

        {/* My Backswing */}
        <div className="adjust-area">
          <div className="adjust-col">
            <div className="adjust-label">My Backswing</div>
            <div className="adjust-my-row">
              <button className="adj-btn" onClick={() => adjustMy(-0.25)} aria-label="Decrease">−</button>
              <div className="adjust-value my-val">
                {fmtBackswing(myInches)}
              </div>
              <button className="adj-btn" onClick={() => adjustMy(+0.25)} aria-label="Increase">+</button>
            </div>
          </div>
        </div>

        <button className="save-btn" onClick={handleSave}>
          {saved ? 'Saved!' : 'Save Calibration'}
        </button>
        {saved && fromOnboarding && (
          <button className="save-btn go-to-app-btn" onClick={() => navigate('/')}>
            Go to App
          </button>
        )}
        <button className="reset-btn" onClick={handleReset}>Reset to Baseline</button>
      </div>

      {/* Preview table — shown after saving */}
      {saved && (
        <div className="preview-card">
          <div className="preview-title">Your Distances</div>
          <div>
            <div className="preview-header">
              <div className="preview-header-dist">Dist</div>
              <div className="preview-header-col">Backswing</div>
            </div>
            {PREVIEW_DISTANCES.map(d => {
              const bs = backswingRaw(d, testStimp, lagRows, df);
              if (bs === null) return null;
              return (
                <div key={d} className={`preview-row${d === testDist ? ' preview-highlight' : ''}`}>
                  <div className="preview-dist">{fmtDist(d)}</div>
                  <div className="preview-mine">{fmtBackswing(bs)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
