import { Link } from 'react-router-dom';
import { IconArrowLeft } from '@tabler/icons-react';
import { usePuttLog, type PuttRound } from '../hooks/usePuttLog';

// ── Distance buckets ──────────────────────────────────────────────────────────

const DIST_BUCKETS = [
  { label: "< 5'",   min: 0,  max: 5        },
  { label: "5–10'",  min: 5,  max: 10       },
  { label: "10–15'", min: 10, max: 15       },
  { label: "15–20'", min: 15, max: 20       },
  { label: "20–25'", min: 20, max: 25       },
  { label: "> 25'",  min: 25, max: Infinity },
] as const;

// ── Stats computation ─────────────────────────────────────────────────────────

interface HoleInRound { hole: number; count: number; }

interface Stats {
  numRounds: number;
  puttsPerRound: number;
  totalHoles: number;
  onePutts: number;
  twoPutts: number;
  threePlus: number;
  byDistance: { label: string; total: number; made: number }[];
  missCounts: Record<'short' | 'long' | 'left' | 'right', number>;
  missTotal: number;
  detailedCount: number;
  holeAverages: { hole: number; avg: number; rounds: number }[];
}

function computeStats(rounds: PuttRound[]): Stats | null {
  if (rounds.length === 0) return null;

  const allEntries = rounds.flatMap(r => r.entries);

  // Collect per-hole putt counts across all rounds
  const allHoles: HoleInRound[] = [];
  for (const round of rounds) {
    const holeNums = [...new Set(
      round.entries.map(e => e.hole).filter((h): h is number => h !== undefined),
    )];
    for (const hole of holeNums) {
      const count = round.entries.filter(e => e.hole === hole).length;
      allHoles.push({ hole, count });
    }
  }

  const totalHoles = allHoles.length;
  const onePutts   = allHoles.filter(h => h.count === 1).length;
  const twoPutts   = allHoles.filter(h => h.count === 2).length;
  const threePlus  = allHoles.filter(h => h.count >= 3).length;

  const puttsPerRound = allEntries.length / rounds.length;

  // Detailed putts only (distance > 0) — used for make% and miss tendency
  // Quick-entry putts (distance === 0) are excluded to avoid skewing results
  const detailed = allEntries.filter(e => e.distance > 0);

  const byDistance = DIST_BUCKETS.map(bucket => {
    const bucketEntries = detailed.filter(
      e => e.distance >= bucket.min && e.distance < bucket.max,
    );
    const made = bucketEntries.filter(e => e.outcome === 'made').length;
    return { label: bucket.label, total: bucketEntries.length, made };
  }).filter(b => b.total > 0);

  const misses = detailed.filter(e => e.outcome !== 'made');
  const missCounts = {
    short: misses.filter(e => e.outcome === 'short').length,
    long:  misses.filter(e => e.outcome === 'long').length,
    left:  misses.filter(e => e.outcome === 'left').length,
    right: misses.filter(e => e.outcome === 'right').length,
  };

  // Per-hole averages (holes 1–18)
  const holeAverages: { hole: number; avg: number; rounds: number }[] = [];
  for (let h = 1; h <= 18; h++) {
    const holeData = allHoles.filter(hd => hd.hole === h);
    if (holeData.length > 0) {
      const avg = holeData.reduce((sum, hd) => sum + hd.count, 0) / holeData.length;
      holeAverages.push({ hole: h, avg, rounds: holeData.length });
    }
  }

  return {
    numRounds: rounds.length,
    puttsPerRound,
    totalHoles,
    onePutts,
    twoPutts,
    threePlus,
    byDistance,
    missCounts,
    missTotal: misses.length,
    detailedCount: detailed.length,
    holeAverages,
  };
}

function pct(n: number, d: number, decimals = 0): string {
  if (d === 0) return '–';
  const v = (n / d) * 100;
  return v.toFixed(decimals) + '%';
}

function round1(n: number): string {
  return n.toFixed(1);
}

// ── Sub-components ────────────────────────────────────────────────────────────

const MISS_OUTCOMES: { key: 'short' | 'long' | 'left' | 'right'; label: string }[] = [
  { key: 'short', label: 'Short' },
  { key: 'long',  label: 'Long'  },
  { key: 'left',  label: 'Left'  },
  { key: 'right', label: 'Right' },
];

function EmptyState() {
  return (
    <div className="log-empty">
      <div className="log-empty-icon">📊</div>
      <div className="log-empty-text">No data yet</div>
      <div className="log-empty-sub">
        Complete a round in Play mode to see your putting stats.
      </div>
      <Link to="/game" className="stats-play-link">Go to Play →</Link>
    </div>
  );
}

function SummaryCard({ stats }: { stats: Stats }) {
  return (
    <div className="log-card">
      <div className="log-card-title">
        Summary
        <span className="log-card-title-sub">· {stats.numRounds} round{stats.numRounds !== 1 ? 's' : ''}</span>
      </div>
      <div className="log-summary-row">
        <div className="log-summary-item">
          <div className="log-summary-value">{round1(stats.puttsPerRound)}</div>
          <div className="log-summary-label">Putts / Round</div>
        </div>
        <div className="log-summary-divider" />
        <div className="log-summary-item">
          <div className="log-summary-value">{pct(stats.onePutts, stats.totalHoles, 1)}</div>
          <div className="log-summary-label">1-Putt %</div>
        </div>
        <div className="log-summary-divider" />
        <div className="log-summary-item">
          <div className="log-summary-value">{pct(stats.threePlus, stats.totalHoles, 1)}</div>
          <div className="log-summary-label">3-Putt %</div>
        </div>
      </div>
    </div>
  );
}

