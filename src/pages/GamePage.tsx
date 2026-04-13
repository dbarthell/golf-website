import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconFlag, IconTrash } from '@tabler/icons-react';
import { useGameMode } from '../hooks/useGameMode';
import { type PuttEntry, type PuttRound, type PuttOutcome } from '../hooks/usePuttLog';
import { useUnits } from '../hooks/useUnits';

// ── Constants ─────────────────────────────────────────────────────────────────

const FREE_GAME_ROUND_LIMIT = 2;

const ALL_OUTCOMES: { key: PuttOutcome; label: string }[] = [
  { key: 'made',  label: 'Made'  },
  { key: 'short', label: 'Short' },
  { key: 'long',  label: 'Long'  },
  { key: 'left',  label: 'Left'  },
  { key: 'right', label: 'Right' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(n: number, total: number): string {
  if (total === 0) return '–';
  return Math.round((n / total) * 100) + '%';
}

function countOutcome(entries: PuttEntry[], key: PuttOutcome): number {
  return entries.filter(e => e.outcome === key).length;
}

function formatRoundDate(startedAt?: number): string {
  if (!startedAt) return 'Unknown date';
  const d = new Date(startedAt);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function holesPlayed(entries: PuttEntry[]): number {
  const holes = new Set(entries.map(e => e.hole).filter(Boolean));
  return holes.size;
}

function missLabel(entries: PuttEntry[]): string {
  const misses = entries.filter(e => e.outcome !== 'made');
  if (misses.length === 0) return '';
  const counts: Record<string, number> = {};
  for (const e of misses) {
    counts[e.outcome] = (counts[e.outcome] ?? 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!top) return '';
  return `${top[1]} ${top[0]}`;
}

/**
 * Add one quick putt to a hole, keeping the invariant that only the last
 * quick putt is 'made' and all previous ones are 'short'.
 */
function addOneQuickPutt(
  hole: number,
  holeEntries: PuttEntry[],
  roundId: string,
  stimp: number,
  addPutt: (entry: Omit<PuttEntry, 'id' | 'timestamp'>, roundId: string) => void,
  deletePutt: (roundId: string, entryId: string) => void,
) {
  const quickPutts = holeEntries.filter(isQuickPutt);
  const newCount = quickPutts.length + 1;
  // Remove existing quick putts so we can re-add with correct outcomes
  quickPutts.forEach(e => deletePutt(roundId, e.id));
  for (let i = 0; i < newCount; i++) {
    const outcome: PuttOutcome = i === newCount - 1 ? 'made' : 'short';
    addPutt({ distance: 0, slope: 0, stimp, clock: null, outcome, hole }, roundId);
  }
}

/** Derive a sensible default stimp from a round's entries */
function roundStimp(entries: PuttEntry[]): number {
  if (entries.length === 0) return 10;
  const counts: Record<number, number> = {};
  for (const e of entries) {
    counts[e.stimp] = (counts[e.stimp] ?? 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  return top ? Number(top[0]) : 10;
}

// ── AddPuttForm — mini inline form for editing a hole ────────────────────────

function AddPuttForm({ hole, stimp, onAdd, onCancel }: {
  hole: number;
  stimp: number;
  onAdd: (entry: Omit<PuttEntry, 'id' | 'timestamp'>) => void;
  onCancel: () => void;
}) {
  const [distance, setDistance] = useState('');
  const [outcome, setOutcome] = useState<PuttOutcome | null>(null);

  function handleSubmit() {
    const dist = parseFloat(distance);
    if (!dist || dist <= 0 || !outcome) return;
    onAdd({ distance: dist, slope: 0, stimp, clock: null, outcome, hole });
  }

  return (
    <div className="game-add-putt-form">
      <div className="game-add-putt-row">
        <input
          className="game-add-putt-dist"
          type="number"
          inputMode="decimal"
          placeholder="Distance (ft)"
          value={distance}
          onChange={e => setDistance(e.target.value)}
        />
      </div>
      <div className="outcome-btns-row" style={{ marginTop: '0.5rem' }}>
        {ALL_OUTCOMES.map(({ key, label }) => (
          <button
            key={key}
            className={`outcome-btn ${
              outcome === key
                ? key === 'made' ? 'outcome-btn-made' : 'outcome-btn-miss-selected'
                : 'outcome-btn-miss'
            }`}
            onClick={() => setOutcome(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="game-post-log-btns" style={{ marginTop: '0.5rem' }}>
        <button className="game-post-log-btn game-post-log-btn--another" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="game-post-log-btn game-post-log-btn--next"
          onClick={handleSubmit}
          disabled={!distance || !outcome}
          style={{ opacity: !distance || !outcome ? 0.4 : 1 }}
        >
          Add putt
        </button>
      </div>
    </div>
  );
}

// ── HoleStatCard ──────────────────────────────────────────────────────────────

/** Quick putts are those with distance === 0 (logged via the count stepper). */
function isQuickPutt(e: PuttEntry) { return e.distance === 0; }

function HoleStatCard({ hole, entries, stimp: stimpDefault, onDelete, onAdd, onClose, onAfterQuickSet }: {
  hole: number;
  entries: PuttEntry[];
  stimp: number;
  onDelete: (entryId: string) => void;
  onAdd: (entry: Omit<PuttEntry, 'id' | 'timestamp'>) => void;
  onClose: () => void;
  /** Called after quick count is set — use to auto-advance hole in active game. */
  onAfterQuickSet?: () => void;
}) {
  const { fmtDist } = useUnits();
  const [adding, setAdding] = useState(false);

  const quickPutts = entries.filter(isQuickPutt);
  const quickCount = quickPutts.length;
  const detailedEntries = entries.filter(e => !isQuickPutt(e));
  const total = entries.length;
  const made = countOutcome(entries, 'made');

  /** Replace quick putts with N new ones. Last = 'made', rest = 'short'. */
  function setQuickCount(n: number) {
    // Remove all existing quick putts first
    quickPutts.forEach(e => onDelete(e.id));
    // Add N putts with correct outcomes
    for (let i = 0; i < n; i++) {
      const outcome: PuttOutcome = i === n - 1 ? 'made' : 'short';
      onAdd({ distance: 0, slope: 0, stimp: stimpDefault, clock: null, outcome, hole });
    }
    if (n > 0) onAfterQuickSet?.();
  }

  return (
    <div className="game-hole-card-overlay" onClick={onClose}>
      <div className="game-hole-card" onClick={e => e.stopPropagation()}>
        <div className="game-hole-card-header">
          <span className="game-hole-card-title">Hole {hole}</span>
          <button className="game-hole-card-close" onClick={onClose}>✕</button>
        </div>

        {/* ── Quick count section ── */}
        <div className="game-quick-section">
          <div className="game-quick-label">Quick count</div>
          <div className="game-quick-btns">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                className={`game-quick-btn${quickCount === n && detailedEntries.length === 0 ? ' game-quick-btn--active' : ''}`}
                onClick={() => setQuickCount(n)}
              >
                {n}
              </button>
            ))}
            <button
              className="game-quick-btn game-quick-btn--clear"
              onClick={() => setQuickCount(0)}
              disabled={quickCount === 0}
              title="Clear quick putts"
            >
              ✕
            </button>
          </div>
          {quickCount > 0 && (
            <div className="game-quick-count-note">{quickCount} quick putt{quickCount !== 1 ? 's' : ''} · last is made</div>
          )}
        </div>

        {/* ── Summary (shown when there are putts) ── */}
        {total > 0 && (
          <div className="log-summary-row" style={{ margin: '0.5rem 0 0.75rem' }}>
            <div className="log-summary-item">
              <div className="log-summary-value">{total}</div>
              <div className="log-summary-label">Total putts</div>
            </div>
            <div className="log-summary-divider" />
            <div className="log-summary-item">
              <div className="log-summary-value">{pct(made, total)}</div>
              <div className="log-summary-label">Make %</div>
            </div>
          </div>
        )}

        {/* ── Detailed putt list ── */}
        {detailedEntries.length > 0 && (
          <div style={{ marginTop: '0.25rem' }}>
            <div className="game-quick-label" style={{ marginBottom: '0.3rem' }}>Detailed putts</div>
            {[...detailedEntries].reverse().map(e => (
              <div key={e.id} className="log-entry-row">
                <div className="log-entry-info">
                  <span className="log-entry-dist">
                    {fmtDist(e.distance)}
                    {e.slope > 0 && ` · ${e.slope}%`}
                    {e.clock && ` · ${e.clock}`}
                  </span>
                  <span
                    className="log-entry-outcome"
                    style={{ color: e.outcome === 'made' ? 'var(--green-light)' : 'var(--gray-600)' }}
                  >
                    {e.outcome.charAt(0).toUpperCase() + e.outcome.slice(1)}
                  </span>
                </div>
                <button className="log-entry-delete" onClick={() => onDelete(e.id)} aria-label="Delete putt">
                  <IconTrash size={15} stroke={1.75} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Detailed add form ── */}
        {adding ? (
          <AddPuttForm
            hole={hole}
            stimp={stimpDefault}
            onAdd={entry => { onAdd(entry); setAdding(false); }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button className="game-add-putt-btn" onClick={() => setAdding(true)}>
            + Add detailed putt
          </button>
        )}
      </div>
    </div>
  );
}

// ── ScorecardRow ──────────────────────────────────────────────────────────────

function ScorecardRow({ hole, entries, isCurrent, isDimmed, onClick, onQuickAdd }: {
  hole: number;
  entries: PuttEntry[];
  isCurrent: boolean;
  isDimmed: boolean;
  onClick: () => void;
  onQuickAdd?: () => void;
}) {
  const total = entries.length;
  const miss = missLabel(entries.filter(e => !isQuickPutt(e)));

  return (
    <div className={`game-scorecard-row-wrap${isCurrent ? ' game-scorecard-row--current' : ''}${isDimmed ? ' game-scorecard-row--dimmed' : ''}`}>
      <button className="game-scorecard-row-main" onClick={onClick}>
        <div className="game-scorecard-hole">
          <span className="game-scorecard-hole-num">{hole}</span>
          {isCurrent && <span className="game-scorecard-current-dot" />}
        </div>
        <div className="game-scorecard-putts">
          {total > 0 ? total : <span className="game-scorecard-dash">—</span>}
        </div>
        <div className="game-scorecard-miss">
          {miss || <span className="game-scorecard-dash">—</span>}
        </div>
      </button>
      {onQuickAdd && (
        <button
          className="game-scorecard-tally-btn"
          onClick={e => { e.stopPropagation(); onQuickAdd(); }}
          aria-label={`Add putt to hole ${hole}`}
        >
          +
        </button>
      )}
    </div>
  );
}

// ── EndRoundSheet ─────────────────────────────────────────────────────────────

function EndRoundSheet({ round, onConfirm, onCancel }: {
  round: PuttRound;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { entries } = round;
  const total = entries.length;
  const made = countOutcome(entries, 'made');
  const holes = holesPlayed(entries);

  return (
    <div className="walkoff-backdrop" onClick={onCancel}>
      <div className="walkoff-sheet" onClick={e => e.stopPropagation()}>
        <div className="walkoff-sheet-handle" />
        <div className="walkoff-sheet-icon">⛳</div>
        <div className="walkoff-sheet-title">End Round?</div>
        <div className="walkoff-sheet-body">
          {holes > 0 ? (
            <>
              <strong>{holes} hole{holes !== 1 ? 's' : ''}</strong> played ·{' '}
              <strong>{total} putt{total !== 1 ? 's' : ''}</strong> ·{' '}
              <strong>{pct(made, total)}</strong> make rate
            </>
          ) : (
            'No putts logged yet. End this round anyway?'
          )}
        </div>
        <button className="walkoff-sheet-btn" onClick={onConfirm}>
          End Round
        </button>
        <button className="game-end-cancel-btn" onClick={onCancel} style={{ marginTop: '0.75rem' }}>
          Keep Playing
        </button>
      </div>
    </div>
  );
}

// ── DeleteRoundSheet ──────────────────────────────────────────────────────────

function DeleteRoundSheet({ onConfirm, onCancel }: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="walkoff-backdrop" onClick={onCancel}>
      <div className="walkoff-sheet" onClick={e => e.stopPropagation()}>
        <div className="walkoff-sheet-handle" />
        <div className="walkoff-sheet-icon">🗑️</div>
        <div className="walkoff-sheet-title">Delete round?</div>
        <div className="walkoff-sheet-body">This can't be undone.</div>
        <button
          className="walkoff-sheet-btn"
          onClick={onConfirm}
          style={{ background: '#c0392b' }}
        >
          Delete
        </button>
        <button className="game-end-cancel-btn" onClick={onCancel} style={{ marginTop: '0.75rem' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── CompletedRoundCard ────────────────────────────────────────────────────────

function CompletedRoundCard({ round, locked, onDelete, onDeletePutt, onAddPutt }: {
  round: PuttRound;
  locked: boolean;
  onDelete: () => void;
  onDeletePutt: (entryId: string) => void;
  onAddPutt: (entry: Omit<PuttEntry, 'id' | 'timestamp'>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detailHole, setDetailHole] = useState<number | null>(null);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const { entries } = round;
  const total = entries.length;
  const made = countOutcome(entries, 'made');
  const holes = holesPlayed(entries);
  const stimp = roundStimp(entries);

  if (locked) {
    return (
      <div className="log-upsell-card">
        <div className="log-upsell-icon">🔒</div>
        <div className="log-upsell-content">
          <div className="log-upsell-title">{formatRoundDate(round.startedAt)}</div>
          <div className="log-upsell-sub">Unlock with Premium to view older rounds.</div>
        </div>
        <button className="log-upsell-btn">Upgrade</button>
      </div>
    );
  }

  return (
    <>
      <div className="game-completed-card">
        <button className="game-completed-header" onClick={() => setExpanded(e => !e)}>
          <div className="game-completed-meta">
            <span className="game-completed-date">{formatRoundDate(round.startedAt)}</span>
            <span className="game-completed-summary">
              {holes} hole{holes !== 1 ? 's' : ''} · {total} putt{total !== 1 ? 's' : ''} · {pct(made, total)} made
            </span>
          </div>
          <div className="game-completed-actions">
            <button
              className="game-completed-delete-btn"
              onClick={e => { e.stopPropagation(); setShowDeleteSheet(true); }}
              aria-label="Delete round"
            >
              <IconTrash size={15} stroke={1.75} />
            </button>
            <span className="game-completed-chevron">{expanded ? '▲' : '▼'}</span>
          </div>
        </button>

        {expanded && (
          <div className="game-completed-body">
            <div className="game-scorecard-header game-scorecard-header--with-tally">
              <span>Hole</span>
              <span>Putts</span>
              <span>Miss</span>
              <span></span>
            </div>
            {Array.from({ length: Math.max(holes, 1) }, (_, i) => i + 1).map(hole => {
              const holeEntries = entries.filter(e => e.hole === hole);
              return (
                <ScorecardRow
                  key={hole}
                  hole={hole}
                  entries={holeEntries}
                  isCurrent={false}
                  isDimmed={false}
                  onClick={() => setDetailHole(detailHole === hole ? null : hole)}
                  onQuickAdd={() => {
                    const holeEntries = entries.filter(e => e.hole === hole);
                    const quickPutts = holeEntries.filter(isQuickPutt);
                    const newCount = quickPutts.length + 1;
                    quickPutts.forEach(e => onDeletePutt(e.id));
                    for (let i = 0; i < newCount; i++) {
                      const outcome: PuttOutcome = i === newCount - 1 ? 'made' : 'short';
                      onAddPutt({ distance: 0, slope: 0, stimp, clock: null, outcome, hole });
                    }
                  }}
                />
              );
            })}

            <div className="log-card" style={{ marginTop: '0.75rem' }}>
              <div className="log-card-title">Miss Tendency</div>
              <div className="log-outcome-grid">
                {ALL_OUTCOMES.map(({ key, label }) => {
                  const n = countOutcome(entries, key);
                  return (
                    <div key={key} className={`log-outcome-item${key === 'made' ? ' log-outcome-made' : ''}`}>
                      <div className="log-outcome-pct">{pct(n, total)}</div>
                      <div className="log-outcome-label">{label}</div>
                      <div className="log-outcome-count">{n}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {detailHole !== null && (
        <HoleStatCard
          hole={detailHole}
          entries={entries.filter(e => e.hole === detailHole)}
          stimp={stimp}
          onDelete={onDeletePutt}
          onAdd={onAddPutt}
          onClose={() => setDetailHole(null)}
        />
      )}

      {showDeleteSheet && (
        <DeleteRoundSheet
          onConfirm={() => { setShowDeleteSheet(false); onDelete(); }}
          onCancel={() => setShowDeleteSheet(false)}
        />
      )}
    </>
  );
}

// ── Page component ────────────────────────────────────────────────────────────

export function GamePage() {
  const navigate = useNavigate();
  const {
    activeGameRoundId,
    activeGameRound,
    currentHole,
    goToHole,
    advanceHole,
    startGame,
    endGame,
    deleteGameRound,
    addPutt,
    deletePutt,
    allGameRoundIds,
    getRound,
  } = useGameMode();

  const [showEndSheet, setShowEndSheet] = useState(false);
  const [detailHole, setDetailHole] = useState<number | null>(null);

  function handleStartGame() {
    startGame();
  }

  function handleEndGame() {
    if (!activeGameRoundId) return;
    endGame(activeGameRoundId);
    setShowEndSheet(false);
    navigate('/game');
  }

  // ── No active game ──────────────────────────────────────────────────────────
  if (!activeGameRound) {
    const completedIds = allGameRoundIds.filter(id => {
      const r = getRound(id);
      return r.completedAt !== undefined;
    });
    const freeIds = completedIds.slice(0, FREE_GAME_ROUND_LIMIT);
    const lockedIds = completedIds.slice(FREE_GAME_ROUND_LIMIT);

    return (
      <>
        <div className="log-header">
          <Link to="/" className="back-link">
            <IconArrowLeft size={20} stroke={2} />
          </Link>
          <h1>Live Round</h1>
          <div className="header-spacer" />
        </div>

        <div className="game-start-section">
          <div className="game-start-icon">⛳</div>
          <div className="game-start-title">Ready to Play?</div>
          <div className="game-start-sub">
            Track every putt hole-by-hole through your round. Log as you go, then see your full scorecard.
          </div>
          <button className="game-start-btn" onClick={handleStartGame}>
            <IconFlag size={18} stroke={2} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
            Start Round
          </button>
        </div>

        {completedIds.length > 0 && (
          <div className="log-body">
            <div className="log-section-title">Completed Rounds</div>
            {freeIds.map(id => (
              <CompletedRoundCard
                key={id}
                round={getRound(id)}
                locked={false}
                onDelete={() => deleteGameRound(id)}
                onDeletePutt={entryId => deletePutt(id, entryId)}
                onAddPutt={entry => addPutt(entry, id)}
              />
            ))}
            {lockedIds.length > 0 && (
              <div className="log-upsell-card">
                <div className="log-upsell-icon">🔒</div>
                <div className="log-upsell-content">
                  <div className="log-upsell-title">{lockedIds.length} older round{lockedIds.length !== 1 ? 's' : ''}</div>
                  <div className="log-upsell-sub">Upgrade to unlock full round history.</div>
                </div>
                <button className="log-upsell-btn">Upgrade</button>
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  // ── Active game: scorecard view ─────────────────────────────────────────────
  const { entries } = activeGameRound;
  const totalPutts = entries.length;
  const madeTotal = countOutcome(entries, 'made');
  const stimp = roundStimp(entries);

  return (
    <>
      <div className="log-header">
        <Link to="/" className="back-link">
          <IconArrowLeft size={20} stroke={2} />
        </Link>
        <h1>⛳ Hole {currentHole} of 18</h1>
        <div className="header-spacer" />
      </div>

      <div className="game-round-strip">
        <div className="game-round-strip-item">
          <span className="game-round-strip-val">{totalPutts}</span>
          <span className="game-round-strip-label">Putts</span>
        </div>
        <div className="game-round-strip-divider" />
        <div className="game-round-strip-item">
          <span className="game-round-strip-val">{pct(madeTotal, totalPutts)}</span>
          <span className="game-round-strip-label">Made</span>
        </div>
        <div className="game-round-strip-divider" />
        <div className="game-round-strip-item">
          <span className="game-round-strip-val">{holesPlayed(entries)}</span>
          <span className="game-round-strip-label">Holes</span>
        </div>
        <button className="game-end-btn" onClick={() => setShowEndSheet(true)}>
          End Round
        </button>
      </div>

      <div className="log-body">
        <div className="game-scorecard-header game-scorecard-header--with-tally">
          <span>Hole</span>
          <span>Putts</span>
          <span>Miss</span>
          <span></span>
        </div>
        {Array.from({ length: 18 }, (_, i) => i + 1).map(hole => {
          const holeEntries = entries.filter(e => e.hole === hole);
          return (
            <ScorecardRow
              key={hole}
              hole={hole}
              entries={holeEntries}
              isCurrent={hole === currentHole}
              isDimmed={hole > currentHole}
              onClick={() => {
                goToHole(hole);
                setDetailHole(hole);
              }}
              onQuickAdd={() => {
                goToHole(hole);
                addOneQuickPutt(hole, holeEntries, activeGameRoundId!, stimp, addPutt, deletePutt);
              }}
            />
          );
        })}
      </div>

      {detailHole !== null && activeGameRoundId && (
        <HoleStatCard
          hole={detailHole}
          entries={entries.filter(e => e.hole === detailHole)}
          stimp={stimp}
          onDelete={entryId => deletePutt(activeGameRoundId, entryId)}
          onAdd={entry => addPutt(entry, activeGameRoundId)}
          onClose={() => setDetailHole(null)}
          onAfterQuickSet={() => { advanceHole(); setDetailHole(null); }}
        />
      )}

      {showEndSheet && activeGameRound && (
        <EndRoundSheet
          round={activeGameRound}
          onConfirm={handleEndGame}
          onCancel={() => setShowEndSheet(false)}
        />
      )}
    </>
  );
}
