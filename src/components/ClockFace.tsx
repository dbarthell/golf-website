import { IconClock } from '@tabler/icons-react';
import { HOUR_POSITIONS, CLOCK_DATA } from '../lib/clockMath';
import { fmtInches } from '../lib/zbl';

export interface ClockAnnotation {
  zblAimBase: number;
  lateralAim: number;
  plusV: number;
  minusV: number;
  breakAbs: number;
  uphillFactor: number;
}

interface ClockFaceProps {
  currentClock: string | null;
  onClockChange: (key: string | null) => void;
  annotation: ClockAnnotation | null;
}

const R_BTN = 116; // button radius from center in px
const C_BTN = 140; // center of 280px face

// ── SVG annotation builder ────────────────────────────────────────────────────

interface SVGLabelProps {
  x: number;
  y: number;
  text: string;
  fontSize: number;
}

function SVGLabel({ x, y, text, fontSize }: SVGLabelProps) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={fontSize}
      fontWeight="700"
      fontFamily="system-ui,-apple-system,sans-serif"
      fill="white"
      stroke="rgba(14,27,61,0.85)"
      strokeWidth="3"
      paintOrder="stroke"
    >
      {text}
    </text>
  );
}

function ClockSVGAnnotation({
  clockKey,
  annotation,
}: {
  clockKey: string | null;
  annotation: ClockAnnotation | null;
}) {
  if (!annotation || !annotation.zblAimBase || annotation.zblAimBase <= 0) return null;

  const { zblAimBase, breakAbs } = annotation;
  const C = 100; // SVG center (hole)
  const R = 83;  // ball position radius

  // Visual scale: inches → SVG px, clamped for visibility
  const scaleIn = (inches: number) => Math.min(Math.max(inches * 3, 10), 45);

  // ZBL point: always directly above cup at 12 o'clock
  const zblPx = scaleIn(zblAimBase);
  const zblX  = C;
  const zblY  = C - zblPx;

  const hasBreak = clockKey !== null && breakAbs >= 0.05;

  // Get visual theta for the active clock position
  let theta = 0;
  if (hasBreak && clockKey) {
    const pos = HOUR_POSITIONS.find(p => p.key === clockKey);
    theta = pos ? pos.theta : (CLOCK_DATA[clockKey]?.theta ?? 0);
  }

  const breakSign = hasBreak ? (Math.sin(theta) >= 0 ? 1 : -1) : 1;
  const ballX = C + R * Math.sin(theta);
  const ballY = C - R * Math.cos(theta);

  return (
    <>
      {/* Measurement line: cup → ZBL (always visible) */}
      <line
        x1={C} y1={C} x2={C} y2={zblY}
        stroke="rgba(255,255,255,0.40)"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Dashed line: ball → ZBL (only when clock + break is active) */}
      {hasBreak && (
        <line
          x1={ballX} y1={ballY} x2={zblX} y2={zblY}
          stroke="rgba(255,255,255,0.90)"
          strokeWidth="2"
          strokeDasharray="4 3"
          strokeLinecap="round"
        />
      )}

      {/* ZBL dot at 12 o'clock */}
      <circle cx={zblX} cy={zblY} r="5" fill="white" opacity="0.95" />

      {/* Labels */}
      <SVGLabel x={C} y={zblY - 12} text="ZBL" fontSize={8} />
      <SVGLabel
        x={C + (-breakSign) * 15}
        y={(C + zblY) / 2}
        text={fmtInches(zblAimBase)}
        fontSize={10}
      />
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ClockFace({ currentClock, onClockChange, annotation }: ClockFaceProps) {
  const handleClick = (key: string) => {
    onClockChange(currentClock === key ? null : key);
  };

  // Compute hand rotation from the active clock position's display theta
  let handDeg: number | null = null;
  if (currentClock) {
    const pos = HOUR_POSITIONS.find(p => p.key === currentClock);
    if (pos) handDeg = pos.theta * (180 / Math.PI);
  }

  return (
    <div className="lookup-input-section">
      <label
        className="lookup-label"
        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
      >
        <IconClock size={14} />
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
          const x = C_BTN + R_BTN * Math.sin(theta);
          const y = C_BTN - R_BTN * Math.cos(theta);
          return (
            <button
              key={key}
              className={[
                'clock-pos',
                half ? 'clock-pos-half' : '',
                currentClock === key ? 'clock-pos-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ left: x, top: y }}
              onClick={() => handleClick(key)}
              aria-label={`Clock position ${label}`}
              aria-pressed={currentClock === key}
            >
              {label}
            </button>
          );
        })}

        {/* SVG annotation overlay */}
        <svg className="clock-svg" viewBox="0 0 200 200" aria-hidden="true">
          <ClockSVGAnnotation clockKey={currentClock} annotation={annotation} />
        </svg>
      </div>
    </div>
  );
}
