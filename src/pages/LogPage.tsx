import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconArrowLeft } from '@tabler/icons-react';
import { usePuttLog, todayRoundId, type PuttRound, type PuttOutcome } from '../hooks/usePuttLog';

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

function RoundStats({ round }: { round: PuttRound }) {
  const { entries } = round;
  const total = entries.length;

  if (total === 0) return <EmptyState />;

  const made = countOutcome(entries, 'made');

  return (
    <>
      {/* Summary */}
      <div className="log-card">
        <div className="log-card-title">Round Summary</div>
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
            <div className="log-summary-value">{made}</div>
            <div className="log-summary-label">Made</div>
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
    </>
  );
}

// ── Page component ────────────────────────────────────────────────────────────

export function LogPage() {
  const { allRoundIds, currentRound, getRound, todayId } = usePuttLog();
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
          <IconArrowLeft size={16} stroke={2} />
          Back
        </Link>
        <div className="header-brand">
          <img src="images/new-logo.png" alt="" className="header-logo" />
          <h1>Putt Log</h1>
        </div>
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
        <RoundStats round={selectedRound} />
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
