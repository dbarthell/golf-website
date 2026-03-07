import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconAdjustments } from '@tabler/icons-react';

import { usePuttingData } from '../hooks/usePuttingData';
import { useCalibration } from '../hooks/useCalibration';
import { useLookupState } from '../hooks/useLookupState';
import { getClockFactors } from '../lib/clockMath';
import { calculateZBLVector, fmtInches } from '../lib/zbl';
import { backswingDisplay } from '../lib/backswing';

import StimpToggle from '../components/StimpToggle';
import DistanceInput from '../components/DistanceInput';
import SlopeInput from '../components/SlopeInput';
import ClockFace, { type ClockAnnotation } from '../components/ClockFace';
import LookupResult, { type LookupResultData } from '../components/LookupResult';
import CommonDistances from '../components/CommonDistances';
import BackswingTable from '../components/BackswingTable';
import OnboardingModal, { needsOnboarding } from '../components/OnboardingModal';

export default function LookupPage() {
  const { data } = usePuttingData();
  const { calibration } = useCalibration();
  const {
    distance, setDistance,
    slope, setSlope,
    stimp, setStimp,
    currentClock, setCurrentClock,
  } = useLookupState();

  const [showOnboarding, setShowOnboarding] = useState<boolean>(needsOnboarding);
  const navigate = useNavigate();

  const lagRows    = data.lagPuttingTable.rows;
  const brysonRows = data.brysonTable.rows;
  const df         = calibration.distanceFactor;

  // ── Build calibrate link params ───────────────────────────────────────────
  const calibrateHref = useMemo(() => {
    const p = new URLSearchParams();
    if (distance) p.set('d', String(distance));
    p.set('slope', String(slope));
    p.set('stimp', String(stimp));
    if (currentClock) p.set('clock', currentClock);
    return `/calibrate?${p.toString()}`;
  }, [distance, slope, stimp, currentClock]);

  // ── Compute lookup result ─────────────────────────────────────────────────
  const resultData = useMemo((): LookupResultData | null => {
    if (!distance || distance <= 0) return null;

    if (currentClock) {
      // Clock mode
      const factors = getClockFactors(currentClock);
      if (!factors) return null;

      const stimpScale  = stimp / 10;
      const uphillComp  = slope * factors.uphillFactor;
      const breakAbs    = Math.abs(factors.breakFactor);

      let adjDist: number;
      if (uphillComp >= 0) {
        adjDist = distance + distance * uphillComp / 10 * stimpScale;
      } else {
        adjDist = distance + distance * uphillComp * 1.5 / 10 * stimpScale;
      }
      adjDist = Math.max(1, Math.round(adjDist));

      const zblResult  = calculateZBLVector(distance, slope, stimp, brysonRows);
      const zblAimBase = parseFloat(zblResult.aimInches);
      const plusV      = parseFloat(zblResult.plusInches  ?? '0');
      const minusV     = parseFloat(zblResult.minusInches ?? '0');

      const aboveBelow   = Math.abs(factors.uphillFactor);
      const varianceAdj  = factors.uphillFactor < 0
        ?  plusV  * aboveBelow   // from above hole: add superscript
        : -minusV * aboveBelow;  // from below hole: subtract subscript

      const lateralAim = (zblAimBase + varianceAdj) * breakAbs;
      const bs = backswingDisplay(adjDist, stimp, lagRows, df);

      return {
        mode: 'clock',
        backswing: bs,
        lateralAim,
        breakAbs,
        breakFactor: factors.breakFactor,
        zblAimBase,
        uphillFactor: factors.uphillFactor,
        adjDist: slope > 0 && Math.abs(factors.uphillFactor) > 0.05 ? adjDist : undefined,
      };
    }

    // Straight mode
    const zblResult  = calculateZBLVector(distance, slope, stimp, brysonRows);
    const bs         = backswingDisplay(distance, stimp, lagRows, df);
    const zblRaw     = parseFloat(zblResult.aimInches);
    const zblDisplay = fmtInches(zblRaw);
    const slopeLabel = slope > 0 ? `ZBL Aim (${slope}%)` : 'ZBL Aim (flat)';

    if (slope <= 0) {
      const stimpScale   = stimp / 10;
      const uphillRate   = Math.round(1   * stimpScale * 10) / 10;
      const downhillRate = Math.round(1.5 * stimpScale * 10) / 10;
      return {
        mode: 'straight',
        backswing: bs,
        zblDisplay,
        slopeLabel,
        slopeNote: `Uphill: +${uphillRate} ft/10 ft/1%<br>Downhill: −${downhillRate} ft/10 ft/1%`,
      };
    }

    const stimpScale     = stimp / 10;
    const uphillAdj      = distance * slope / 10 * stimpScale;
    const downhillAdj    = distance * slope * 1.5 / 10 * stimpScale;
    const uphillTotal    = Math.round(distance + uphillAdj);
    const downhillTotal  = Math.max(1, Math.round(distance - downhillAdj));
    const uphillBS       = backswingDisplay(uphillTotal, stimp, lagRows, df);
    const downhillBS     = backswingDisplay(downhillTotal, stimp, lagRows, df);

    return {
      mode: 'straight',
      backswing: bs,
      zblDisplay,
      slopeLabel,
      uphillRow:   { dist: uphillTotal, bs: uphillBS },
      downhillRow: { dist: downhillTotal, bs: downhillBS },
    };
  }, [distance, slope, stimp, currentClock, brysonRows, lagRows, df]);

  // ── Clock annotation for SVG overlay ─────────────────────────────────────
  const clockAnnotation = useMemo((): ClockAnnotation | null => {
    if (!distance || distance <= 0) return null;

    const zblResult  = calculateZBLVector(distance, slope, stimp, brysonRows);
    const zblAimBase = parseFloat(zblResult.aimInches);
    if (!zblAimBase || zblAimBase <= 0) return null;

    if (!currentClock) {
      // No clock selected — just show the ZBL marker with no break line
      return { zblAimBase, lateralAim: 0, plusV: 0, minusV: 0, breakAbs: 0, uphillFactor: 0 };
    }

    const factors   = getClockFactors(currentClock);
    if (!factors) return null;

    const plusV  = parseFloat(zblResult.plusInches  ?? '0');
    const minusV = parseFloat(zblResult.minusInches ?? '0');
    const breakAbs = Math.abs(factors.breakFactor);

    const aboveBelow  = Math.abs(factors.uphillFactor);
    const varianceAdj = factors.uphillFactor < 0
      ?  plusV  * aboveBelow
      : -minusV * aboveBelow;
    const lateralAim = (zblAimBase + varianceAdj) * breakAbs;

    return {
      zblAimBase,
      lateralAim,
      plusV,
      minusV,
      breakAbs,
      uphillFactor: factors.uphillFactor,
    };
  }, [distance, slope, stimp, currentClock, brysonRows]);

  const handleDistanceSelect = (dist: number) => {
    setDistance(dist);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="zb-page">
      {showOnboarding && <OnboardingModal onDismiss={() => setShowOnboarding(false)} />}

      {/* ── Dark header + inputs ─────────────────────────────── */}
      <div className="quick-lookup">
        {/* Header row */}
        <div className="lookup-header">
          <div className="header-brand">
            <img
              src={`${import.meta.env.BASE_URL}images/logo.png`}
              alt="ZeroBreak"
              className="header-logo"
            />
            <h1>ZeroBreak</h1>
          </div>
          <div className="header-links">
            <a
              href="#"
              className="full-view-link"
              onClick={e => { e.preventDefault(); navigate(calibrateHref); }}
            >
              <IconAdjustments size={15} />
              Calibrate
            </a>
          </div>
        </div>

        {/* Stimp */}
        <div className="lookup-input-section">
          <label className="lookup-label">Green Speed (Stimp)</label>
          <StimpToggle value={stimp} onChange={setStimp} variant="dark" />
        </div>

        {/* Distance + Slope */}
        <div className="inputs-row">
          <DistanceInput value={distance} onChange={setDistance} />
          <SlopeInput value={slope} onChange={setSlope} />
        </div>

        {/* Clock face */}
        <ClockFace
          currentClock={currentClock}
          onClockChange={setCurrentClock}
          annotation={clockAnnotation}
        />

        {/* Result panel */}
        <LookupResult data={resultData} />
      </div>

      {/* ── Common distances ─────────────────────────────────── */}
      <CommonDistances
        stimp={stimp}
        distanceFactor={df}
        lagRows={lagRows}
        onSelect={handleDistanceSelect}
      />

      {/* ── Reference table ──────────────────────────────────── */}
      <BackswingTable lagRows={lagRows} distanceFactor={df} stimp={stimp} />
    </div>
  );
}
