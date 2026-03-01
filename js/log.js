// ========================================
// Backswing Data Helpers (mirrors mobile.js)
// ========================================

let puttingData = null;

function lerp(a, b, t) { return a + (b - a) * t; }

function getDistanceForStimp(row, stimp) {
  const d9  = parseFloat(row.stimp9.replace(' ft', ''));
  const d10 = parseFloat(row.stimp10.replace(' ft', ''));
  const d11 = parseFloat(row.stimp11.replace(' ft', ''));
  if (stimp <= 9)  return d9;
  if (stimp <= 10) return lerp(d9, d10, stimp - 9);
  if (stimp <= 11) return lerp(d10, d11, stimp - 10);
  return d11 + (d11 - d10) * (stimp - 11);
}

// Returns baseline backswing inches (number) for a given distance + stimp.
// Returns null if out of range.
function findBackswingInches(distanceFeet, stimp) {
  const rows = puttingData.lagPuttingTable.rows;
  let lower = null, upper = null;

  for (let i = 0; i < rows.length; i++) {
    const feet = getDistanceForStimp(rows[i], stimp);
    if (feet < distanceFeet) {
      lower = rows[i];
    } else if (feet > distanceFeet) {
      upper = rows[i];
      break;
    } else {
      return parseFloat(rows[i].inches.replace('"', ''));
    }
  }

  if (!lower && !upper) return null;
  if (!lower) return parseFloat(upper.inches.replace('"', ''));
  if (!upper) return parseFloat(lower.inches.replace('"', ''));

  const lf = getDistanceForStimp(lower, stimp);
  const uf = getDistanceForStimp(upper, stimp);
  const t  = (distanceFeet - lf) / (uf - lf);
  return lerp(
    parseFloat(lower.inches.replace('"', '')),
    parseFloat(upper.inches.replace('"', '')),
    t
  );
}

// ========================================
// Storage
// ========================================
const CAL_KEY = 'putt-cal';
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

// ========================================
// State
// ========================================
let testStimp = 10;
let testDist  = 10;
let myInches  = null; // null until data loads

// ========================================
// Status Card
// ========================================
function factorToPct(val, min, center, max) {
  if (val <= center) return ((val - min) / (center - min)) * 50;
  return 50 + ((val - center) / (max - center)) * 50;
}

function factorNote(df) {
  if (df < 0.85) return 'Your stroke is noticeably shorter than the Bryson baseline.';
  if (df > 1.15) return 'Your stroke is noticeably longer than the Bryson baseline.';
  if (df < 0.97) return 'Your stroke is slightly shorter than the baseline.';
  if (df > 1.03) return 'Your stroke is slightly longer than the baseline.';
  return 'Your stroke matches the baseline — no adjustment applied.';
}

function renderStatus() {
  const { distanceFactor: df } = getCalibration();
  const card = document.getElementById('status-card');
  const pct  = factorToPct(df, 0.6, 1.0, 1.5);
  const c    = 50;
  const barLeft  = Math.min(c, pct);
  const barWidth = Math.abs(pct - c);
  const barColor = df >= 1.0 ? 'var(--green-accent)' : 'var(--gray-400)';

  const pctStr = df === 1.0
    ? 'No adjustment'
    : `${df > 1.0 ? '+' : ''}${Math.round((df - 1.0) * 100)}% vs baseline`;

  card.innerHTML = `
    <div class="status-row">
      <span class="status-label">Your Stroke</span>
      <span class="status-value">${df.toFixed(2)}×</span>
    </div>
    <div class="status-bar-wrap">
      <div class="status-bar" style="left:${barLeft}%;width:${barWidth}%;background:${barColor};"></div>
      <div class="status-bar-center"></div>
    </div>
    <div class="status-note">${pctStr} — ${factorNote(df)}</div>
  `;
}

// ========================================
// Tool
// ========================================
function fmt(inches) {
  return inches.toFixed(1) + '"';
}

function updateTool() {
  const baseline = findBackswingInches(testDist, testStimp);
  const baselineEl = document.getElementById('baseline-value');
  const myEl       = document.getElementById('my-value');

  if (baseline === null) {
    baselineEl.textContent = '—';
    myEl.textContent = '—';
    myInches = null;
    return;
  }

  // On first load or distance/stimp change, set myInches from saved calibration
  if (myInches === null) {
    const { distanceFactor } = getCalibration();
    myInches = Math.round(baseline * distanceFactor * 4) / 4; // round to 0.25"
  }

  // Clamp myInches to a reasonable range around baseline
  myInches = Math.max(0.5, Math.min(baseline * 2, myInches));
  myInches = Math.round(myInches * 4) / 4; // keep on 0.25" grid

  baselineEl.textContent = fmt(baseline);
  myEl.textContent = fmt(myInches);
}

