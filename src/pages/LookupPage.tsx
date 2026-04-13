import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconAdjustments, IconChartBar, IconFlag, IconInfoCircle, IconMapPin } from '@tabler/icons-react';


import { getPuttingData } from '../hooks/usePuttingData';
import { useCalibration } from '../hooks/useCalibration';
import { useLookupState } from '../hooks/useLookupState';
import { useGameMode } from '../hooks/useGameMode';
import { useUnits } from '../hooks/useUnits';

import { StimpToggle } from '../components/StimpToggle';
import { DistanceInput } from '../components/DistanceInput';
import { SlopeInput } from '../components/SlopeInput';
import { ClockFace } from '../components/ClockFace';
import { LookupResultPanel } from '../components/LookupResult';
import { CommonDistances } from '../components/CommonDistances';
import { BackswingTable } from '../components/BackswingTable';
import { WalkOffTip } from '../components/WalkOffTip';
import { OnboardingModal } from '../components/OnboardingModal';
import { GreenSlopePanel } from '../components/GreenSlopePanel';

import { calculateZBLVector, aimPoint, fmtInches } from '../lib/zbl';
import { backswingRaw, findBackswingData } from '../lib/backswing';
import { getClockFactors } from '../lib/clockMath';
import type { LookupResult, ClockAnnotations } from '../lib/types';

// Set VITE_GREEN_MAP_ENABLED=true in .env.local to enable during development.
// Defaults to false so production/iOS builds ship without the paid feature.
const GREEN_MAP_ENABLED = import.meta.env.VITE_GREEN_MAP_ENABLED === 'true';

// ── Result computation (pure function, used in useMemo) ───────────────────────

