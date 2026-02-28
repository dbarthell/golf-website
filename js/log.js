// ========================================
// Clock Data (mirrors mobile.js)
// ========================================
const CLOCK_DATA = {
  '12': { theta: 0 },
  '1':  { theta: Math.PI / 6 },
  '2':  { theta: Math.PI / 3 },
  '3':  { theta: Math.PI / 2 },
  '4':  { theta: 2 * Math.PI / 3 },
  '5':  { theta: 5 * Math.PI / 6 },
  '6':  { theta: Math.PI },
  '7':  { theta: 7 * Math.PI / 6 },
  '8':  { theta: 4 * Math.PI / 3 },
  '9':  { theta: 3 * Math.PI / 2 },
  '10': { theta: 5 * Math.PI / 3 },
  '11': { theta: 11 * Math.PI / 6 },
};

function getClockFactors(clockKey) {
  const data = CLOCK_DATA[clockKey];
  if (!data) return null;
  return {
    uphillFactor: -Math.cos(data.theta),
    breakFactor:   Math.sin(data.theta),
  };
}

// ========================================
// Storage
// ========================================
const CAL_KEY = 'putt-cal';
const LOG_KEY = 'putt-log';
const DEFAULT_CAL = { distanceFactor: 1.0, breakFactor: 1.0 };

function getCalibration() {
  try {
    const saved = localStorage.getItem(CAL_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        distanceFactor: parsed.distanceFactor ?? 1.0,
        breakFactor:    parsed.breakFactor    ?? 1.0,
      };
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
const DIST_RATE  = 0.03;
const BREAK_RATE = 0.03;

function updateCalibration(cal, entry) {
  let { distanceFactor, breakFactor } = cal;
  const { result, clock } = entry;

  // --- Distance factor ---
  if (result === 'short') {
    distanceFactor += DIST_RATE;
  } else if (result === 'long') {
    distanceFactor -= DIST_RATE;
  } else if (result === 'made') {
    distanceFactor += (1.0 - distanceFactor) * 0.02;
  }
  distanceFactor = Math.max(0.6, Math.min(1.5, distanceFactor));
  distanceFactor = Math.round(distanceFactor * 1000) / 1000;

  // --- Break factor ---
  // Only update on directional misses or makes when a clock position is set
  if (clock && (result === 'left' || result === 'right' || result === 'made')) {
    const factors = getClockFactors(clock);
    if (factors) {
      const breakSign = factors.breakFactor; // sin(θ): >0 = R→L, <0 = L→R
      const breakMag  = Math.abs(breakSign);

      if (result === 'made') {
        breakFactor += (1.0 - breakFactor) * 0.02;
      } else if (breakMag > 0.25) {
        // High side miss → over-read → decrease breakFactor
        // Low side miss  → under-read → increase breakFactor
        const isHighSide = (breakSign > 0 && result === 'left')  ||
                           (breakSign < 0 && result === 'right');
        const isLowSide  = (breakSign > 0 && result === 'right') ||
                           (breakSign < 0 && result === 'left');
        const delta = BREAK_RATE * breakMag;
        if (isHighSide) breakFactor -= delta;
        if (isLowSide)  breakFactor += delta;
      }
    }
  }
  breakFactor = Math.max(0.5, Math.min(2.0, breakFactor));
  breakFactor = Math.round(breakFactor * 1000) / 1000;

  return { distanceFactor, breakFactor };
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
  const { distanceFactor: df, breakFactor: bf } = cal;
  const container = document.getElementById('cal-display');

  const dfPct  = factorToPct(df, 0.6, 1.0, 1.5);
  const bfPct  = factorToPct(bf, 0.5, 1.0, 2.0);
  const center = 50;

  function barStyle(pct, aboveCenter) {
    const left  = Math.min(center, pct);
    const width = Math.abs(pct - center);
    const color = aboveCenter ? 'var(--green-accent)' : 'var(--gray-400)';
    return `left:${left}%;width:${width}%;background:${color};`;
  }

  function dfNote(val) {
    if (val < 0.85) return 'Swinging noticeably less than baseline';
    if (val > 1.15) return 'Swinging noticeably more than baseline';
    if (val < 0.95) return 'Slightly shorter than baseline';
    if (val > 1.05) return 'Slightly longer than baseline';
    return 'Calibrated to baseline';
  }

  function bfNote(val) {
    if (val < 0.7)  return 'Aiming much less break than baseline';
    if (val > 1.4)  return 'Aiming much more break than baseline';
    if (val < 0.9)  return 'Aiming slightly less break';
    if (val > 1.1)  return 'Aiming slightly more break';
    return 'Calibrated to baseline';
  }

  container.innerHTML = `
    <div class="cal-factor">
      <div class="cal-factor-header">
        <span class="cal-factor-label">Swing Power</span>
        <span class="cal-factor-value">${df.toFixed(2)}×</span>
      </div>
      <div class="cal-bar-wrap">
        <div class="cal-bar" style="${barStyle(dfPct, df >= 1.0)}"></div>
        <div class="cal-bar-center"></div>
      </div>
      <div class="cal-note">${dfNote(df)}</div>
    </div>
    <div class="cal-factor">
      <div class="cal-factor-header">
        <span class="cal-factor-label">Break Reading</span>
        <span class="cal-factor-value">${bf.toFixed(2)}×</span>
      </div>
      <div class="cal-bar-wrap">
        <div class="cal-bar" style="${barStyle(bfPct, bf >= 1.0)}"></div>
        <div class="cal-bar-center"></div>
      </div>
      <div class="cal-note">${bfNote(bf)}</div>
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
