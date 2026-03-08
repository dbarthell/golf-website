import type { LookupResult } from '../lib/types';
import { fmtInches } from '../lib/zbl';

interface Props {
  result: LookupResult | null;
}

export function LookupResultPanel({ result }: Props) {
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
      backswing, zblDisplay, zblPlus, zblMinus, slopeLabel, slope, stimp,
      uphillTotal, downhillTotal, uphillBS, downhillBS,
    } = result;

    const varianceLine = (() => {
      if (!zblPlus && !zblMinus) return null;
      if (zblPlus && zblMinus) {
        return zblPlus === zblMinus ? `±${zblPlus}"` : `+${zblPlus}" / −${zblMinus}"`;
      }
      if (zblPlus) return `+${zblPlus}"`;
      return `−${zblMinus}"`;
    })();

    const stimpScale = stimp / 10;
    const uphillRate   = Math.round(1   * stimpScale * 10) / 10;
    const downhillRate = Math.round(1.5 * stimpScale * 10) / 10;
    const flatNote = `Uphill: +${uphillRate} ft/10 ft/1%  ·  Downhill: −${downhillRate} ft/10 ft/1%`;

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
              <div className="result-value">{zblDisplay}</div>
              <div className="result-label">{slopeLabel}</div>
              {varianceLine && (
                <div className="result-variance">{varianceLine}</div>
              )}
            </div>
          </div>

          {slope > 0 && (
            <div className="slope-row">
              <span className="slope-item slope-up">↑ {uphillTotal} ft · {uphillBS}</span>
              <span className="slope-item slope-down">↓ {downhillTotal} ft · {downhillBS}</span>
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

  const aimCell = breakAbs >= 0.05 ? (
    <div className="result-item">
      {namedAim
        ? <div className="result-value result-value-word">{namedAim}</div>
        : (
          <div className="result-value-with-unit">
            {fmtInches(edgeAim)}<span className="result-unit">out</span>
          </div>
        )
      }
      <div className="result-label">Aim</div>
      <div className="result-zbl-ref">ZBL {fmtInches(zblAimBase)}</div>
    </div>
  ) : (
    <div className="result-item">
      <div className="result-value result-value-word">Straight</div>
      <div className="result-zbl-ref">ZBL {fmtInches(zblAimBase)}</div>
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
            <span className="slope-dist">{adjDist} ft</span>
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
