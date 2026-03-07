import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconAdjustments } from '@tabler/icons-react';

import { getPuttingData } from '../hooks/usePuttingData';
import { useCalibration } from '../hooks/useCalibration';
import { useLookupState } from '../hooks/useLookupState';

import { StimpToggle } from '../components/StimpToggle';
import { DistanceInput } from '../components/DistanceInput';
import { SlopeInput } from '../components/SlopeInput';
import { ClockFace } from '../components/ClockFace';
import { LookupResultPanel } from '../components/LookupResult';
import { CommonDistances } from '../components/CommonDistances';
import { BackswingTable } from '../components/BackswingTable';
import { OnboardingModal } from '../components/OnboardingModal';

import { calculateZBLVector, aimPoint, fmtInches } from '../lib/zbl';
import { backswingDisplay, findBackswingData } from '../lib/backswing';
import { getClockFactors } from '../lib/clockMath';
import type { LookupResult, ClockAnnotations } from '../lib/types';

// ── Result computation (pure function, used in useMemo) ───────────────────────

function computeResult(
  distance: number | '',
  slope: number,
  stimp: number,
  clock: string | null,
  distanceFactor: number,
  lagRows: ReturnType<typeof getPuttingData>['lagPuttingTable']['rows'],
  brysonRows: ReturnType<typeof getPuttingData>['brysonTable']['rows'],
): LookupResult {
  if (distance === '' || !distance || distance <= 0) {
    return { kind: 'empty', message: 'Enter a distance above' };
  }

  const stimpScale = stimp / 10;

  // ── Clock mode ─────────────────────────────────────────────────────────────
  if (clock) {
    const factors = getClockFactors(clock);
    if (!factors) return { kind: 'empty', message: 'Enter a distance above' };

    const { uphillFactor, breakFactor } = factors;
    const breakAbs = Math.abs(breakFactor);

    // Adjust distance for slope component parallel to the line of play
    let adjDist: number;
    if (uphillFactor * slope >= 0) {
      adjDist = distance + distance * Math.abs(uphillFactor) * slope / 10 * stimpScale;
    } else {
      adjDist = distance - distance * Math.abs(uphillFactor) * slope * 1.5 / 10 * stimpScale;
    }
    adjDist = Math.max(1, Math.round(adjDist));

    const zblResult = calculateZBLVector(distance, slope, stimp, brysonRows);
    const zblAimBase = zblResult ? parseFloat(zblResult.aimInches) : 0;
    const plusV      = zblResult ? parseFloat(zblResult.plusInches  ?? '0') : 0;
    const minusV     = zblResult ? parseFloat(zblResult.minusInches ?? '0') : 0;

    const aboveBelow = Math.abs(uphillFactor);
    const varianceAdj = uphillFactor < 0
      ?  plusV  * aboveBelow
      : -minusV * aboveBelow;

    const lateralAim = (zblAimBase + varianceAdj) * breakAbs;
    const edgeAim    = lateralAim - 2.125;
    const namedAim   = breakAbs >= 0.05 ? aimPoint(lateralAim, breakFactor) : null;

    const backswing = backswingDisplay(adjDist, stimp, lagRows, distanceFactor);

    const annotations: ClockAnnotations = { zblAimBase, lateralAim, breakAbs, clockKey: clock };

    return {
      kind: 'clock',
      backswing,
      namedAim,
      edgeAim,
      zblAimBase,
      breakAbs,
      breakFactor,
      uphillFactor,
      adjDist,
      slope,
      annotations,
    };
  }

  // ── Straight mode ──────────────────────────────────────────────────────────
  const backswingData = findBackswingData(distance, stimp, lagRows);
  const zblData       = calculateZBLVector(distance, slope, stimp, brysonRows);

  if (!backswingData || !zblData) {
    return { kind: 'empty', message: 'Distance out of range' };
  }

  const zblRaw     = parseFloat(zblData.aimInches);
  const zblDisplay = fmtInches(zblRaw);
  const slopeLabel = slope > 0 ? `ZBL Aim (${slope}%)` : 'ZBL Aim (flat)';
  const backswing  = backswingDisplay(distance, stimp, lagRows, distanceFactor);

  const uphillAdj    = distance * slope / 10 * stimpScale;
  const downhillAdj  = distance * slope * 1.5 / 10 * stimpScale;
  const uphillTotal  = Math.round(distance + uphillAdj);
  const downhillTotal = Math.max(1, Math.round(distance - downhillAdj));
  const uphillBS     = backswingDisplay(uphillTotal, stimp, lagRows, distanceFactor);
  const downhillBS   = backswingDisplay(downhillTotal, stimp, lagRows, distanceFactor);

  const annotations: ClockAnnotations = { zblAimBase: zblRaw, lateralAim: 0, breakAbs: 0, clockKey: null };

  return {
    kind: 'straight',
    backswing,
    zblDisplay,
    slopeLabel,
    slope,
    distance,
    stimp,
    uphillTotal,
    downhillTotal,
    uphillBS,
    downhillBS,
    annotations,
  };
}

// ── Page component ────────────────────────────────────────────────────────────

export function LookupPage() {
  const data = getPuttingData();
  const { calibration } = useCalibration();
  const { distance, setDistance, slope, setSlope, stimp, setStimp, clock, setClock } =
    useLookupState();

  const [onboardingDone, setOnboardingDone] = useState(() => !!localStorage.getItem('zerobreak-onboarded'));

  const result = useMemo(
    () =>
      computeResult(
        distance,
        slope,
        stimp,
        clock,
        calibration.distanceFactor,
        data.lagPuttingTable.rows,
        data.brysonTable.rows,
      ),
    [distance, slope, stimp, clock, calibration.distanceFactor, data],
  );

  const annotations: ClockAnnotations =
    result.kind !== 'empty' ? result.annotations : { zblAimBase: 0, lateralAim: 0, breakAbs: 0, clockKey: null };

  return (
    <>
      {!onboardingDone && (
        <OnboardingModal onDismiss={() => setOnboardingDone(true)} />
      )}

      {/* ── Dark hero ─────────────────────────────────────────────────────── */}
      <div className="quick-lookup">

        {/* Header */}
        <div className="lookup-header">
          <div className="header-brand">
            <img src="images/logo.png" alt="" className="header-logo" />
            <h1>ZeroBreak</h1>
          </div>
          <div className="header-links">
            <Link to="/calibrate" className="full-view-link">
              <IconAdjustments size={16} stroke={2} />
              Calibrate
            </Link>
          </div>
        </div>

        {/* Green speed */}
        <div className="lookup-input-section">
          <label className="lookup-label">Green Speed (Stimp)</label>
          <StimpToggle value={stimp} onChange={setStimp} />
        </div>

        {/* Distance + Slope side by side */}
        <div className="inputs-row">
          <DistanceInput value={distance} onChange={setDistance} />
          <SlopeInput value={slope} onChange={setSlope} />
        </div>

        {/* Clock face */}
        <ClockFace
          clockKey={clock}
          onClockChange={setClock}
          annotations={annotations}
        />

        {/* Result */}
        <LookupResultPanel result={result} />
      </div>

      {/* ── Light sections ────────────────────────────────────────────────── */}
      <CommonDistances
        stimp={stimp}
        distanceFactor={calibration.distanceFactor}
        lagRows={data.lagPuttingTable.rows}
        onSelect={dist => {
          setDistance(dist);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <BackswingTable
        lagRows={data.lagPuttingTable.rows}
        distanceFactor={calibration.distanceFactor}
        stimp={stimp}
      />
    </>
  );
}
