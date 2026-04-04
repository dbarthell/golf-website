import { useMemo } from 'react';
import { CLOCK_POSITIONS, WEDGE_CLUBS } from '../lib/wedge';
import type { WedgePosition, WedgeClubId, WedgeEntry } from '../lib/wedge';


// ── Gauge geometry ────────────────────────────────────────────────────────────
// Ferrari-inspired full-circle instrument.
// Angle convention: 0° = 12:00 (Full/top), clockwise-positive.
// Active zone: 225° (7:30) → 360° (Full), clockwise through the left side.
//
// Label strategy: only the 4 calibrate positions (7:30, 9:00, 10:30, Full) show
// a permanent yardage+label. The 3 intermediate positions (8:00, 10:00, 11:00)
// show only a tick mark at rest — their yardage appears when selected.

const SZ        = 280;
const CX        = 140;
const CY        = 140;
const FACE_R    = 112;
const BEZEL_MID = 121;
const OUTER_R   = 134;
const YARD_R    = 76;   // single radius for all permanent labels
const YARD_INT  = 68;   // radius for intermediate position when selected
const NEEDLE_R  = 105;

const ARC_S = 225; // 7:30
const ARC_E = 360; // Full

function cw(deg: number): number {
  return deg <= 0 ? deg + 360 : deg;
}

function pt(cwDeg: number, r: number) {
  const rad = cwDeg * Math.PI / 180;
  return { x: CX + r * Math.sin(rad), y: CY - r * Math.cos(rad) };
}

function arcStr(a1: number, a2: number, r: number): string {
  const s = pt(a1, r), e = pt(a2, r);
  const large = (a2 - a1) > 180 ? 1 : 0;
  return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
}

function sectorPath(a1: number, a2: number, outerR: number): string {
  const s = pt(a1, outerR), e = pt(a2, outerR);
  const large = (a2 - a1) > 180 ? 1 : 0;
  return [
    `M ${CX} ${CY}`,
    `L ${s.x.toFixed(1)} ${s.y.toFixed(1)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`,
    'Z',
  ].join(' ');
}

// ── Position metadata ─────────────────────────────────────────────────────────

interface PosMeta {
  key: WedgePosition;
  label: string;
  calibrate: boolean;
  cwDeg: number;
  sectorStart: number;
  sectorEnd: number;
}

