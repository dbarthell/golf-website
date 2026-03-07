import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IconArrowLeft, IconAdjustments } from '@tabler/icons-react';

import { usePuttingData } from '../hooks/usePuttingData';
import { useCalibration } from '../hooks/useCalibration';
import { findBackswingInches } from '../lib/backswing';

import StimpToggle from '../components/StimpToggle';

const TEST_DISTANCES = [6, 10, 15, 20, 30];
const PREVIEW_DISTS  = [5, 10, 15, 20, 25, 30, 40, 50];

function factorNote(df: number): string {
  if (df < 0.85) return 'Your stroke is noticeably shorter than the Bryson baseline.';
  if (df > 1.15) return 'Your stroke is noticeably longer than the Bryson baseline.';
  if (df < 0.97) return 'Your stroke is slightly shorter than the baseline.';
  if (df > 1.03) return 'Your stroke is slightly longer than the baseline.';
  return 'Your stroke matches the baseline — no adjustment applied.';
}

function factorToPct(val: number, min: number, center: number, max: number): number {
  if (val <= center) return ((val - min) / (center - min)) * 50;
  return 50 + ((val - center) / (max - center)) * 50;
}

function fmt(inches: number): string {
  return inches.toFixed(1) + '"';
}

export default function CalibratePage() {
  const { data }                             = usePuttingData();
  const { calibration, saveCalibration, resetCalibration } = useCalibration();
  const [searchParams]                       = useSearchParams();
  const navigate                             = useNavigate();
  const fromOnboarding                       = searchParams.get('from') === 'onboarding';

  const lagRows = data.lagPuttingTable.rows;

  // Read initial stimp / dist from URL params if present
  const initStimp = parseFloat(searchParams.get('stimp') ?? '10') || 10;
  const initDist  = parseFloat(searchParams.get('d') ?? '10') || 10;

  const [testStimp, setTestStimp] = useState<number>(initStimp);
  const [testDist,  setTestDist]  = useState<number>(
    TEST_DISTANCES.includes(initDist) ? initDist : 10,
  );
  const [myInches, setMyInches] = useState<number | null>(null);
  const [saved, setSaved]       = useState(false);

  // Derive baseline when stimp/dist changes
  const baseline = useMemo(
    () => findBackswingInches(testDist, testStimp, lagRows),
    [testDist, testStimp, lagRows],
  );

  // Initialise myInches from saved calibration whenever baseline changes
  const resolvedMy: number | null = (() => {
    if (baseline === null) return null;
    if (myInches !== null) return myInches;
    return Math.round(baseline * calibration.distanceFactor * 4) / 4;
  })();

  const clampedMy = resolvedMy !== null
    ? Math.max(0.5, Math.min(baseline! * 2, Math.round(resolvedMy * 4) / 4))
    : null;

  const handleStimpChange = (s: number) => {
    setTestStimp(s);
    setMyInches(null); // re-derive from saved cal at new stimp
  };

  const handleDistChange = (d: number) => {
    setTestDist(d);
    setMyInches(null);
  };

  const handleMinus = () => {
    if (clampedMy === null) return;
    setMyInches(Math.max(0.5, clampedMy - 0.25));
  };

  const handlePlus = () => {
    if (clampedMy === null) return;
    setMyInches(clampedMy + 0.25);
  };

  const handleSave = () => {
    if (baseline === null || clampedMy === null) return;
    const distanceFactor = Math.round((clampedMy / baseline) * 1000) / 1000;
    saveCalibration({ distanceFactor });
    if (fromOnboarding) {
      navigate('/');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleReset = () => {
    if (!window.confirm('Reset to baseline? All calibration will be cleared.')) return;
    resetCalibration();
    setMyInches(null);
  };

  const df = calibration.distanceFactor;
  const pct = factorToPct(df, 0.6, 1.0, 1.5);
  const barLeft  = Math.min(50, pct);
  const barWidth = Math.abs(pct - 50);
  const barColor = df >= 1.0 ? 'var(--green-accent)' : 'var(--gray-400)';
  const pctStr = df === 1.0
    ? 'No adjustment'
    : `${df > 1.0 ? '+' : ''}${Math.round((df - 1.0) * 100)}% vs baseline`;

  return (
    <div className="zb-page">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="log-header">
        {!fromOnboarding ? (
          <a href="#" className="back-link" onClick={e => { e.preventDefault(); navigate(-1); }}>
            <IconArrowLeft size={15} />
            Back
          </a>
        ) : (
          <div className="header-spacer" />
        )}
        <h1>
          <IconAdjustments
            size={18}
            style={{ verticalAlign: 'middle', marginRight: '0.3rem' }}
          />
          Calibrate
        </h1>
        <div className="header-spacer" />
      </div>

      <p className="cal-intro">
        Pick a distance you know well and adjust the backswing until it matches your stroke.
        The app will scale all other distances to match.
      </p>

      {/* ── Status card ─────────────────────────────────────── */}
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

      {/* ── Tool card ───────────────────────────────────────── */}
      <div className="tool-card">
        {/* Stimp */}
        <div className="tool-field">
          <label className="tool-label">Green Speed (Stimp)</label>
          <StimpToggle value={testStimp} onChange={handleStimpChange} variant="light" />
        </div>

        {/* Test distance chips */}
        <div className="tool-field">
          <label className="tool-label">Test Distance</label>
          <div className="dist-chips">
            {TEST_DISTANCES.map(d => (
              <button
                key={d}
                className={`dist-chip${d === testDist ? ' active' : ''}`}
                onClick={() => handleDistChange(d)}
              >
                {d} ft
              </button>
            ))}
          </div>
        </div>

        {/* Adjust area */}
        <div className="adjust-area">
          <div className="adjust-col">
            <div className="adjust-label">Baseline</div>
            <div className="adjust-value baseline-val">
              {baseline !== null ? fmt(baseline) : '—'}
            </div>
          </div>
          <div className="adjust-arrow">→</div>
          <div className="adjust-col">
            <div className="adjust-label">My Backswing</div>
            <div className="adjust-my-row">
              <button className="adj-btn" onClick={handleMinus}>−</button>
              <div className="adjust-value my-val">
                {clampedMy !== null ? fmt(clampedMy) : '—'}
              </div>
              <button className="adj-btn" onClick={handlePlus}>+</button>
            </div>
          </div>
        </div>

        <button className="save-btn" onClick={handleSave}>
          {saved ? 'Saved!' : 'Save Calibration'}
        </button>
        <button className="reset-btn" onClick={handleReset}>
          Reset to Baseline
        </button>
      </div>

      {/* ── Preview table ────────────────────────────────────── */}
      <div className="preview-card">
        <div className="preview-title">How This Changes Your Numbers</div>
        <div className="preview-header">
          <div className="preview-header-dist">Dist</div>
          <div className="preview-header-col">Baseline</div>
          <div className="preview-header-arrow">·</div>
          <div className="preview-header-col">Your Swing</div>
        </div>
        {PREVIEW_DISTS.map(d => {
          const base = findBackswingInches(d, testStimp, lagRows);
          if (base === null) return null;
          const mine    = base * df;
          const isSame  = Math.abs(df - 1.0) < 0.01;
          return (
            <div key={d} className={`preview-row${d === testDist ? ' preview-highlight' : ''}`}>
              <div className="preview-dist">{d} ft</div>
              <div className="preview-baseline">{fmt(base)}</div>
              <div className="preview-arrow">→</div>
              <div className={`preview-mine${isSame ? ' same' : ''}`}>
                {isSame ? fmt(base) : fmt(mine)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
