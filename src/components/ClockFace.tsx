import { IconClock } from '@tabler/icons-react';
import { HOUR_POSITIONS } from '../lib/clockMath';
import { fmtInches } from '../lib/zbl';
import type { ClockAnnotations } from '../lib/types';

const R = 116; // button radius from center in px
const C = 140; // center of the 280px clock face

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
  const hasSlope   = slope > 0;

  if (!hasZBL && !hasSlope) return null;

  const scaleIn = (inches: number) => Math.min(Math.max(inches * 3, 10), 45);

  const zblPx = hasZBL ? scaleIn(zblAimBase) : 0;
  const zblX  = SVG_C;
  const zblY  = SVG_C - zblPx;

  const hasBreak = clockKey !== null && breakAbs >= 0.05;
  const pos = clockKey ? HOUR_POSITIONS.find(p => p.key === clockKey) : null;
  const theta = hasBreak && pos ? pos.theta : null;

  // breakSign: which side the inch-label sits on (opposite the break direction)
  const breakSign = hasBreak && theta !== null ? (Math.sin(theta) >= 0 ? 1 : -1) : 1;

  const ballX = hasBreak && theta !== null ? SVG_C + SVG_R * Math.sin(theta) : null;
  const ballY = hasBreak && theta !== null ? SVG_C - SVG_R * Math.cos(theta) : null;

  const textProps = {
    textAnchor: 'middle' as const,
    dominantBaseline: 'central' as const,
    fontWeight: 700,
    fontFamily: 'system-ui,-apple-system,sans-serif',
    fill: 'white',
    stroke: 'rgba(14,27,61,0.85)',
    strokeWidth: 3,
    paintOrder: 'stroke' as const,
  };

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

          {/* 2. Dashed line: ball → ZBL (only when break is present) */}
          {hasBreak && ballX !== null && ballY !== null && (
            <line
              x1={ballX} y1={ballY} x2={zblX} y2={zblY}
              stroke="rgba(255,255,255,0.90)"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinecap="round"
            />
          )}

          {/* 3. ZBL dot */}
          <circle cx={zblX} cy={zblY} r="5" fill="white" opacity="0.95" />

          {/* 4. Labels */}
          <text {...textProps} x={SVG_C} y={zblY - 12} fontSize="8">ZBL</text>
          <text
            {...textProps}
            x={SVG_C + (-breakSign) * 15}
            y={(SVG_C + zblY) / 2}
            fontSize="10"
          >
            {fmtInches(zblAimBase)}
          </text>
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

  return (
    <div className="lookup-input-section">
      <label className="lookup-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <IconClock size={14} stroke={2} style={{ opacity: 0.85 }} />
        Clock Position
      </label>
      <div className="clock-face">
        <div className="clock-center">○</div>

        {/* Clock hand */}
        {handDeg !== null && (
          <div
            className="clock-hand"
            style={{ transform: `translateX(-50%) rotate(${handDeg}deg)` }}
          />
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

        {/* SVG annotation overlay */}
        {(annotations || slope > 0) && (
          <ClockSVG clockKey={clockKey} annotations={annotations} slope={slope} />
        )}
      </div>
    </div>
  );
}