function computeResult(
  distance: number | '',
  slope: number,
  stimp: number,
  clock: string | null,
  distanceFactor: number,
  distanceOffset: number,
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

    const backswing = backswingRaw(adjDist, stimp, lagRows, distanceFactor, distanceOffset);

    const annotations: ClockAnnotations = { zblAimBase, lateralAim, breakAbs, breakFactor, clockKey: clock };

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
  // zblRaw is exposed so LookupResultPanel can format it in the current unit
  const backswing  = backswingRaw(distance, stimp, lagRows, distanceFactor, distanceOffset);

  const uphillAdj    = distance * slope / 10 * stimpScale;
  const downhillAdj  = distance * slope * 1.5 / 10 * stimpScale;
  const uphillTotal  = Math.round(distance + uphillAdj);
  const downhillTotal = Math.max(1, Math.round(distance - downhillAdj));
  const uphillBS     = backswingRaw(uphillTotal, stimp, lagRows, distanceFactor, distanceOffset);
  const downhillBS   = backswingRaw(downhillTotal, stimp, lagRows, distanceFactor, distanceOffset);

  const annotations: ClockAnnotations = { zblAimBase: zblRaw, lateralAim: 0, breakAbs: 0, breakFactor: 0, clockKey: null };

  return {
    kind: 'straight',
    backswing,
    zblDisplay,
    zblRaw,
    zblPlus: zblData.plusInches,
    zblMinus: zblData.minusInches,
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
  const { unit, toggleUnit } = useUnits();
  const { distance, setDistance, slope, setSlope, stimp, setStimp, clock, setClock } =
    useLookupState();
  const {
    activeGameRoundId,
    currentHole,
    advanceHole,
    logGamePutt,
  } = useGameMode();

  const [onboardingDone, setOnboardingDone] = useState(() => !!localStorage.getItem('zerobreak-onboarded'));
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mapLabel, setMapLabel] = useState<string | null>(() => {
    try {
      const course = localStorage.getItem('gi-selected-course');
      const hole   = localStorage.getItem('gi-selected-hole');
      if (course) {
        const parsed = JSON.parse(course) as { name: string };
        return `${parsed.name} — Hole ${hole ?? '1'}`;
      }
    } catch { /* */ }
    return null;
  });

  // ── Page carousel ──────────────────────────────────────────────────────────
  const [pageSlide, setPageSlide] = useState(0);
  const pageSlideRef  = useRef(0);
  const trackRef      = useRef<HTMLDivElement>(null);
  const mainSlideRef  = useRef<HTMLDivElement>(null);
  const swipeStartX   = useRef<number | null>(null);
  const swipeStartY   = useRef<number | null>(null);
  const isDragging    = useRef(false);

  // Animate to new slide (used by button taps + snap-on-release)
  const goToSlide = (slide: number) => {
    pageSlideRef.current = slide;
    const el = trackRef.current;
    if (el) {
      el.style.transition = 'transform 0.32s cubic-bezier(0.4,0,0.2,1)';
      el.style.transform  = `translateX(${-slide * 50}%)`;
    }
    setPageSlide(slide);
  };

  function handleSwipeStart(e: React.TouchEvent) {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
    isDragging.current  = false;
  }

  function handleSwipeMove(e: React.TouchEvent) {
    if (swipeStartX.current === null || swipeStartY.current === null) return;
    const dx = e.touches[0].clientX - swipeStartX.current;
    const dy = e.touches[0].clientY - swipeStartY.current;
    if (!isDragging.current) {
      if (Math.abs(dy) > Math.abs(dx)) return; // vertical scroll — ignore
      isDragging.current = true;
    }
    const slide  = pageSlideRef.current;
    const offset = slide === 0 && dx > 0 ? dx * 0.25
                 : slide === 1 && dx < 0 ? dx * 0.25
                 : dx;
    const el = trackRef.current;
    if (el) {
      el.style.transition = 'none';
      el.style.transform  = `translateX(calc(${-slide * 50}% + ${offset}px))`;
    }
  }

  function handleSwipeEnd(e: React.TouchEvent) {
    if (swipeStartX.current === null) return;
    const dx   = e.changedTouches[0].clientX - swipeStartX.current;
    const dy   = Math.abs(e.changedTouches[0].clientY - (swipeStartY.current ?? 0));
    const dragged = isDragging.current;
    swipeStartX.current = null;
    swipeStartY.current = null;
    isDragging.current  = false;
    if (dragged && Math.abs(dx) > 40 && Math.abs(dx) > dy) {
      goToSlide(Math.max(0, Math.min(1, pageSlideRef.current + (dx < 0 ? 1 : -1))));
    } else {
      // snap back
      const el = trackRef.current;
      if (el) {
        el.style.transition = 'transform 0.32s cubic-bezier(0.4,0,0.2,1)';
        el.style.transform  = `translateX(${-pageSlideRef.current * 50}%)`;
      }
    }
  }

  useEffect(() => { mainSlideRef.current?.scrollTo(0, 0); }, []);

  const result = useMemo(
    () =>
      computeResult(
        distance,
        slope,
        stimp,
        clock,
        calibration.distanceFactor,
        calibration.distanceOffset,
        data.lagPuttingTable.rows,
        data.brysonTable.rows,
      ),
    [distance, slope, stimp, clock, calibration.distanceFactor, calibration.distanceOffset, data],
  );

  const annotations: ClockAnnotations =
    result.kind !== 'empty' ? result.annotations : { zblAimBase: 0, lateralAim: 0, breakAbs: 0, breakFactor: 0, clockKey: null };

  return (
    <>
      {(!onboardingDone || showOnboarding) && (
        <OnboardingModal
          isReplay={onboardingDone}
          onDismiss={() => {
            setOnboardingDone(true);
            setShowOnboarding(false);
          }}
        />
      )}

      <div
        className="page-carousel"
        onTouchStart={handleSwipeStart}
        onTouchMove={handleSwipeMove}
        onTouchEnd={handleSwipeEnd}
      >
        <div className="page-track" ref={trackRef}>
          {/* ── Slide 0: Main view ────────────────────────────────────────── */}
          <div className="page-slide page-slide-main" ref={mainSlideRef}>
            <div className="app-header">
              <div className="header-brand">
                <div className="header-logo-wrap">
                  <img src="images/zb-logo-new.jpg" alt="" className="header-logo" />
                </div>
              </div>
              <div className="header-links">
                <button
                  className="unit-toggle"
                  onClick={toggleUnit}
                  aria-label={`Switch to ${unit === 'ft' ? 'metres' : 'feet'}`}
                >
                  {unit === 'ft' ? 'ft' : 'm'}
                </button>
                <Link to="/log" className="full-view-link">
                  <IconChartBar size={20} stroke={2} />
                  <span className="full-view-link-label">Stats</span>
                </Link>
                <Link to="/calibrate" className="full-view-link">
                  <IconAdjustments size={20} stroke={2} />
                  <span className="full-view-link-label">Calibrate</span>
                </Link>
                <button className="full-view-link" onClick={() => setShowOnboarding(true)} aria-label="Guide">
                  <IconInfoCircle size={20} stroke={2} />
                  <span className="full-view-link-label">Guide</span>
                </button>
                {activeGameRoundId ? (
                  <Link to="/game" className="full-view-link game-active-chip">
                    <IconFlag size={18} stroke={2} />
                    <span className="full-view-link-label">Hole {currentHole}</span>
                    <span className="game-active-chip-label">⛳ {currentHole}</span>
                  </Link>
                ) : (
                  <Link to="/game" className="full-view-link" aria-label="Play">
                    <IconFlag size={18} stroke={2} />
                    <span className="full-view-link-label">Play</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="lookup-body">
              <div className="lookup-input-section">
                <label className="lookup-label">Green Speed (Stimp)</label>
                <StimpToggle value={stimp} onChange={setStimp} />
              </div>
              <div className="inputs-row">
                <DistanceInput value={distance} onChange={setDistance} />
                <SlopeInput value={slope} onChange={setSlope} />
              </div>
            </div>

            <WalkOffTip />

            <div className="clock-section">
              {GREEN_MAP_ENABLED && mapLabel && (
                <button className="course-context-label" onClick={() => goToSlide(1)}>
                  <IconMapPin size={11} stroke={2} />
                  {mapLabel}
                </button>
              )}
              <ClockFace
                clockKey={clock}
                onClockChange={setClock}
                annotations={annotations}
                slope={slope}
              />
            </div>

            <div className="lookup-result-body">
              <LookupResultPanel
                result={result}
                puttContext={distance !== '' ? { distance, slope, stimp, clock } : undefined}
                gameContext={activeGameRoundId ? {
                  roundId: activeGameRoundId,
                  hole: currentHole,
                  onLogGamePutt: logGamePutt,
                  onNextHole: advanceHole,
                } : undefined}
              />
            </div>

            <BackswingTable
              lagRows={data.lagPuttingTable.rows}
              distanceFactor={calibration.distanceFactor}
              distanceOffset={calibration.distanceOffset}
              stanceWidth={calibration.stanceWidth}
              stimp={stimp}
            />

            <CommonDistances
              stimp={stimp}
              distanceFactor={calibration.distanceFactor}
              distanceOffset={calibration.distanceOffset}
              lagRows={data.lagPuttingTable.rows}
              onSelect={dist => {
                setDistance(dist);
                mainSlideRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>

          {/* ── Slide 1: Green map (paid feature — gated by VITE_GREEN_MAP_ENABLED) */}
          {GREEN_MAP_ENABLED && (
            <div className="page-slide page-slide-map">
              <GreenSlopePanel
                onSetDistance={setDistance}
                onSetSlope={setSlope}
                onSelectionChange={setMapLabel}
              />
            </div>
          )}
        </div>

        {/* ── Slide dots (only shown when green map is enabled) ─────────────── */}
        {GREEN_MAP_ENABLED && (
          <div className="page-nav">
            <button className={`page-dot${pageSlide === 0 ? ' page-dot-active' : ''}`} onClick={() => goToSlide(0)} aria-label="Lookup" />
            <button className={`page-dot${pageSlide === 1 ? ' page-dot-active' : ''}`} onClick={() => goToSlide(1)} aria-label="Green map" />
          </div>
        )}

      </div>
    </>
  );
}
