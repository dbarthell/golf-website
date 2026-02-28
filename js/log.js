// ========================================
// Storage
// ========================================
const CAL_KEY = 'putt-cal';
const LOG_KEY = 'putt-log';
const DEFAULT_CAL = { distanceFactor: 1.0 };

function getCalibration() {
  try {
    const saved = localStorage.getItem(CAL_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { distanceFactor: parsed.distanceFactor ?? 1.0 };
    }
  } catch (e) {}
  return { ...DEFAULT_CAL };
}

function saveCalibration(cal) {
  localStorage.setItem(CAL_KEY, JSON.stringify(cal));
}

function getLog() {
  try {
    const saved = localStorage.getItem(LOG_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
}

function saveLog(log) {
  localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-500)));
}

// ========================================
// Calibration Update
// ========================================
// Only Made/Short/Long inform the backswing calibration.
// Left/Right are logged for reference but don't change any numbers —
// the ZBL aim values are mathematically fixed.
const DIST_RATE = 0.03;

function updateCalibration(cal, entry) {
  let { distanceFactor } = cal;
  const { result } = entry;

  if (result === 'short') {
    distanceFactor += DIST_RATE;
  } else if (result === 'long') {
    distanceFactor -= DIST_RATE;
  } else if (result === 'made') {
    // Gentle pull toward 1.0 — confirms the current calibration is close
    distanceFactor += (1.0 - distanceFactor) * 0.02;
  }

  distanceFactor = Math.max(0.6, Math.min(1.5, distanceFactor));
  distanceFactor = Math.round(distanceFactor * 1000) / 1000;

  return { distanceFactor };
}

// ========================================
// Rendering
// ========================================

// Map a factor value to 0–100% bar position where center=1.0 is at 50%
function factorToPct(val, min, center, max) {
  if (val <= center) return ((val - min) / (center - min)) * 50;
  return 50 + ((val - center) / (max - center)) * 50;
}

function renderCalibration() {
  const cal = getCalibration();
  const { distanceFactor: df } = cal;
  const container = document.getElementById('cal-display');

  const dfPct  = factorToPct(df, 0.6, 1.0, 1.5);
  const center = 50;

  function barStyle(pct, aboveCenter) {
    const left  = Math.min(center, pct);
    const width = Math.abs(pct - center);
    const color = aboveCenter ? 'var(--green-accent)' : 'var(--gray-400)';
    return `left:${left}%;width:${width}%;background:${color};`;
  }

  function dfNote(val) {
    if (val < 0.85) return 'Your stroke is noticeably shorter than the Bryson baseline';
    if (val > 1.15) return 'Your stroke is noticeably longer than the Bryson baseline';
    if (val < 0.95) return 'Your stroke is slightly shorter than the baseline';
    if (val > 1.05) return 'Your stroke is slightly longer than the baseline';
    return 'Your stroke matches the baseline — no adjustment needed';
  }

  container.innerHTML = `
    <div class="cal-factor">
      <div class="cal-factor-header">
        <span class="cal-factor-label">Your Stroke vs. Baseline</span>
        <span class="cal-factor-value">${df.toFixed(2)}×</span>
      </div>
      <div class="cal-bar-wrap">
        <div class="cal-bar" style="${barStyle(dfPct, df >= 1.0)}"></div>
        <div class="cal-bar-center"></div>
      </div>
      <div class="cal-note">${dfNote(df)}</div>
    </div>
  `;
}

