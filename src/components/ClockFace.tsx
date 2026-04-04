import { IconClock } from '@tabler/icons-react';
import { HOUR_POSITIONS } from '../lib/clockMath';
import { fmtInches } from '../lib/zbl';
import type { ClockAnnotations } from '../lib/types';

const R = 116; // button radius from center in px
const C = 137; // center of 280px clock face interior (280 - 2×3px border) / 2

interface Props {
  clockKey: string | null;
  onClockChange: (key: string | null) => void;
  annotations: ClockAnnotations | null;
  slope?: number;
}

// ── SVG annotations (rendered declaratively) ─────────────────────────────────

function ClockSVG({
  clockKey,
  annotations,
  slope = 0,
}: {
  clockKey: string | null;
  annotations: ClockAnnotations | null;
  slope?: number;
}) {
  const SVG_C = 100; // SVG-space center (viewBox 0 0 200 200)
  const SVG_R = 83;  // ball-position radius (83 * 1.4px ≈ 116.2px — matches R above)

  const zblAimBase = annotations?.zblAimBase ?? 0;
  const breakAbs   = annotations?.breakAbs   ?? 0;
  const hasZBL     = zblAimBase > 0;
  const hasSlope    = slope > 0;

  if (!hasZBL && !hasSlope) return null;

  const scaleIn = (inches: number) => Math.min(Math.max(inches * 3, 10), 45);

  const zblPx = hasZBL ? scaleIn(zblAimBase) : 0;
  const zblX  = SVG_C;
  const zblY  = SVG_C - zblPx;

  const hasBreak = clockKey !== null && breakAbs >= 0.05;
  const pos = clockKey ? HOUR_POSITIONS.find(p => p.key === clockKey) : null;
  const theta = hasBreak && pos ? pos.theta : null;

  const ballX = hasBreak && theta !== null ? SVG_C + SVG_R * Math.sin(theta) : null;
  const ballY = hasBreak && theta !== null ? SVG_C - SVG_R * Math.cos(theta) : null;

  // ── Lateral aim indicator ──────────────────────────────────────────────────
  // Find where the 90°-from-hole ray (perpendicular to ball→hole direction)
  // intersects the dotted line.  Solving the two-line system reduces to:
  //   t = SVG_R / (SVG_R − zblPx · cos θ)
  // where θ is the clock-position angle.
  //
  // Key property: cos(π/2) = cos(3π/2) = 0, so t = 1 for 3 o'clock and
  // 9 o'clock — the ring lands exactly on the ZBL dot, as expected.
  // For lower positions (4–8 o'clock, cos θ < 0) t < 1 and the ring sits
  // visibly between ball and ZBL.  For upper positions t > 1 and the ring
  // clamps to the ZBL dot.
  // Dotted line end: always ends at ZBL dot
  const dotLineT = 1;

  return (
    <svg
      className="clock-svg"
      viewBox="0 0 200 200"
      aria-hidden="true"
    >
      {/* Slope fall-line indicator */}
      {hasSlope && (
        <>
          <line
            x1={SVG_C} y1={17}
            x2={SVG_C} y2={183}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
            strokeDasharray="3 4"
            strokeLinecap="round"
          />
          <text
            x={SVG_C + 9}
            y={SVG_C + 48}
            fontSize="8"
            fill="rgba(255,255,255,0.55)"
            textAnchor="start"
            dominantBaseline="central"
            fontFamily="system-ui,-apple-system,sans-serif"
          >
            ↓ {slope}%
          </text>
        </>
      )}

      {hasZBL && (
        <>
          {/* 1. Measurement line: cup → ZBL point */}
          <line
            x1={SVG_C} y1={SVG_C} x2={SVG_C} y2={zblY}
            stroke="rgba(255,255,255,0.40)"
            strokeWidth="1"
            strokeLinecap="round"
          />

          {/* 2. Dashed line: ball → ZBL, extended to ring when ring is past ZBL */}
          {hasBreak && ballX !== null && ballY !== null && (
            <line
              x1={ballX} y1={ballY}
              x2={ballX + dotLineT * (zblX - ballX)}
              y2={ballY + dotLineT * (zblY - ballY)}
              stroke="rgba(255,255,255,0.90)"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinecap="round"
            />
          )}

          {/* 3. ZBL dot */}
          <circle cx={zblX} cy={zblY} r="5" fill="white" opacity="0.95" />

          {/* 4a. "ZBL" label — centred above the dot */}
          <text
            x={SVG_C}
            y={zblY - 12}
            fontSize="8"
            textAnchor="middle"
            dominantBaseline="central"
            fontWeight={700}
            fontFamily="system-ui,-apple-system,sans-serif"
            fill="white"
            stroke="rgba(14,27,61,0.85)"
            strokeWidth={3}
            paintOrder="stroke"
          >ZBL</text>

          {/* 4b. Inches value — beside vertical line, flips left when ball is on the right */}
          {(() => {
            const onRight = theta !== null && Math.sin(theta) > 0;
            return (
              <text
                x={onRight ? SVG_C - 7 : SVG_C + 7}
                y={(SVG_C + zblY) / 2}
                fontSize="8"
                textAnchor={onRight ? 'end' : 'start'}
                dominantBaseline="central"
                fontWeight={700}
                fontFamily="system-ui,-apple-system,sans-serif"
                fill="white"
                stroke="rgba(14,27,61,0.85)"
                strokeWidth={3}
                paintOrder="stroke"
              >{fmtInches(zblAimBase)}</text>
            );
          })()}
        </>
      )}
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ClockFace({ clockKey, onClockChange, annotations, slope = 0 }: Props) {
  // Visual hand angle comes from the display-space theta (HOUR_POSITIONS),
  // not the physics theta (CLOCK_DATA) — they differ for :30 positions.
  const activePos = clockKey ? HOUR_POSITIONS.find(p => p.key === clockKey) : null;
  const handDeg = activePos ? activePos.theta * (180 / Math.PI) : null;

  // Tilt the clock face to mimic a real sloped green.
  // rotateX(+deg) tilts the top away from the viewer (the 12-o'clock / uphill
  // side recedes), giving the impression of looking across a slope.
  const tiltDeg = slope * 2; // 1% → 2°, 6% → 12°

  return (
    <div className="lookup-input-section">
      <label className="lookup-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <IconClock size={14} stroke={2} style={{ opacity: 0.85 }} />
        Clock Position
      </label>
      <div
        className="clock-face"
        style={tiltDeg > 0 ? { transform: `perspective(500px) rotateX(${tiltDeg}deg)` } : undefined}
      >

        {/* Golf green grain texture + gold center pivot */}
        <svg className="clock-svg" viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            {/*
              Grass grain: feTurbulence fractalNoise → feColorMatrix maps the
              noise B-channel to alpha (0–28% opacity) over a soft grass-green
              fill, producing a short-cut velvet turf texture.
            */}
            <filter id="grass-grain" color-interpolation-filters="sRGB">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.78 0.82"
                numOctaves="4"
                seed="3"
                result="noise"
              />
              <feColorMatrix
                in="noise"
                type="matrix"
                values="0 0 0 0 0.18
                        0 0 0 0 0.48
                        0 0 0 0 0.18
                        0 0 1 0 -0.38"
              />
            </filter>
            <clipPath id="grain-clip">
              <circle cx="100" cy="100" r="96" />
            </clipPath>
          </defs>
          {/* Fuzzy grass grain — behind hand, buttons, and annotations */}
          <rect
            x="0" y="0" width="200" height="200"
            filter="url(#grass-grain)"
            clipPath="url(#grain-clip)"
          />

          {/* Cardinal tick marks (12/3/6/9) — gold, in the outer ring */}
          <line x1="100" y1="5"   x2="100" y2="15"  stroke="rgba(201,168,106,0.55)" strokeWidth="2" strokeLinecap="round" />
          <line x1="195" y1="100" x2="185" y2="100"  stroke="rgba(201,168,106,0.55)" strokeWidth="2" strokeLinecap="round" />
          <line x1="100" y1="195" x2="100" y2="185"  stroke="rgba(201,168,106,0.55)" strokeWidth="2" strokeLinecap="round" />
          <line x1="5"   y1="100" x2="15"  y2="100"  stroke="rgba(201,168,106,0.55)" strokeWidth="2" strokeLinecap="round" />

          {/* Cup ring — subtle halo around the hole/pivot */}
          <circle cx="100" cy="100" r="9" fill="none" stroke="rgba(201,168,106,0.30)" strokeWidth="1" />

          {/* Gold center pivot */}
          <circle cx="100" cy="100" r="3.5" fill="#c9a86a" opacity="0.9" />
          <circle cx="100" cy="100" r="1.5" fill="rgba(255,255,255,0.6)" />
        </svg>

        <div className="clock-center" />

        {/* Clock hand */}
        {handDeg !== null && (
          <div
            className="clock-hand"
            style={{ transform: `translateX(-50%) rotate(${handDeg}deg)` }}
          />
        )}

        {/* SVG annotation overlay — rendered before buttons so numbers appear on top */}
        {(annotations || slope > 0) && (
          <ClockSVG clockKey={clockKey} annotations={annotations} slope={slope} />
        )}

        {/* Hour buttons */}
        {HOUR_POSITIONS.map(({ key, theta, label, half }) => {
          const x = C + R * Math.sin(theta);
          const y = C - R * Math.cos(theta);
          return (
            <button
              key={key}
              className={`clock-pos${half ? ' clock-pos-half' : ''}${clockKey === key ? ' clock-pos-active' : ''}`}
              style={{ left: x, top: y }}
              onClick={() => onClockChange(clockKey === key ? null : key)}
              aria-label={`Clock position ${label}`}
              aria-pressed={clockKey === key}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
