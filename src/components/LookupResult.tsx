import type { LookupResult } from '../lib/types';
import { fmtInches } from '../lib/zbl';
import { useUnits } from '../hooks/useUnits';

interface Props {
  result: LookupResult | null;
}

export function LookupResultPanel({ result }: Props) {
  const { unit, fmtDist, fmtAim, fmtAimVariance } = useUnits();

  if (!result || result.kind === 'empty') {
    return (
      <div className="lookup-result">
        <div className="result-empty">
          {result ? result.message : 'Enter a distance above'}
        </div>
      </div>
    );
  }

  if (result.kind === 'straight') {
    const {
      backswing, zblRaw, zblPlus, zblMinus, slopeLabel, slope, stimp,
      uphillTotal, downhillTotal, uphillBS, downhillBS,
    } = result;

    // Format aim value and variance in the current unit
    const zblDisplayFmt = fmtAim(zblRaw);

    const varianceLine = (() => {
      if (!zblPlus && !zblMinus) return null;
      if (zblPlus && zblMinus) {
        if (unit === 'm') {
          const pCm = fmtAimVariance(zblPlus);
          const mCm = fmtAimVariance(zblMinus);
          return pCm === mCm ? `±${pCm}` : `+${pCm} / −${mCm}`;
        }
        return zblPlus === zblMinus ? `±${zblPlus}"` : `+${zblPlus}" / −${zblMinus}"`;
      }
      if (zblPlus) {
        return unit === 'm' ? `+${fmtAimVariance(zblPlus)}` : `+${zblPlus}"`;
      }
      return unit === 'm' ? `−${fmtAimVariance(zblMinus!)}` : `−${zblMinus}"`;
    })();

    const stimpScale = stimp / 10;
    const uphillRate   = Math.round(1   * stimpScale * 10) / 10;
    const downhillRate = Math.round(1.5 * stimpScale * 10) / 10;
    const flatNote = unit === 'm'
      ? `Uphill: +${(uphillRate * 0.3048).toFixed(1)} m/3 m/1%  ·  Downhill: −${(downhillRate * 0.3048).toFixed(1)} m/3 m/1%`
      : `Uphill: +${uphillRate} ft/10 ft/1%  ·  Downhill: −${downhillRate} ft/10 ft/1%`;

    return (
      <div className="lookup-result">
        <div className="result-content">
          <div className="result-row">
            <div className="result-item">
              <div className="result-value">{backswing}</div>
              <div className="result-label">Backswing</div>
              {slope === 0 && (
                <div
                  className="slope-note"
                  dangerouslySetInnerHTML={{ __html: flatNote.replace('  ·  ', '<br>') }}
                />
              )}
            </div>
            <div className="result-divider" />
            <div className="result-item">
              <div className="result-value">{zblDisplayFmt}</div>
              <div className="result-label">{slopeLabel}</div>
              {varianceLine && (
                <div className="result-variance">{varianceLine}</div>
              )}
            </div>
          </div>

          {slope > 0 && (
            <div className="slope-row">
              <span className="slope-item slope-up">↑ {fmtDist(uphillTotal)} · {uphillBS}</span>
              <span className="slope-item slope-down">↓ {fmtDist(downhillTotal)} · {downhillBS}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Clock mode
  const {
    backswing, namedAim, edgeAim, zblAimBase, breakAbs,
    breakFactor, uphillFactor, adjDist, slope,
  } = result;

  const breakDir = breakAbs < 0.05
    ? 'Straight'
    : breakFactor > 0 ? 'R→L' : 'L→R';

  // Format edge aim in the current unit
  const edgeAimFmt = unit === 'm'
    ? <>{fmtAim(edgeAim)}<span className="result-unit">out</span></>
    : <>{fmtInches(edgeAim)}<span className="result-unit">out</span></>;

  const zblAimFmt = unit === 'm'
    ? fmtAim(zblAimBase)
    : fmtInches(zblAimBase);

  const aimCell = breakAbs >= 0.05 ? (
    <div className="result-item">
      {namedAim
        ? <div className="result-value result-value-word">{namedAim}</div>
        : (
          <div className="result-value-with-unit">
            {edgeAimFmt}
          </div>
        )
      }
      <div className="result-label">Aim</div>
      <div className="result-zbl-ref">ZBL {zblAimFmt}</div>
    </div>
  ) : (
    <div className="result-item">
      <div className="result-value result-value-word">Straight</div>
      <div className="result-zbl-ref">ZBL {zblAimFmt}</div>
    </div>
  );

  const showSlopeRow = slope > 0 && Math.abs(uphillFactor) > 0.05;
  const isUphill = uphillFactor > 0;

  return (
    <div className="lookup-result">
      <div className="result-content">
        <div className="result-row">
          <div className="result-item">
            <div className="result-value">{backswing}</div>
            <div className="result-label">Backswing</div>
          </div>
          <div className="result-divider" />
          {aimCell}
        </div>

        {showSlopeRow && (
          <div className="slope-row slope-row-centered">
            <span className={`slope-dir ${isUphill ? 'slope-up' : 'slope-down'}`}>
              {isUphill ? '↑ Uphill' : '↓ Downhill'}
            </span>
            <span className="slope-dist">{fmtDist(adjDist)}</span>
          </div>
        )}

        {breakAbs >= 0.05 && (
          <div className="slope-row slope-row-centered" style={{ borderTop: 'none', paddingTop: 0 }}>
            <span className="slope-dir" style={{ color: 'var(--gray-400)' }}>{breakDir}</span>
          </div>
        )}
      </div>
    </div>
  );
}