function resetMyInches() {
  myInches = null; // force recalc from saved cal next updateTool()
  updateTool();
}

// ========================================
// Preview Table
// ========================================
const PREVIEW_DISTS = [5, 10, 15, 20, 25, 30, 40, 50];

function renderPreview() {
  const { distanceFactor: df } = getCalibration();
  const container = document.getElementById('preview-display');
  const isSame = Math.abs(df - 1.0) < 0.01;

  const headerHTML = `
    <div class="preview-header">
      <div class="preview-header-dist">Dist</div>
      <div class="preview-header-col">Baseline</div>
      <div class="preview-header-arrow">·</div>
      <div class="preview-header-col">Your Swing</div>
    </div>
  `;

  const rowsHTML = PREVIEW_DISTS.map(d => {
    const baseline = findBackswingInches(d, testStimp);
    if (baseline === null) return '';
    const mine = baseline * df;
    const isTestDist = d === testDist;
    const sameClass = isSame ? ' same' : '';
    return `
      <div class="preview-row${isTestDist ? ' preview-highlight' : ''}">
        <div class="preview-dist">${d} ft</div>
        <div class="preview-baseline">${fmt(baseline)}</div>
        <div class="preview-arrow">→</div>
        <div class="preview-mine${sameClass}">${isSame ? fmt(baseline) : fmt(mine)}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = headerHTML + rowsHTML;
}

// ========================================
// Init
// ========================================
function initTool(fromOnboarding = false) {
  // Stimp toggle
  document.getElementById('cal-stimp-toggle').addEventListener('click', e => {
    const btn = e.target.closest('.stimp-btn');
    if (!btn) return;
    testStimp = parseFloat(btn.dataset.stimp);
    document.querySelectorAll('#cal-stimp-toggle .stimp-btn').forEach(b => {
      b.classList.toggle('stimp-btn-active', b === btn);
    });
    myInches = null; // recalc from saved cal at new stimp
    updateTool();
    renderPreview();
  });

  // Distance chips
  document.getElementById('dist-chips').addEventListener('click', e => {
    const btn = e.target.closest('.dist-chip');
    if (!btn) return;
    testDist = parseFloat(btn.dataset.dist);
    document.querySelectorAll('.dist-chip').forEach(b => {
      b.classList.toggle('dist-chip-active', b === btn);
    });
    myInches = null;
    updateTool();
    renderPreview();
  });

  // +/- buttons (0.25" steps)
  document.getElementById('cal-minus').addEventListener('click', () => {
    if (myInches === null) return;
    myInches = Math.max(0.5, myInches - 0.25);
    updateTool();
  });
  document.getElementById('cal-plus').addEventListener('click', () => {
    if (myInches === null) return;
    myInches = myInches + 0.25;
    updateTool();
  });

  // Save
  document.getElementById('save-cal-btn').addEventListener('click', () => {
    const baseline = findBackswingInches(testDist, testStimp);
    if (baseline === null || myInches === null) return;
    const distanceFactor = Math.round((myInches / baseline) * 1000) / 1000;
    saveCalibration({ distanceFactor });

    if (fromOnboarding) {
      window.location.href = 'index.html';
      return;
    }

    renderStatus();
    renderPreview();
    const btn = document.getElementById('save-cal-btn');
    btn.textContent = 'Saved!';
    setTimeout(() => { btn.textContent = 'Save Calibration'; }, 1500);
  });

  // Reset
  document.getElementById('reset-cal-btn').addEventListener('click', () => {
    if (confirm('Reset to baseline? All calibration will be cleared.')) {
      saveCalibration({ ...DEFAULT_CAL });
      myInches = null;
      updateTool();
      renderStatus();
      renderPreview();
    }
  });

  updateTool();
}

async function init() {
  const fromOnboarding = new URLSearchParams(window.location.search).get('from') === 'onboarding';
  if (fromOnboarding) {
    const backLink = document.querySelector('.back-link');
    if (backLink) backLink.style.visibility = 'hidden';
  }

  try {
    const resp = await fetch('data/putting.json');
    if (!resp.ok) throw new Error('Failed to load data');
    puttingData = await resp.json();

    renderStatus();
    initTool(fromOnboarding);
    renderPreview();
  } catch (e) {
    document.getElementById('tool-card').innerHTML =
      `<p style="padding:var(--space-lg);color:#c00;text-align:center;">
        Failed to load putting data.<br><small>${e.message}</small>
      </p>`;
  }
}

document.addEventListener('DOMContentLoaded', init);