function buildPosMeta(): PosMeta[] {
  return CLOCK_POSITIONS.map((pos, i) => {
    const cwDeg = cw(pos.angleDeg);
    const prevCW = i > 0 ? cw(CLOCK_POSITIONS[i - 1].angleDeg) : ARC_S - 8;
    const nextCW = i < CLOCK_POSITIONS.length - 1
      ? cw(CLOCK_POSITIONS[i + 1].angleDeg)
      : ARC_E + 8;
    return {
      key: pos.key,
      label: pos.label,
      calibrate: pos.calibrate,
      cwDeg,
      sectorStart: (cwDeg + prevCW) / 2,
      sectorEnd:   (cwDeg + nextCW) / 2,
    };
  });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface WedgeClockFaceProps {
  clubId: WedgeClubId;
  entries: WedgeEntry[];
  selectedPosition?: WedgePosition | null;
  onPositionSelect?: (pos: WedgePosition) => void;
  yardageLabel?: string;
  yardageSublabel?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WedgeClockFace({
  clubId,
  entries,
  selectedPosition,
  onPositionSelect,
  yardageLabel,
  yardageSublabel,
}: WedgeClockFaceProps) {
  const entryMap = useMemo(() => {
    const m = new Map<WedgePosition, WedgeEntry>();
    for (const e of entries) if (e.clubId === clubId) m.set(e.clockPosition, e);
    return m;
  }, [entries, clubId]);

  const posMeta = useMemo(buildPosMeta, []);

  const selectedDef = selectedPosition
    ? CLOCK_POSITIONS.find(p => p.key === selectedPosition)
    : null;
  const handCW = selectedDef ? cw(selectedDef.angleDeg) : null;
  // Default resting angle — points straight down at the golf ball (6 o'clock)
  const needleCW = handCW ?? 180;

  // Tapered needle
  const needle = (() => {
    const handCW = needleCW;
    const tip     = pt(handCW, NEEDLE_R);
    const tail    = pt((handCW + 180) % 360, 14);
    const perpRad = (handCW + 90) * Math.PI / 180;
    const w = 2.6;
    return {
      tip, tail,
      b1: { x: CX + Math.sin(perpRad) * w, y: CY - Math.cos(perpRad) * w },
      b2: { x: CX - Math.sin(perpRad) * w, y: CY + Math.cos(perpRad) * w },
    };
  })();

  // 24 tick marks
  const ticks = useMemo(() => Array.from({ length: 24 }, (_, i) => {
    const a = i * 15;
    const isActive = a === 0 || a >= ARC_S;
    const cwAngle  = a === 0 ? 360 : a;
    const isMajor  = CLOCK_POSITIONS.some(p => cw(p.angleDeg) === cwAngle);
    const isCalib  = CLOCK_POSITIONS.some(p => cw(p.angleDeg) === cwAngle && p.calibrate);
    return { a, isActive, isMajor, isCalib };
  }), []);

  const clubLabel = WEDGE_CLUBS.find(c => c.id === clubId)?.label ?? '';

  const gold   = '#c9a86a';
  const white  = 'rgba(255,255,255,0.90)';
  const dimLbl = 'rgba(255,255,255,0.60)';

  return (
    <div className="wedge-clock-wrap">
      <svg
        viewBox={`0 0 ${SZ} ${SZ}`}
        className="wedge-clock-svg"
        aria-label={`Wedge gauge for ${clubLabel}`}
      >
        <defs>
          <radialGradient id="wg-face" cx="50%" cy="38%" r="62%">
            <stop offset="0%"   stopColor="#116b5a" />
            <stop offset="45%"  stopColor="#083d36" />
            <stop offset="100%" stopColor="#011f1c" />
          </radialGradient>
          <radialGradient id="wg-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="65%"  stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
          </radialGradient>
          <radialGradient id="wg-shine" cx="50%" cy="20%" r="40%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          {/* Circular crop for the logo — clips out the JPEG rounded corners */}
          <clipPath id="wg-logo-clip">
            <circle cx={CX + 45} cy={CY} r="27" />
          </clipPath>
          {/* Golf ball — off-centre radial for 3-D look */}
          <radialGradient id="wg-ball" cx="35%" cy="28%" r="65%">
            <stop offset="0%"   stopColor="rgba(255,255,255,1)" />
            <stop offset="40%"  stopColor="rgba(242,242,242,1)" />
            <stop offset="100%" stopColor="rgba(175,175,175,1)" />
          </radialGradient>
          {/* Rim shadow — darkens the edge for depth */}
          <radialGradient id="wg-ball-rim" cx="50%" cy="50%" r="50%">
            <stop offset="68%"  stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.30)" />
          </radialGradient>
        </defs>

        <circle cx={CX} cy={CY} r={FACE_R} fill="url(#wg-face)" />
        <circle cx={CX} cy={CY} r={FACE_R} fill="url(#wg-shadow)" />
        <circle cx={CX} cy={CY} r={FACE_R} fill="url(#wg-shine)" />

        {/* Bezel band */}
        <circle cx={CX} cy={CY} r={BEZEL_MID} fill="none" stroke="#0b1714" strokeWidth="18" />

        {/* Dead zone arc */}
        <path d={arcStr(0, ARC_S, BEZEL_MID)} fill="none"
          stroke="rgba(255,255,255,0.04)" strokeWidth="14" />

        {/* Active zone dim gold */}
        <path d={arcStr(ARC_S, ARC_E, BEZEL_MID)} fill="none"
          stroke="rgba(201,168,106,0.18)" strokeWidth="14" />

        {/* Progress arc — only when a position is actually selected */}
        {handCW !== null && (
          <path d={arcStr(ARC_S, handCW, BEZEL_MID)} fill="none"
            stroke={gold} strokeWidth="14" strokeLinecap="butt" opacity="0.82" />
        )}

        {/* Bezel inner edge */}
        <circle cx={CX} cy={CY} r={FACE_R} fill="none"
          stroke="rgba(201,168,106,0.28)" strokeWidth="1" />

        {/* Outer chrome rings */}
        <circle cx={CX} cy={CY} r={OUTER_R} fill="none"
          stroke="rgba(201,168,106,0.55)" strokeWidth="1.5" />
        <circle cx={CX} cy={CY} r={OUTER_R + 2} fill="none"
          stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

        {/* Tick marks */}
        {ticks.map(({ a, isActive, isMajor, isCalib }) => {
          const inner = pt(a, FACE_R);
          const outer = pt(a, FACE_R + (isMajor ? 13 : 7));
          const opacity = isActive
            ? (isCalib ? 0.90 : isMajor ? 0.70 : 0.50)
            : (isMajor ? 0.13 : 0.07);
          const color = isActive && isCalib ? gold : 'white';
          return (
            <line key={a}
              x1={inner.x.toFixed(1)} y1={inner.y.toFixed(1)}
              x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)}
              stroke={color}
              strokeWidth={isCalib ? 2.5 : isMajor ? 1.5 : 1}
              strokeLinecap="round"
              opacity={opacity}
            />
          );
        })}

        {/* Position dots on bezel at each active position */}
        {posMeta.map(pos => {
          const dotPt = pt(pos.cwDeg, BEZEL_MID);
          const isSelected = selectedPosition === pos.key;
          return (
            <circle
              key={`dot-${pos.key}`}
              cx={dotPt.x.toFixed(1)}
              cy={dotPt.y.toFixed(1)}
              r={pos.calibrate ? 3.5 : 2.5}
              fill={isSelected ? gold : (pos.calibrate ? 'rgba(201,168,106,0.70)' : 'rgba(255,255,255,0.35)')}
            />
          );
        })}

        {/* Tap sectors */}
        {posMeta.map(pos => (
          <path
            key={`tap-${pos.key}`}
            d={sectorPath(pos.sectorStart, Math.min(pos.sectorEnd, ARC_E + 8), FACE_R + 14)}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onClick={() => onPositionSelect?.(pos.key)}
          />
        ))}

        {/* ── Position labels ───────────────────────────────────────────────
            Calibrate positions: always show yardage + clock label at YARD_R.
            Intermediate positions: show only when selected, at YARD_INT.
        ─────────────────────────────────────────────────────────────────── */}
        {posMeta.map(pos => {
          const entry      = entryMap.get(pos.key);
          const isSelected = selectedPosition === pos.key;
          // Non-calibrate positions show nothing on the face — badge below is enough
          if (!pos.calibrate) return null;

          const r      = pos.calibrate ? YARD_R : YARD_INT;
          const yardPt = pt(pos.cwDeg, r);

          // Gold highlight only for the 4 calibrate positions; others use white
          const activeColor = pos.calibrate ? gold : white;

          return (
            <g key={pos.key} style={{ cursor: 'pointer' }} onClick={() => onPositionSelect?.(pos.key)}>
              {/* Selection glow — gold ring for calibrate positions, subtle white for intermediates */}
              {isSelected && (
                <circle
                  cx={yardPt.x} cy={yardPt.y}
                  r={pos.calibrate ? 22 : 18}
                  fill={pos.calibrate ? 'rgba(201,168,106,0.15)' : 'rgba(255,255,255,0.08)'}
                  stroke={pos.calibrate ? gold : 'rgba(255,255,255,0.35)'}
                  strokeWidth="1.5"
                  opacity="0.9"
                />
              )}

              {/* Yardage */}
              {entry ? (
                <text
                  x={yardPt.x.toFixed(1)}
                  y={(yardPt.y - 4).toFixed(1)}
                  textAnchor="middle"
                  dominantBaseline="auto"
                  fontSize={pos.calibrate ? '19' : '15'}
                  fontWeight="800"
                  fill={isSelected ? activeColor : white}
                  fontFamily="system-ui,-apple-system,sans-serif"
                  letterSpacing="-0.5"
                >
                  {entry.yards}
                </text>
              ) : (
                <text
                  x={yardPt.x.toFixed(1)}
                  y={(yardPt.y - 4).toFixed(1)}
                  textAnchor="middle"
                  dominantBaseline="auto"
                  fontSize="10"
                  fill="rgba(255,255,255,0.20)"
                  fontFamily="system-ui,-apple-system,sans-serif"
                >—</text>
              )}

              {/* Clock-time label, directly below yardage */}
              <text
                x={yardPt.x.toFixed(1)}
                y={(yardPt.y + 10).toFixed(1)}
                textAnchor="middle"
                dominantBaseline="auto"
                fontSize={pos.calibrate ? '11' : '10'}
                fontWeight={isSelected ? '700' : '500'}
                fill={isSelected ? activeColor : dimLbl}
                fontFamily="system-ui,-apple-system,sans-serif"
              >
                {pos.label}
              </text>
            </g>
          );
        })}

        {/* Needle — always gold; resting at 6 o'clock until a position is tapped */}
        <polygon
          points={`${needle.b1.x.toFixed(1)},${needle.b1.y.toFixed(1)} ${needle.b2.x.toFixed(1)},${needle.b2.y.toFixed(1)} ${needle.tip.x.toFixed(1)},${needle.tip.y.toFixed(1)}`}
          fill={gold}
          opacity="0.95"
        />
        <circle cx={needle.tail.x} cy={needle.tail.y} r="4.5" fill={gold} opacity="0.7" />

        {/* Logo — lighten blend makes the dark JPEG background invisible,
            leaving only the green Z, gold B and white ball floating on the face */}
        <image
          href={`${import.meta.env.BASE_URL}zb-logo-new.jpg`}
          x={CX + 18}
          y={CY - 27}
          width="54"
          height="54"
          clipPath="url(#wg-logo-clip)"
          style={{ mixBlendMode: 'lighten', pointerEvents: 'none' }}
        />

        {/* Golf ball — dead zone at 6 o'clock, sitting on the bezel */}
        {(() => {
          const bx = CX, by = CY + BEZEL_MID, br = 9.5;
          // Two rings of dimples, evenly spaced
          const inner = Array.from({ length: 6 }, (_, i) => {
            const a = (i * 60 - 90) * Math.PI / 180;
            return [Math.cos(a) * 3.8, Math.sin(a) * 3.8] as [number, number];
          });
          const outer = Array.from({ length: 9 }, (_, i) => {
            const a = (i * 40 - 90) * Math.PI / 180;
            return [Math.cos(a) * 7.0, Math.sin(a) * 7.0] as [number, number];
          });
          return (
            <g style={{ pointerEvents: 'none' }}>
              <circle cx={bx} cy={by} r={br} fill="url(#wg-ball)" />
              <circle cx={bx} cy={by} r={br} fill="url(#wg-ball-rim)" />
              {([[0, 0]] as [number,number][]).concat(inner, outer).map(([dx, dy], i) => (
                <circle key={i} cx={bx + dx} cy={by + dy} r="0.9"
                  fill="rgba(120,120,120,0.45)" />
              ))}
            </g>
          );
        })()}

        {/* Center cap */}
        <circle cx={CX} cy={CY} r="9" fill={gold} opacity="0.97" />
        <circle cx={CX} cy={CY} r="4" fill="#013c36" opacity="0.95" />
        <circle cx={CX} cy={CY} r="2" fill="rgba(255,255,255,0.80)" />
      </svg>

      {/* Yardage badge */}
      <div className="wedge-clock-badge">
        {yardageLabel ? (
          <>
            <span className="wedge-clock-yards">{yardageLabel}</span>
            {yardageSublabel && (
              <span className="wedge-clock-sublabel">{yardageSublabel}</span>
            )}
          </>
        ) : (
          <span className="wedge-clock-yards wedge-clock-yards--empty">tap a position</span>
        )}
      </div>
    </div>
  );
}
