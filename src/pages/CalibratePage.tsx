import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconChevronDown, IconChevronUp } from '@tabler/icons-react';

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
  const [testDist,   setTestDist]   = useState(10);
  const [myInches,   setMyInches]   = useState<number>(DEFAULT_BACKSWING);
  const [showPoint2, setShowPoint2] = useState(false);
  const [testDist2,  setTestDist2]  = useState<number | null>(null);
  const [myInches2,  setMyInches2]  = useState<number>(DEFAULT_BACKSWING);
  const [stanceWidth, setStanceWidth] = useState<number>(() => calibration.stanceWidth ?? 12);
  const [saved, setSaved] = useState(false);

  const lagRows = data.lagPuttingTable.rows;

  // Re-initialise point 1 when distance/stimp changes
  useEffect(() => {
    const baseline = findBackswingInches(testDist + 1, testStimp, lagRows);
    if (baseline === null) return;
    if (calibration.distanceFactor !== 1.0) {
      const raw = Math.round((baseline * calibration.distanceFactor + calibration.distanceOffset) * 4) / 4;
      setMyInches(Math.max(0.5, Math.min(baseline * 2, raw)));
    } else {
      setMyInches(DEFAULT_BACKSWING);
    }
  }, [testDist, testStimp, calibration.distanceFactor, calibration.distanceOffset, lagRows]);

  // Re-initialise point 2 when distance changes
  useEffect(() => {
    if (testDist2 === null) return;
    const b2 = findBackswingInches(testDist2 + 1, testStimp, lagRows);
    if (b2 === null) return;
    setMyInches2(Math.round(b2 * 4) / 4);
  }, [testDist2, testStimp, lagRows]);

  const baseline  = findBackswingInches(testDist + 1,  testStimp, lagRows);
  const baseline2 = testDist2 !== null ? findBackswingInches(testDist2 + 1, testStimp, lagRows) : null;
  const df  = calibration.distanceFactor;
  const dof = calibration.distanceOffset;

  function adjustMy(delta: number) {
    setMyInches(prev => Math.round(Math.max(0.5, prev + delta) * 4) / 4);
  }
  function adjustMy2(delta: number) {
    setMyInches2(prev => Math.round(Math.max(0.5, prev + delta) * 4) / 4);
  }
  function adjustStance(delta: number) {
    setStanceWidth(w => Math.round(Math.max(6, Math.min(20, w + delta)) * 2) / 2);
  }

  function handleSave() {
    if (baseline === null) return;

    // Two-point linear fit when both points are valid and different distances
    if (baseline2 !== null && testDist2 !== testDist && Math.abs(baseline2 - baseline) > 0.01) {
      const a = (myInches2 - myInches) / (baseline2 - baseline);
      const b = myInches - a * baseline;
      saveCalibration({
        distanceFactor: Math.round(a * 1000) / 1000,
        distanceOffset: Math.round(b * 1000) / 1000,
        stanceWidth,
      });
    } else {
      saveCalibration({
        distanceFactor: Math.round((myInches / baseline) * 1000) / 1000,
        distanceOffset: 0,
        stanceWidth,
      });
    }
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
          <IconArrowLeft size={20} stroke={2} />
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
          <p>Dial in two things: your <strong>backstroke length</strong> and your <strong>trail foot distance</strong>. Together they personalize your Backstroke Reference table.</p>
          <p>For backstroke: pick a distance, putt until the ball rolls 1–2 feet past, then match the adjuster to your stroke. Add a second distance for a more accurate fit.</p>
        </div>

        {/* Stimp toggle */}
        <div className="tool-field">
          <label className="tool-label">Green Speed (Stimp)</label>
          <StimpToggle value={testStimp} onChange={setTestStimp} variant="light" />
          <p className="field-hint">Not sure? 9 is typical for most public courses.</p>
        </div>

        {/* Distance chips */}
        <div className="tool-field">
          <label className="tool-label">Test distance</label>
          <div className="dist-chips">
            {TEST_DISTANCES.map(d => (
              <button
                key={d}
                className={`dist-chip${testDist === d ? ' dist-chip-active' : ''}${testDist2 === d ? ' dist-chip-used' : ''}`}
                onClick={() => setTestDist(d)}
                disabled={testDist2 === d}
              >
                {fmtDist(d)}
              </button>
            ))}
          </div>
        </div>

        {/* Backstroke + Trail Foot side by side */}
        <div className="adjust-area">
          <div className="adjust-col">
            <div className="adjust-label">My Backstroke</div>
            <div className="adjust-my-row">
              <button className="adj-btn" onClick={() => adjustMy(-0.25)} aria-label="Decrease">−</button>
              <div className="adjust-value my-val">{fmtBackswing(myInches)}</div>
              <button className="adj-btn" onClick={() => adjustMy(+0.25)} aria-label="Increase">+</button>
            </div>
          </div>
          <div className="adjust-col">
            <div className="adjust-label">Trail Foot Distance</div>
            <div className="adjust-my-row">
              <button className="adj-btn" onClick={() => adjustStance(-0.5)} aria-label="Decrease">−</button>
              <div className="adjust-value my-val">{stanceWidth}"</div>
              <button className="adj-btn" onClick={() => adjustStance(+0.5)} aria-label="Increase">+</button>
            </div>
          </div>
        </div>
        <p className="field-hint cal-stance-hint">Measure from the ball to the middle of your trail foot. Default is 12″.</p>

        {/* ── Point 2 — collapsible ── */}
        <button
          className="cal-point2-toggle"
          onClick={() => {
            setShowPoint2(v => !v);
            if (showPoint2) { setTestDist2(null); }
          }}
        >
          <span>Add a second distance</span>
          {showPoint2 ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        </button>

        {showPoint2 && (
          <div className="cal-point2-body">
            <div className="dist-chips">
              {TEST_DISTANCES.map(d => (
                <button
                  key={d}
                  className={`dist-chip${testDist2 === d ? ' dist-chip-active' : ''}${testDist === d ? ' dist-chip-used' : ''}`}
                  onClick={() => setTestDist2(prev => prev === d ? null : d)}
                  disabled={testDist === d}
                >
                  {fmtDist(d)}
                </button>
              ))}
            </div>
            {testDist2 !== null && (
              <div className="adjust-area" style={{ marginTop: '0.75rem' }}>
                <div className="adjust-col" style={{ flex: 1 }}>
                  <div className="adjust-label">My Backstroke at {fmtDist(testDist2)}</div>
                  <div className="adjust-my-row">
                    <button className="adj-btn" onClick={() => adjustMy2(-0.25)} aria-label="Decrease">−</button>
                    <div className="adjust-value my-val">{fmtBackswing(myInches2)}</div>
                    <button className="adj-btn" onClick={() => adjustMy2(+0.25)} aria-label="Increase">+</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
              <div className="preview-header-col">Backstroke</div>
            </div>
            {PREVIEW_DISTANCES.map(d => {
              const bs = backswingRaw(d, testStimp, lagRows, df, dof);
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
