import { fmtInches, aimPoint } from '../lib/zbl';

export interface LookupResultData {
  mode: 'clock' | 'straight';
  backswing: string;       // formatted e.g. "8.5""
  // straight mode
  zblDisplay?: string;     // formatted e.g. "9""
  slopeLabel?: string;
  slopeNote?: string;
  uphillRow?: { dist: number; bs: string };
  downhillRow?: { dist: number; bs: string };
  // clock mode
  lateralAim?: number;     // raw inches (from cup center)
  breakAbs?: number;
  breakFactor?: number;
  zblAimBase?: number;
  uphillFactor?: number;
  adjDist?: number;
}

interface LookupResultProps {
  data: LookupResultData | null;
}

export default function LookupResult({ data }: LookupResultProps) {
  if (!data) {
    return (
      <div className="lookup-result">
        <div className="result-empty">Enter a distance above</div>
      </div>
    );
  }

  if (data.mode === 'straight') {
    return <StraightResult data={data} />;
  }
  return <ClockResult data={data} />;
}

// ── Straight (no clock) mode ──────────────────────────────────────────────────

function StraightResult({ data }: { data: LookupResultData }) {
  const {
    backswing, zblDisplay, slopeLabel, slopeNote,
    uphillRow, downhillRow,
  } = data;

  const slopeRowEl = uphillRow && downhillRow ? (
    <div className="slope-row">
      <span className="slope-item slope-up">
        ↑ {uphillRow.dist} ft · {uphillRow.bs}
      </span>
      <span className="slope-item slope-down">
        ↓ {downhillRow.dist} ft · {downhillRow.bs}
      </span>
    </div>
  ) : null;

  return (
    <div className="lookup-result">
      <div className="result-content">
        <div className="result-row">
          <div className="result-item">
            <div className="result-value">{backswing}</div>
            <div className="result-label">Backswing</div>
            {slopeNote && (
              <div
                className="slope-note"
                dangerouslySetInnerHTML={{ __html: slopeNote }}
              />
            )}
          </div>
          <div className="result-divider" />
          <div className="result-item">
            <div className="result-value">{zblDisplay}</div>
            <div className="result-label">{slopeLabel}</div>
          </div>
        </div>
        {slopeRowEl}
      </div>
    </div>
  );
}

// ── Clock mode ────────────────────────────────────────────────────────────────

function ClockResult({ data }: { data: LookupResultData }) {
  const {
    backswing, lateralAim = 0, breakAbs = 0,
    breakFactor = 0, zblAimBase = 0, uphillFactor = 0,
    adjDist,
  } = data;

  // Aim cell
  const edgeAim  = lateralAim - 2.125; // cup center → cup edge
  const namedAim = aimPoint(lateralAim, breakFactor);

  const aimValueEl = namedAim ? (
    <div className="result-value result-value-word">{namedAim}</div>
  ) : (
    <div className="result-value-with-unit">
      {fmtInches(edgeAim)}
      <span className="result-unit">out</span>
    </div>
  );

  const aimCellEl = breakAbs >= 0.05 ? (
    <div className="result-item">
      {aimValueEl}
      <div className="result-label">Aim</div>
      <div className="result-zbl-ref">ZBL {fmtInches(zblAimBase)}</div>
    </div>
  ) : (
    <div className="result-item">
      <div className="result-value result-value-word">Straight</div>
      <div className="result-zbl-ref">ZBL {fmtInches(zblAimBase)}</div>
    </div>
  );

  // Slope row (only when there is an uphill/downhill component)
  const hasSlopeComponent = adjDist !== undefined && Math.abs(uphillFactor) > 0.05;
  const slopeRowEl = hasSlopeComponent && adjDist !== undefined ? (
    <div className="slope-row slope-row-centered">
      <span className={`slope-dir ${uphillFactor > 0 ? 'slope-up' : 'slope-down'}`}>
        {uphillFactor > 0 ? '↑ Uphill' : '↓ Downhill'}
      </span>
      <span className="slope-dist">{adjDist} ft</span>
    </div>
  ) : null;

  return (
    <div className="lookup-result">
      <div className="result-content">
        <div className="result-row">
          <div className="result-item">
            <div className="result-value">{backswing}</div>
            <div className="result-label">Backswing</div>
          </div>
          <div className="result-divider" />
          {aimCellEl}
        </div>
        {slopeRowEl}
      </div>
    </div>
  );
}
