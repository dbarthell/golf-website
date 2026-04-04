import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { usePuttLog, todayRoundId, type PuttEntry, type PuttRound, type PuttOutcome } from '../hooks/usePuttLog';
import { useUnits } from '../hooks/useUnits';
import { getClockFactors } from '../lib/clockMath';

// ── Constants ─────────────────────────────────────────────────────────────────

const BUCKETS = [
  { label: '0–10 ft',  min: 0,  max: 10  },
  { label: '10–20 ft', min: 10, max: 20  },
  { label: '20–30 ft', min: 20, max: 30  },
  { label: '30+ ft',   min: 30, max: Infinity },
] as const;

const OUTCOMES: { key: PuttOutcome; label: string }[] = [
  { key: 'made',  label: 'Made'  },
  { key: 'short', label: 'Short' },
  { key: 'long',  label: 'Long'  },
  { key: 'left',  label: 'Left'  },
  { key: 'right', label: 'Right' },
];

const FREE_ROUND_LIMIT = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────

function yesterdayId(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatRoundId(id: string): string {
  if (id === todayRoundId()) return 'Today';
  if (id === yesterdayId()) return 'Yesterday';
  const [y, m, d] = id.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return Math.round((n / total) * 100) + '%';
}

function countOutcome(entries: PuttRound['entries'], key: PuttOutcome): number {
  return entries.filter(e => e.outcome === key).length;
}

type BreakDir = 'r2l' | 'l2r' | 'straight';

function breakDir(entry: PuttEntry): BreakDir {
  if (!entry.clock) return 'straight';
  const factors = getClockFactors(entry.clock);
  if (!factors) return 'straight';
  if (Math.abs(factors.breakFactor) < 0.1) return 'straight';
  return factors.breakFactor > 0 ? 'r2l' : 'l2r';
}

function MissByBreak({ entries }: { entries: PuttEntry[] }) {
  const groups: Record<BreakDir, PuttEntry[]> = { r2l: [], l2r: [], straight: [] };
  for (const e of entries) groups[breakDir(e)].push(e);

  const sections: { dir: BreakDir; label: string; entries: PuttEntry[] }[] = (
    [
      { dir: 'r2l' as BreakDir, label: 'Right-to-left break', entries: groups.r2l },
      { dir: 'l2r' as BreakDir, label: 'Left-to-right break', entries: groups.l2r },
      { dir: 'straight' as BreakDir, label: 'Straight', entries: groups.straight },
    ] as { dir: BreakDir; label: string; entries: PuttEntry[] }[]
  ).filter(s => s.entries.length > 0);

  if (sections.length === 0) return null;

  return (
    <div className="log-card">
      <div className="log-card-title">Miss Tendency by Break</div>
      {sections.map(({ dir, label, entries: es }) => {
        const total = es.length;
        return (
          <div key={dir} className="log-break-section">
            <div className="log-break-label">{label} <span className="log-break-count">({total} putt{total !== 1 ? 's' : ''})</span></div>
            <div className="log-outcome-grid log-outcome-grid--compact">
              {OUTCOMES.map(({ key, label: ol }) => {
                const n = countOutcome(es, key);
                return (
                  <div key={key} className={`log-outcome-item${key === 'made' ? ' log-outcome-made' : ''}`}>
                    <div className="log-outcome-pct">{pct(n, total)}</div>
                    <div className="log-outcome-label">{ol}</div>
                    <div className="log-outcome-count">{n}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="log-empty">
      <div className="log-empty-icon">⛳</div>
      <div className="log-empty-text">No putts logged yet</div>
      <div className="log-empty-sub">
        After each putt, tap "Log this putt" in the result panel to record your outcome.
      </div>
    </div>
  );
}

const OUTCOME_COLORS: Record<PuttOutcome, string> = {
  made:  'var(--green-dark)',
  short: 'var(--gray-600)',
  long:  'var(--gray-600)',
  left:  'var(--gray-600)',
  right: 'var(--gray-600)',
};

function PuttEntryRow({ entry, onDelete }: { entry: PuttEntry; onDelete: () => void }) {
  const { fmtDist } = useUnits();
  const label = entry.outcome.charAt(0).toUpperCase() + entry.outcome.slice(1);
  const slopeStr = entry.slope > 0 ? ` · ${entry.slope}%` : '';
  function fmtClock(c: string): string {
    const n = parseFloat(c);
    if (isNaN(n)) return c;
    const hour = Math.floor(n);
    const min = n % 1 === 0.5 ? '30' : '00';
    return `${hour}:${min}`;
  }
  const clockStr = entry.clock ? ` · ${fmtClock(entry.clock)}` : '';
  return (
    <div className="log-entry-row">
      <div className="log-entry-info">
        <span className="log-entry-dist">{fmtDist(entry.distance)}{slopeStr}{clockStr}</span>
        <span className="log-entry-outcome" style={{ color: OUTCOME_COLORS[entry.outcome] }}>
          {label}
        </span>
      </div>
      <button className="log-entry-delete" onClick={onDelete} aria-label="Delete putt">
        <IconTrash size={15} stroke={1.75} />
      </button>
    </div>
  );
}

function RoundStats({ round, onDelete }: { round: PuttRound; onDelete: (id: string) => void }) {
  const { fmtDist } = useUnits();
  const { entries } = round;
  const total = entries.length;

  if (total === 0) return <EmptyState />;

  const made = countOutcome(entries, 'made');
  const avgDist = entries.reduce((sum, e) => sum + e.distance, 0) / total;

  // Derive round stimp as the most common stimp value across entries
  const stimpCounts = entries.reduce<Record<number, number>>((acc, e) => {
    acc[e.stimp] = (acc[e.stimp] ?? 0) + 1;
    return acc;
  }, {});
  const roundStimp = Object.entries(stimpCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <>
      {/* Summary */}
      <div className="log-card">
        <div className="log-card-title">Round Summary {roundStimp && <span className="log-card-title-sub">· Stimp {roundStimp}</span>}</div>
        <div className="log-summary-row">
          <div className="log-summary-item">
            <div className="log-summary-value">{total}</div>
            <div className="log-summary-label">Putts</div>
          </div>
          <div className="log-summary-divider" />
          <div className="log-summary-item">
            <div className="log-summary-value">{pct(made, total)}</div>
            <div className="log-summary-label">Make %</div>
          </div>
          <div className="log-summary-divider" />
          <div className="log-summary-item">
            <div className="log-summary-value">{fmtDist(Math.round(avgDist))}</div>
            <div className="log-summary-label">Avg Dist</div>
          </div>
        </div>
      </div>

      {/* Distance buckets */}
      <div className="log-card">
        <div className="log-card-title">By Distance</div>
        {BUCKETS.map(bucket => {
          const bucketEntries = entries.filter(
            e => e.distance >= bucket.min && e.distance < bucket.max,
          );
          if (bucketEntries.length === 0) return null;
          const bucketMade = countOutcome(bucketEntries, 'made');
          const makeRate = bucketMade / bucketEntries.length;
          return (
            <div key={bucket.label} className="log-bucket-row">
              <div className="log-bucket-label">{bucket.label}</div>
              <div className="log-bucket-bar-wrap">
                <div
                  className="log-bucket-bar"
                  style={{ width: `${Math.round(makeRate * 100)}%` }}
                />
              </div>
              <div className="log-bucket-stats">
                {bucketMade}/{bucketEntries.length} · {pct(bucketMade, bucketEntries.length)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Miss tendency */}
      <div className="log-card">
        <div className="log-card-title">Miss Tendency</div>
        <div className="log-outcome-grid">
          {OUTCOMES.map(({ key, label }) => {
            const n = countOutcome(entries, key);
            return (
              <div
                key={key}
                className={`log-outcome-item${key === 'made' ? ' log-outcome-made' : ''}`}
              >
                <div className="log-outcome-pct">{pct(n, total)}</div>
                <div className="log-outcome-label">{label}</div>
                <div className="log-outcome-count">{n}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Miss tendency by break direction */}
      <MissByBreak entries={entries} />

      {/* Individual putts */}
      <div className="log-card">
        <div className="log-card-title">Putts</div>
        {[...entries].reverse().map(entry => (
          <PuttEntryRow key={entry.id} entry={entry} onDelete={() => onDelete(entry.id)} />
        ))}
      </div>
    </>
  );
}

// ── Page component ────────────────────────────────────────────────────────────

export function LogPage() {
  const { allRoundIds, currentRound, getRound, deletePutt, todayId } = usePuttLog();
  const [selectedRoundId, setSelectedRoundId] = useState(todayId);

  // Always show today first; then up to FREE_ROUND_LIMIT-1 most-recent past rounds
  const pastRoundIds = allRoundIds.filter(id => id !== todayId);
  const freeRoundIds = [todayId, ...pastRoundIds.slice(0, FREE_ROUND_LIMIT - 1)];
  const hasMoreRounds = pastRoundIds.length >= FREE_ROUND_LIMIT;
  const lockedCount = Math.max(0, pastRoundIds.length - (FREE_ROUND_LIMIT - 1));

  const selectedRound =
    selectedRoundId === todayId ? currentRound : getRound(selectedRoundId);

  return (
    <>
      {/* Header */}
      <div className="log-header">
        <Link to="/" className="back-link">
          <IconArrowLeft size={20} stroke={2} />
        </Link>
        <h1>Putt Log</h1>
        <div className="header-spacer" />
      </div>

      {/* Round selector */}
      <div className="log-round-selector">
        {freeRoundIds.map(id => (
          <button
            key={id}
            className={`log-round-chip${selectedRoundId === id ? ' log-round-chip-active' : ''}`}
            onClick={() => setSelectedRoundId(id)}
          >
            {formatRoundId(id)}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="log-body">
        <RoundStats
          round={selectedRound}
          onDelete={id => deletePutt(selectedRoundId, id)}
        />
      </div>

      {/* Premium upsell */}
      {hasMoreRounds && (
        <div className="log-upsell-card">
          <div className="log-upsell-icon">🔒</div>
          <div className="log-upsell-content">
            <div className="log-upsell-title">Unlock Full History</div>
            <div className="log-upsell-sub">
              {lockedCount} older round{lockedCount !== 1 ? 's' : ''} + CSV/JSON export with Premium.
            </div>
          </div>
          <button className="log-upsell-btn">Upgrade</button>
        </div>
      )}
    </>
  );
}