function renderStats() {
  const log = getLog();
  const container = document.getElementById('stats-display');

  if (log.length === 0) {
    container.innerHTML = '<div class="history-empty">No putts logged yet</div>';
    return;
  }

  const total = log.length;
  const counts = { made: 0, short: 0, long: 0, left: 0, right: 0 };
  log.forEach(e => { counts[e.result] = (counts[e.result] || 0) + 1; });

  const makePct = Math.round((counts.made / total) * 100);
  const pct = key => total > 0 ? Math.round((counts[key] / total) * 100) : 0;

  const missBarHTML = ['short', 'long', 'left', 'right'].map(m => `
    <div class="miss-bar-row">
      <div class="miss-bar-label">${m.charAt(0).toUpperCase() + m.slice(1)}</div>
      <div class="miss-bar-track"><div class="miss-bar-fill" style="width:${pct(m)}%"></div></div>
      <div class="miss-bar-pct">${pct(m)}%</div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="stats-row">
      <div class="stat-item">
        <div class="stat-value">${total}</div>
        <div class="stat-label">Logged</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${makePct}%</div>
        <div class="stat-label">Make Rate</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${counts.made}</div>
        <div class="stat-label">Made</div>
      </div>
    </div>
    <div class="miss-bars">
      ${missBarHTML}
    </div>
  `;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs  > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

function renderHistory() {
  const log = getLog();
  const container = document.getElementById('history-display');

  if (log.length === 0) {
    container.innerHTML = '<div class="history-empty">Log putts above to track your tendencies</div>';
    return;
  }

  const recent = [...log].reverse().slice(0, 60);
  container.innerHTML = recent.map(entry => {
    const clock = entry.clock ? ` · ${entry.clock} o'clock` : '';
    const slope = entry.slope ? ` · ${entry.slope}%` : '';
    const stimp = entry.stimp ? ` · Stimp ${entry.stimp}` : '';
    const resWord = entry.result.charAt(0).toUpperCase() + entry.result.slice(1);
    const badge = entry.result === 'made' ? '✓' : resWord.charAt(0);
    return `
      <div class="history-item">
        <div class="history-result result-badge-${entry.result}">${badge}</div>
        <div class="history-details">
          <div class="history-main">${entry.distance} ft${clock}</div>
          <div class="history-sub">${resWord}${slope}${stimp}</div>
        </div>
        <div class="history-time">${timeAgo(entry.ts)}</div>
      </div>
    `;
  }).join('');
}

// ========================================
// Entry Form
// ========================================
function initEntryForm() {
  const params    = new URLSearchParams(window.location.search);
  const distInput  = document.getElementById('log-distance');
  const slopeInput = document.getElementById('log-slope');
  const stimpInput = document.getElementById('log-stimp');
  const clockInput = document.getElementById('log-clock');
  const feedback   = document.getElementById('entry-feedback');

  // Pre-fill from URL params
  if (params.get('d'))     distInput.value  = params.get('d');
  if (params.get('slope')) slopeInput.value = params.get('slope');
  if (params.get('stimp')) stimpInput.value = params.get('stimp');
  if (params.get('clock')) clockInput.value = params.get('clock');

  document.querySelectorAll('.result-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const result   = btn.dataset.result;
      const distance = parseFloat(distInput.value);
      const slope    = parseFloat(slopeInput.value) || 0;
      const stimp    = parseFloat(stimpInput.value) || 10;
      const clock    = clockInput.value ? clockInput.value.trim() : null;

      if (!distance || distance <= 0) {
        feedback.textContent = 'Enter a distance first';
        feedback.className = 'entry-feedback';
        setTimeout(() => { feedback.textContent = ''; }, 2000);
        return;
      }

      const entry = { ts: Date.now(), distance, slope, stimp, clock, result };

      const log = getLog();
      log.push(entry);
      saveLog(log);

      const cal    = getCalibration();
      const newCal = updateCalibration(cal, entry);
      saveCalibration(newCal);

      const words = {
        made: 'Logged: Made it!', short: 'Logged: Short miss',
        long: 'Logged: Long miss', left: 'Logged: Left miss', right: 'Logged: Right miss',
      };
      feedback.textContent = words[result] || 'Logged!';
      feedback.className = 'entry-feedback success';
      setTimeout(() => {
        feedback.textContent = '';
        feedback.className = 'entry-feedback';
      }, 2000);

      renderCalibration();
      renderStats();
      renderHistory();
    });
  });
}

// ========================================
// Controls
// ========================================
function initControls() {
  document.getElementById('reset-cal-btn').addEventListener('click', () => {
    if (confirm('Reset calibration to baseline?')) {
      saveCalibration({ ...DEFAULT_CAL });
      renderCalibration();
    }
  });

  document.getElementById('clear-log-btn').addEventListener('click', () => {
    if (confirm('Clear all putt history? This cannot be undone.')) {
      saveLog([]);
      renderStats();
      renderHistory();
    }
  });
}

// ========================================
// Init
// ========================================
function init() {
  initEntryForm();
  initControls();
  renderCalibration();
  renderStats();
  renderHistory();
}

document.addEventListener('DOMContentLoaded', init);