function PuttDistribution({ stats }: { stats: Stats }) {
  const { totalHoles, onePutts, twoPutts, threePlus } = stats;
  if (totalHoles === 0) return null;

  const rows = [
    { label: '1-putt', count: onePutts, color: 'var(--green-light)' },
    { label: '2-putt', count: twoPutts, color: 'var(--green-accent)' },
    { label: '3-putt+', count: threePlus, color: '#c0392b' },
  ];

  return (
    <div className="log-card">
      <div className="log-card-title">Putt Distribution</div>
      <div className="stats-dist-note">{totalHoles} holes logged</div>
      {rows.map(({ label, count, color }) => (
        <div key={label} className="log-bucket-row">
          <div className="log-bucket-label">{label}</div>
          <div className="log-bucket-bar-wrap">
            <div
              className="log-bucket-bar"
              style={{ width: `${Math.round((count / totalHoles) * 100)}%`, background: color }}
            />
          </div>
          <div className="log-bucket-stats">
            {count} · {pct(count, totalHoles, 1)}
          </div>
        </div>
      ))}
    </div>
  );
}

function MakeByDistance({ byDistance }: { byDistance: Stats['byDistance'] }) {
  if (byDistance.length === 0) return null;

  return (
    <div className="log-card">
      <div className="log-card-title">Make % by Distance</div>
      {byDistance.map(({ label, made, total }) => {
        const rate = total > 0 ? made / total : 0;
        return (
          <div key={label} className="log-bucket-row">
            <div className="log-bucket-label">{label}</div>
            <div className="log-bucket-bar-wrap">
              <div
                className="log-bucket-bar"
                style={{ width: `${Math.round(rate * 100)}%` }}
              />
            </div>
            <div className="log-bucket-stats">
              {made}/{total} · {pct(made, total, 0)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MissTendency({ missCounts, missTotal }: { missCounts: Stats['missCounts']; missTotal: number }) {
  if (missTotal === 0) return null;

  return (
    <div className="log-card">
      <div className="log-card-title">Miss Tendency</div>
      <div className="log-outcome-grid">
        {MISS_OUTCOMES.map(({ key, label }) => {
          const n = missCounts[key];
          return (
            <div key={key} className="log-outcome-item">
              <div className="log-outcome-pct">{pct(n, missTotal)}</div>
              <div className="log-outcome-label">{label}</div>
              <div className="log-outcome-count">{n}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ByHole({ holeAverages }: { holeAverages: Stats['holeAverages'] }) {
  if (holeAverages.length === 0) return null;

  const maxAvg = Math.max(...holeAverages.map(h => h.avg));
  // Highlight worst holes (avg >= 2.5) and best (avg < 1.5)
  function holeColor(avg: number): string {
    if (avg >= 2.5) return '#c0392b';
    if (avg <= 1.5) return 'var(--green-light)';
    return 'var(--green-accent)';
  }

  return (
    <div className="log-card">
      <div className="log-card-title">By Hole</div>
      <div className="stats-hole-grid">
        {holeAverages.map(({ hole, avg, rounds }) => (
          <div key={hole} className="stats-hole-item" title={`${rounds} round${rounds !== 1 ? 's' : ''}`}>
            <div className="stats-hole-bar-wrap">
              <div
                className="stats-hole-bar"
                style={{
                  height: `${Math.round((avg / maxAvg) * 100)}%`,
                  background: holeColor(avg),
                }}
              />
            </div>
            <div className="stats-hole-avg" style={{ color: holeColor(avg) }}>
              {avg.toFixed(1)}
            </div>
            <div className="stats-hole-num">{hole}</div>
          </div>
        ))}
      </div>
      <div className="stats-hole-legend">
        <span className="stats-hole-legend-item stats-hole-legend--good">≤ 1.5 great</span>
        <span className="stats-hole-legend-item stats-hole-legend--ok">1.5–2.5 ok</span>
        <span className="stats-hole-legend-item stats-hole-legend--bad">≥ 2.5 costly</span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function LogPage() {
  const { allGameRoundIds, getRound } = usePuttLog();

  const completedRounds = allGameRoundIds
    .map(id => getRound(id))
    .filter(r => r.completedAt !== undefined);

  const stats = computeStats(completedRounds);

  return (
    <>
      <div className="log-header">
        <Link to="/" className="back-link">
          <IconArrowLeft size={20} stroke={2} />
        </Link>
        <h1>Stats</h1>
        <div className="header-spacer" />
      </div>

      <div className="log-body">
        {!stats ? (
          <EmptyState />
        ) : (
          <>
            <SummaryCard stats={stats} />
            <PuttDistribution stats={stats} />
            <MakeByDistance byDistance={stats.byDistance} />
            {stats.detailedCount === 0 && (
              <div className="stats-no-detailed-note">
                Make % and miss tendency require detailed putts (logged via "Log putt · Hole N" during a round).
              </div>
            )}
            <MissTendency missCounts={stats.missCounts} missTotal={stats.missTotal} />
            <ByHole holeAverages={stats.holeAverages} />
          </>
        )}
      </div>
    </>
  );
}
