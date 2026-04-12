import { useRef, useCallback, useEffect, useState } from 'react';
import { IconMapPin, IconX, IconRefresh } from '@tabler/icons-react';
import { useCourseSelector } from '../hooks/useCourseSelector';
import { inferPuttFromImage } from '../lib/slopeColor';

const IMG_W = 900;
const IMG_H = 1620;

interface Props {
  onSetDistance: (feet: number) => void;
  onSetSlope: (pct: number) => void;
  onSelectionChange?: (label: string | null) => void;
}

interface NormPoint { x: number; y: number; }
type TapStep = 'hole' | 'ball' | 'done';

export function GreenSlopePanel({ onSetDistance, onSetSlope, onSelectionChange }: Props) {
  const {
    query, setQuery,
    searchResults, searching, searchError,
    selectedCourse, selectCourse, clearCourse,
    holes, holesLoading,
    selectedHoleNum, setSelectedHoleNum,
    renderDetail, imageLoading, imageError, loadImage,
  } = useCourseSelector();

  // ── Tap state ─────────────────────────────────────────────────────────────
  const [tapStep, setTapStep]     = useState<TapStep>('hole');
  const [holeNorm, setHoleNorm]   = useState<NormPoint | null>(null);
  const [ballNorm, setBallNorm]   = useState<NormPoint | null>(null);
  const [inferring, setInferring] = useState(false);


  // Notify parent whenever course/hole selection changes
  useEffect(() => {
    onSelectionChange?.(
      selectedCourse ? `${selectedCourse.name} — Hole ${selectedHoleNum}` : null
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourse, selectedHoleNum]);

  const containerRef  = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const resetTap = useCallback(() => {
    setHoleNorm(null);
    setBallNorm(null);
    setInferring(false);
    setTapStep('hole');
  }, []);

  // ── Touch / tap handlers ──────────────────────────────────────────────────
  function handleTouchStart(e: React.TouchEvent) {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  function handleTap(e: React.TouchEvent | React.MouseEvent) {
    const el = containerRef.current;
    if (!el) return;

    let clientX: number, clientY: number;
    if ('changedTouches' in e) {
      const start = touchStartRef.current;
      const end   = e.changedTouches[0];
      if (!start) return;
      if (Math.abs(end.clientX - start.x) > 12 || Math.abs(end.clientY - start.y) > 12) return;
      clientX = end.clientX;
      clientY = end.clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const rect = el.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (clientX - rect.left)  / rect.width));
    const ny = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    if (tapStep === 'hole') {
      setHoleNorm({ x: nx, y: ny });
      setBallNorm(null);
      setTapStep('ball');
    } else if (tapStep === 'ball') {
      const ball = { x: nx, y: ny };
      setBallNorm(ball);
      setTapStep('done');

      if (holeNorm && renderDetail) {
        const dx = (ball.x - holeNorm.x) * IMG_W;
        const dy = (ball.y - holeNorm.y) * IMG_H;
        onSetDistance(Math.round(
          Math.sqrt(dx * dx + dy * dy) * renderDetail.meterToPixelScale * 3.28084
        ));
        setInferring(true);
        inferPuttFromImage(renderDetail.imageUrl, ball, holeNorm).then(result => {
          if (result.slope != null) onSetSlope(result.slope);
          setInferring(false);
        });
      }
    } else {
      resetTap();
    }
  }

  const holePct = holeNorm ? { x: `${holeNorm.x * 100}%`, y: `${holeNorm.y * 100}%` } : null;
  const ballPct = ballNorm ? { x: `${ballNorm.x * 100}%`, y: `${ballNorm.y * 100}%` } : null;

  const tapPrompt =
    inferring          ? 'Analyzing…' :
    tapStep === 'hole' ? 'Tap the hole' :
    tapStep === 'ball' ? 'Now tap your ball' :
    'Tap image to reset';

  // ── No course selected — show search ─────────────────────────────────────
  if (!selectedCourse) {
    return (
      <div className="gs-panel gs-panel-search">
        <div className="gs-panel-title">
          <IconMapPin size={16} stroke={2} />
          Green Map
        </div>
        <input
          className="gs-search-input"
          type="text"
          placeholder="Search for a course…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
        />
        {searching && <div className="gs-status">Searching…</div>}
        {searchError && <div className="gs-error">{searchError}</div>}
        {searchResults.length > 0 && (
          <ul className="gs-results">
            {searchResults.map(r => (
              <li key={r.publicId}>
                <button className="gs-result-btn" onClick={() => selectCourse(r)}>
                  <span className="gs-result-name">{r.name}</span>
                  <span className="gs-result-loc">
                    {[r.city, r.stateCode].filter(Boolean).join(', ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!searching && query.length >= 3 && searchResults.length === 0 && !searchError && (
          <div className="gs-status">No courses found</div>
        )}
      </div>
    );
  }

  // ── Course selected — hole picker + image ─────────────────────────────────
  return (
    <div className="gs-panel gs-panel-map">
      {/* ── Compact header ────────────────────────────────────────────────── */}
      <div className="gs-panel-header">
        <div className="gs-course-header">
          <span className="gs-course-header-name">{selectedCourse.name}</span>
          <button className="gs-course-header-btn" onClick={clearCourse} aria-label="Change course">
            Change
          </button>
        </div>

        {holesLoading ? (
          <div className="gs-status">Loading holes…</div>
        ) : holes.length > 0 && (
          <div className="gs-hole-picker">
            {holes.map(h => (
              <button
                key={h.holeNumber}
                className={`gs-hole-chip${selectedHoleNum === h.holeNumber ? ' gs-hole-chip-active' : ''}`}
                onClick={() => { setSelectedHoleNum(h.holeNumber); resetTap(); }}
              >
                {h.holeNumber}
              </button>
            ))}
          </div>
        )}

        {!renderDetail && !imageLoading && (
          <button className="gs-load-btn" onClick={loadImage}>
            Load Green Map
            <span className="gs-credit-badge">1 credit</span>
          </button>
        )}
        {imageLoading && <div className="gs-status">Loading map…</div>}
        {imageError && (
          <div className="gs-error">
            {imageError}
            <button className="gs-retry-btn" onClick={loadImage}>Retry</button>
          </div>
        )}
      </div>

      {/* ── Image area — fills remaining height ───────────────────────────── */}
      {renderDetail && (
        <div className="gs-image-area">
          <div className="gs-tap-prompt">{tapPrompt}</div>
          <div
            ref={containerRef}
            className="gs-image-wrap gs-tappable"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTap}
            onClick={handleTap}
          >
            <img
              src={renderDetail.imageUrl}
              alt={`slope map — hole ${selectedHoleNum}`}
              className="gs-image"
              draggable={false}
            />
            {(holePct || ballPct) && (
              <svg className="gs-overlay" xmlns="http://www.w3.org/2000/svg">
                {holePct && ballPct && (
                  <line
                    x1={ballPct.x} y1={ballPct.y}
                    x2={holePct.x} y2={holePct.y}
                    stroke="white" strokeWidth="2"
                    strokeDasharray="10 6" strokeLinecap="round"
                  />
                )}
                {holePct && (
                  <g>
                    <circle cx={holePct.x} cy={holePct.y} r="12" fill="white" />
                    <circle cx={holePct.x} cy={holePct.y} r="5"  fill="#013c36" />
                  </g>
                )}
                {ballNorm && (() => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (!rect) return null;
                  const bx = ballNorm.x * rect.width;
                  const by = ballNorm.y * rect.height;
                  const dimples: [number, number][] = [
                    [-5, -8], [4, -7], [9, -2],
                    [-8,  3], [0,  -3], [-6, -3],
                    [ 6,  5], [-2,  9], [1, 3],
                  ];
                  return (
                    <g>
                      <circle cx={bx} cy={by} r="12" fill="white" stroke="rgba(0,0,0,0.18)" strokeWidth="0.75" />
                      {dimples.map(([dx, dy], i) => (
                        <circle key={i} cx={bx + dx} cy={by + dy} r="1" fill="rgba(0,0,0,0.16)" />
                      ))}
                    </g>
                  );
                })()}
              </svg>
            )}
          </div>
          {(holeNorm || ballNorm) && !inferring && (
            <button className="gs-reset-tap-btn" onClick={resetTap}>
              <IconRefresh size={12} stroke={2} /> Reset markers
            </button>
          )}
        </div>
      )}
    </div>
  );
}
