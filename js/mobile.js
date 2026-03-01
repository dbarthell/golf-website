// ========================================
// Data Loading
// ========================================

let puttingData = null;
let currentStimp = 10;
let currentClock = null;

// Calibration (loaded from localStorage, set via log.html)
// Only distanceFactor is personalised — ZBL aim is mathematically fixed.
let puttCal = { distanceFactor: 1.0 };

function loadCalibration() {
  try {
    const saved = localStorage.getItem('putt-cal');
    if (saved) {
      const parsed = JSON.parse(saved);
      puttCal = { distanceFactor: parsed.distanceFactor ?? 1.0 };
    }
  } catch (e) {}
}

function applyCalBS(rawInches) {
  if (!rawInches) return '—';
  const num = parseFloat(rawInches.replace('"', ''));
  return (num * puttCal.distanceFactor).toFixed(1) + '"';
}

// "1 foot past the cup" backswing: look up dist+1, apply cal, round to integer
function backswingDisplay(distFeet, stimp) {
  const data = findBackswingData(distFeet + 1, stimp);
  if (!data) return '—';
  const raw = parseFloat(data.inches.replace('"', ''));
  return Math.round(raw * puttCal.distanceFactor) + '"';
}

function updateLogLink() {
  const logLink = document.getElementById('log-link');
  if (!logLink) return;
  const distance = document.getElementById('distance-input')?.value;
  const slope    = document.getElementById('slope-input')?.value;
  const p = new URLSearchParams();
  if (distance) p.set('d', distance);
  if (slope)    p.set('slope', slope);
  p.set('stimp', currentStimp);
  if (currentClock) p.set('clock', currentClock);
  logLink.href = `log.html?${p.toString()}`;
}

// Clock positions: θ measured clockwise from 12 o'clock (30° per hour)
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

// uphillFactor > 0 = uphill putt, < 0 = downhill putt
// breakFactor > 0 = R→L break (aim right), < 0 = L→R break (aim left)
function getClockFactors(clockKey) {
  const data = CLOCK_DATA[clockKey];
  if (!data) return null;
  return {
    uphillFactor: -Math.cos(data.theta),
    breakFactor:   Math.sin(data.theta),
  };
}

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

// ========================================
// Utilities
// ========================================

function parseCell(cellValue) {
  if (!cellValue) return { base: 0, plusVariance: 0, minusVariance: 0 };
  
  const str = String(cellValue).trim();
  
  // Match patterns like "9 −1.5" or "4 +1.5/−1.5"
  const varianceMatch = str.match(/^([\d.]+)\s*([+−][\d.]+)?(?:\/(−[\d.]+))?$/);
  
  if (varianceMatch) {
    const base = parseFloat(varianceMatch[1]);
    let plusVariance = 0;
    let minusVariance = 0;
    
    if (varianceMatch[2]) {
      const variance = parseFloat(varianceMatch[2].replace('−', '-'));
      if (variance > 0) {
        plusVariance = variance;
      } else {
        minusVariance = Math.abs(variance);
      }
    }
    
    if (varianceMatch[3]) {
      minusVariance = Math.abs(parseFloat(varianceMatch[3].replace('−', '-')));
    }
    
    return { base, plusVariance, minusVariance };
  }
  
  // Plain number
  const num = parseFloat(str);
  return isNaN(num) ? { base: 0, plusVariance: 0, minusVariance: 0 } : { base: num, plusVariance: 0, minusVariance: 0 };
}

function formatVariance(plusVariance, minusVariance) {
  if (plusVariance === 0 && minusVariance === 0) return '';
  if (plusVariance === minusVariance) return `±${plusVariance}`;
  if (plusVariance > 0 && minusVariance > 0) return `+${plusVariance}/−${minusVariance}`;
  if (plusVariance > 0) return `+${plusVariance}`;
  if (minusVariance > 0) return `−${minusVariance}`;
  return '';
}

// Linear interpolation
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function findPuttingData(distanceFeet) {
  const rows = puttingData.brysonTable.rows;
  
  // Find exact match
  const exactMatch = rows.find(r => parseFloat(r.feet) === distanceFeet);
  if (exactMatch) return exactMatch;
  
  // Find surrounding rows for interpolation
  let lower = null;
  let upper = null;
  
  for (let i = 0; i < rows.length; i++) {
    const feet = parseFloat(rows[i].feet);
    if (feet < distanceFeet) {
      lower = rows[i];
    } else if (feet > distanceFeet) {
      upper = rows[i];
      break;
    }
  }
  
  // If out of range, return closest
  if (!lower) return upper;
  if (!upper) return lower;
  
  // Interpolate
  const lowerFeet = parseFloat(lower.feet);
  const upperFeet = parseFloat(upper.feet);
  const t = (distanceFeet - lowerFeet) / (upperFeet - lowerFeet);
  
  const lowerSteps = parseFloat(lower.steps);
  const upperSteps = parseFloat(upper.steps);
  const interpolatedSteps = lerp(lowerSteps, upperSteps, t);
  
  // Interpolate slope values
  const slopeKeys = ['pct1', 'pct2', 'pct3', 'pct4', 'pct5', 'pct6'];
  const interpolatedRow = {
    steps: interpolatedSteps.toFixed(1),
    feet: distanceFeet.toString(),
    original: false
  };
  
  slopeKeys.forEach(key => {
    const lowerParsed = parseCell(lower[key]);
    const upperParsed = parseCell(upper[key]);
    
    const interpolatedBase = lerp(lowerParsed.base, upperParsed.base, t);
    const interpolatedPlus = lerp(lowerParsed.plusVariance, upperParsed.plusVariance, t);
    const interpolatedMinus = lerp(lowerParsed.minusVariance, upperParsed.minusVariance, t);
    
    let valueStr = interpolatedBase.toFixed(1);
    const variance = formatVariance(
      Math.round(interpolatedPlus * 2) / 2,
      Math.round(interpolatedMinus * 2) / 2
    );
    if (variance) valueStr += ` ${variance}`;
    
    interpolatedRow[key] = valueStr;
  });
  
  return interpolatedRow;
}

// ========================================
// Backswing Calculation
// ========================================

function getDistanceForStimp(row, stimp) {
  const d9  = parseFloat(row.stimp9.replace(' ft', ''));
  const d10 = parseFloat(row.stimp10.replace(' ft', ''));
  const d11 = parseFloat(row.stimp11.replace(' ft', ''));
  if (stimp <= 9)  return d9;
  if (stimp <= 10) return lerp(d9, d10, stimp - 9);
  if (stimp <= 11) return lerp(d10, d11, stimp - 10);
  // Extrapolate beyond stimp 11 using the 10→11 rate
  return d11 + (d11 - d10) * (stimp - 11);
}

function findBackswingData(distanceFeet, stimp) {
  const rows = puttingData.lagPuttingTable.rows;

  let lower = null;
  let upper = null;

  for (let i = 0; i < rows.length; i++) {
    const feet = getDistanceForStimp(rows[i], stimp);
    if (feet < distanceFeet) {
      lower = rows[i];
    } else if (feet > distanceFeet) {
      upper = rows[i];
      break;
    } else {
      return rows[i]; // exact match
    }
  }

  if (!lower) return upper;
  if (!upper) return lower;

  const lowerFeet = getDistanceForStimp(lower, stimp);
  const upperFeet = getDistanceForStimp(upper, stimp);
  const t = (distanceFeet - lowerFeet) / (upperFeet - lowerFeet);

  const lowerInches = parseFloat(lower.inches.replace('"', ''));
  const upperInches = parseFloat(upper.inches.replace('"', ''));
  const interpolatedInches = lerp(lowerInches, upperInches, t);

  return {
    inches: interpolatedInches.toFixed(1) + '"',
    landmark: '(interpolated)',
    original: false
  };
}

function calculateZBLVector(distanceFeet, slopePct, stimp) {
  const slope = parseFloat(slopePct) || 0;

  // Flat green — aim straight at hole
  if (slope <= 0) {
    return { aimInches: '0.0', plusInches: null, minusInches: null };
  }

  const brysonData = findPuttingData(distanceFeet);
  if (!brysonData) return null;

  // Clamp to data range (1–6%)
  const clampedSlope = Math.min(6, slope);
  const lowerSlope = Math.max(1, Math.floor(clampedSlope));
  const upperSlope = Math.min(6, Math.ceil(clampedSlope));
  const t = clampedSlope - Math.floor(clampedSlope);

  let parsed;
  if (lowerSlope === upperSlope || t === 0) {
    // Exact whole-number slope
    parsed = parseCell(brysonData[`pct${lowerSlope}`]);
  } else if (Math.floor(clampedSlope) === 0) {
    // Interpolate between flat (0) and 1%
    const upper = parseCell(brysonData['pct1']);
    parsed = {
      base: lerp(0, upper.base, t),
      plusVariance: lerp(0, upper.plusVariance, t),
      minusVariance: lerp(0, upper.minusVariance, t)
    };
  } else {
    // Interpolate between two whole-number slopes
    const lower = parseCell(brysonData[`pct${lowerSlope}`]);
    const upper = parseCell(brysonData[`pct${upperSlope}`]);
    parsed = {
      base: lerp(lower.base, upper.base, t),
      plusVariance: lerp(lower.plusVariance, upper.plusVariance, t),
      minusVariance: lerp(lower.minusVariance, upper.minusVariance, t)
    };
  }

  // ZBL vector: scale aim by stimp relative to the stimp-10 baseline
  const stimpScale = (stimp || 10) / 10;
  const aimInches = (parsed.base * stimpScale).toFixed(1);
  const plusInches = parsed.plusVariance > 0 ? (parsed.plusVariance * stimpScale).toFixed(1) : null;
  const minusInches = parsed.minusVariance > 0 ? (parsed.minusVariance * stimpScale).toFixed(1) : null;

  return { aimInches, plusInches, minusInches };
}

// ========================================
// Quick Lookup
// ========================================

function buildSlopeNote(distance, slope, stimp) {
  const stimpScale = (stimp || 10) / 10;
  if (!slope || slope <= 0) {
    const uphillRate = Math.round(1 * stimpScale * 10) / 10;
    const downhillRate = Math.round(1.5 * stimpScale * 10) / 10;
    return `Uphill: +${uphillRate} ft/10 ft/1%<br>Downhill: −${downhillRate} ft/10 ft/1%`;
  }
  const uphill = Math.round(distance * slope / 10 * stimpScale * 10) / 10;
  const downhill = Math.round(distance * slope * 1.5 / 10 * stimpScale * 10) / 10;
  const uphillTotal = Math.round((distance + uphill) * 10) / 10;
  const downhillTotal = Math.max(1, Math.round((distance - downhill) * 10) / 10);
  return `Uphill: +${uphill} ft → play as ${uphillTotal} ft<br>Downhill: −${downhill} ft → play as ${downhillTotal} ft`;
}

function updateLookupResult() {
  const input = document.getElementById('distance-input');
  const slopeInput = document.getElementById('slope-input');
  const result = document.getElementById('lookup-result');
  const distance = parseFloat(input.value);
  const slope = parseFloat(slopeInput.value) || 0;

  if (!distance || distance <= 0) {
    result.innerHTML = '<div class="result-empty">Enter a distance above</div>';
    return;
  }

  // Clock mode: decompose slope into uphill/downhill + break components
  if (currentClock) {
    const factors = getClockFactors(currentClock);
    const stimpScale = currentStimp / 10;
    const uphillComp = slope * factors.uphillFactor;
    const breakAbs   = Math.abs(factors.breakFactor);

    let adjDist;
    if (uphillComp >= 0) {
      adjDist = distance + distance * uphillComp / 10 * stimpScale;
    } else {
      adjDist = distance + distance * uphillComp * 1.5 / 10 * stimpScale;
    }
    adjDist = Math.max(1, Math.round(adjDist));

    const zblResult = calculateZBLVector(distance, slope, currentStimp);
    const zblAimBase = zblResult ? parseFloat(zblResult.aimInches) : 0;
    const plusV  = zblResult ? parseFloat(zblResult.plusInches  || 0) : 0;
    const minusV = zblResult ? parseFloat(zblResult.minusInches || 0) : 0;

    const aboveBelow = Math.abs(factors.uphillFactor);
    const varianceAdj = factors.uphillFactor < 0
      ?  plusV  * aboveBelow   // from above hole: add superscript inches
      : -minusV * aboveBelow;  // from below hole: subtract subscript inches

    const lateralAim = Math.round((zblAimBase + varianceAdj) * breakAbs);
    const adjBSDisplay = backswingDisplay(adjDist, currentStimp);
    const breakDir = breakAbs < 0.05
      ? 'Straight'
      : (factors.breakFactor > 0 ? 'R→L' : 'L→R');

    let clockSlopeRowHTML = '';
    if (slope > 0 && Math.abs(factors.uphillFactor) > 0.05) {
      const isUphill = factors.uphillFactor > 0;
      clockSlopeRowHTML = `
        <div class="slope-row slope-row-centered">
          <span class="slope-dir ${isUphill ? 'slope-up' : 'slope-down'}">${isUphill ? '↑ Uphill' : '↓ Downhill'}</span>
          <span class="slope-dist">${adjDist} ft</span>
        </div>
      `;
    }

    // ── Aim cell HTML ────────────────────────────────────────────────
    const aimCellHTML = lateralAim > 0 ? `
      <div class="result-item">
        <div class="result-value">${lateralAim}" out</div>
        <div class="result-label">Aim ${breakDir}</div>
        <div class="result-zbl-ref">ZBL ${Math.round(zblAimBase)}"</div>
      </div>
    ` : `
      <div class="result-item">
        <div class="result-value">Straight</div>
        <div class="result-label">Aim</div>
      </div>
    `;

    updateLogLink();
    result.innerHTML = `
      <div class="result-content">
        <div class="result-row">
          <div class="result-item">
            <div class="result-value">${adjBSDisplay}</div>
            <div class="result-label">Backswing</div>
          </div>
          <div class="result-divider"></div>
          ${aimCellHTML}
        </div>
        ${clockSlopeRowHTML}
      </div>
    `;
    drawClockAnnotations(currentClock, {
      zblAimBase,
      lateralAim,
      plusV,
      minusV,
      breakAbs,
      uphillFactor: factors.uphillFactor,
    });
    return;
  }

  const backswingData = findBackswingData(distance, currentStimp);
  const zblData = calculateZBLVector(distance, slope, currentStimp);

  if (!backswingData || !zblData) {
    result.innerHTML = '<div class="result-empty">Distance out of range</div>';
    return;
  }

  const calBsInches = backswingDisplay(distance, currentStimp);
  const zblRaw = parseFloat(zblData.aimInches);
  const zblDisplay = Math.round(zblRaw) + '"';
  const slopeLabel = slope > 0 ? `ZBL Aim (${slope}%)` : 'ZBL Aim (flat)';
  updateLogLink();

  let slopeRowHTML = '';
  if (slope > 0) {
    const stimpScale = currentStimp / 10;
    const uphillAdj   = distance * slope / 10 * stimpScale;
    const downhillAdj = distance * slope * 1.5 / 10 * stimpScale;
    const uphillTotal   = Math.round(distance + uphillAdj);
    const downhillTotal = Math.max(1, Math.round(distance - downhillAdj));
    const uphillBSDisp   = backswingDisplay(uphillTotal, currentStimp);
    const downhillBSDisp = backswingDisplay(downhillTotal, currentStimp);
    // Uphill breaks less → floor ZBL; downhill breaks more → ceil ZBL
    const uphillZBL   = Math.floor(zblRaw) + '"';
    const downhillZBL = Math.ceil(zblRaw)  + '"';
    slopeRowHTML = `
      <div class="slope-row">
        <span class="slope-item slope-up">↑ ${uphillTotal} ft · ${uphillBSDisp}</span>
        <span class="slope-item slope-down">↓ ${downhillTotal} ft · ${downhillBSDisp}</span>
      </div>
    `;
  }

  drawClockAnnotations(null, {}); // clear SVG when not in clock mode
  result.innerHTML = `
    <div class="result-content">
      <div class="result-row">
        <div class="result-item">
          <div class="result-value">${calBsInches}</div>
          <div class="result-label">Backswing</div>
          ${slope === 0 ? `<div class="slope-note">${buildSlopeNote(distance, 0, currentStimp)}</div>` : ''}
        </div>
        <div class="result-divider"></div>
        <div class="result-item">
          <div class="result-value">${zblDisplay}</div>
          <div class="result-label">${slopeLabel}</div>
        </div>
      </div>
      ${slopeRowHTML}
    </div>
  `;
}

// ========================================
// Clock Face
// ========================================

function setClockHand(hour) {
  const hand = document.getElementById('clock-hand');
  if (!hand) return;
  if (hour === null) {
    hand.style.display = 'none';
    return;
  }
  hand.style.display = 'block';
  hand.style.transform = `translateX(-50%) rotate(${hour * 30}deg)`;
}

function initClockFace() {
  const face = document.getElementById('clock-face');
  if (!face) return;

  const R = 116; // radius from center in px
  const C = 140; // center (half of 280px face)

  [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].forEach(h => {
    const theta = (h * Math.PI) / 6;
    const x = C + R * Math.sin(theta);
    const y = C - R * Math.cos(theta);
    const btn = document.createElement('button');
    btn.className = 'clock-pos';
    btn.dataset.clock = String(h);
    btn.textContent = String(h);
    btn.style.left = x + 'px';
    btn.style.top  = y + 'px';
    face.appendChild(btn);
  });

  // SVG overlay for visual annotations
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'clock-svg';
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.setAttribute('aria-hidden', 'true');
  face.appendChild(svg);

  face.addEventListener('click', e => {
    const btn = e.target.closest('.clock-pos');
    if (!btn) return;
    const key = btn.dataset.clock;
    if (currentClock === key) {
      currentClock = null;
      btn.classList.remove('clock-pos-active');
      setClockHand(null);
      drawClockAnnotations(null, {}); // clear SVG
    } else {
      currentClock = key;
      face.querySelectorAll('.clock-pos').forEach(b => b.classList.remove('clock-pos-active'));
      btn.classList.add('clock-pos-active');
      setClockHand(parseInt(key));
    }
    updateLookupResult();
  });
}

function drawClockAnnotations(clockKey, { zblAimBase, lateralAim, breakAbs } = {}) {
  const svg = document.getElementById('clock-svg');
  if (!svg) return;
  svg.innerHTML = '';           // clear previous frame
  if (!clockKey || breakAbs < 0.05) return;   // straight putt — nothing to draw

  const C = 100;  // SVG center (hole)
  const R = 83;   // ball position radius
  const theta = CLOCK_DATA[clockKey].theta;

  // ── Positions ──────────────────────────────────────────────────
  const ballX = C + R * Math.sin(theta);
  const ballY = C - R * Math.cos(theta);

  // breakSign: R→L (sin θ ≥ 0) = +1, L→R = −1
  const breakSign = Math.sin(theta) >= 0 ? 1 : -1;

  // Visual scale: inches → SVG px, with a minimum for visibility
  const scaleIn = inches => Math.min(Math.max(inches * 3, 10), 45);

  // ── ZBL: ALWAYS directly above cup at 12 o'clock ───────────────
  const zblPx = scaleIn(zblAimBase);
  const zblX  = C;
  const zblY  = C - zblPx;

  // ── Helper ─────────────────────────────────────────────────────
  function el(tag, attrs) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    svg.appendChild(e);
    return e;
  }

  // ── 1. Measurement line: cup → ZBL (vertical, subtle) ─────────
  // Visually shows the cup-to-ZBL distance
  el('line', {
    x1: C, y1: C, x2: C, y2: zblY,
    stroke: 'rgba(255,255,255,0.40)',
    'stroke-width': '1',
    'stroke-linecap': 'round',
  });

  // ── 2. Dashed line: ball → ZBL (zero break line, hypotenuse) ───
  el('line', {
    x1: ballX, y1: ballY, x2: zblX, y2: zblY,
    stroke: 'rgba(255,255,255,0.90)',
    'stroke-width': '2',
    'stroke-dasharray': '4 3',
    'stroke-linecap': 'round',
  });

  // ── 3. ZBL dot (top of measurement line, at 12 o'clock) ────────
  el('circle', {
    cx: zblX, cy: zblY, r: '5',
    fill: 'white',
    opacity: '0.95',
  });

  // ── 4. Labels ──────────────────────────────────────────────────
  function label(x, y, text, fontSize) {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', x);
    t.setAttribute('y', y);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central');
    t.setAttribute('font-size', fontSize);
    t.setAttribute('font-weight', '700');
    t.setAttribute('font-family', 'system-ui,-apple-system,sans-serif');
    t.setAttribute('fill', 'white');
    t.setAttribute('stroke', 'rgba(14,27,61,0.85)');
    t.setAttribute('stroke-width', '3');
    t.setAttribute('paint-order', 'stroke');
    t.textContent = text;
    svg.appendChild(t);
  }

  // ZBL: "ZBL" above the dot; measurement value alongside the vertical line
  label(C, zblY - 12, 'ZBL', 8);
  label(C + (-breakSign) * 15, (C + zblY) / 2, `${Math.round(zblAimBase)}"`, 10);
}

function initQuickLookup() {
  const input = document.getElementById('distance-input');
  const plusBtn = document.getElementById('plus-btn');
  const minusBtn = document.getElementById('minus-btn');

  const slopeInput = document.getElementById('slope-input');
  const slopePlusBtn = document.getElementById('slope-plus-btn');
  const slopeMinusBtn = document.getElementById('slope-minus-btn');

  // Restore saved values
  const savedDistance = localStorage.getItem('putt-distance');
  const savedSlope = localStorage.getItem('putt-slope');
  const savedStimp = localStorage.getItem('putt-stimp');
  if (savedDistance) input.value = savedDistance;
  if (savedSlope) slopeInput.value = savedSlope;
  if (savedStimp) {
    currentStimp = parseFloat(savedStimp);
    document.querySelectorAll('.stimp-btn').forEach(btn => {
      btn.classList.toggle('stimp-btn-active', parseFloat(btn.dataset.stimp) === currentStimp);
    });
  }
  if (savedDistance) updateLookupResult();

  // Stimp toggle
  document.getElementById('stimp-toggle').addEventListener('click', e => {
    const btn = e.target.closest('.stimp-btn');
    if (!btn) return;
    currentStimp = parseFloat(btn.dataset.stimp);
    localStorage.setItem('putt-stimp', currentStimp);
    document.querySelectorAll('.stimp-btn').forEach(b => {
      b.classList.toggle('stimp-btn-active', b === btn);
    });
    updateLookupResult();
    renderCommonDistances();
  });

  input.addEventListener('input', () => {
    localStorage.setItem('putt-distance', input.value);
    updateLookupResult();
  });

  plusBtn.addEventListener('click', () => {
    const current = parseFloat(input.value) || 0;
    input.value = current + 1;
    localStorage.setItem('putt-distance', input.value);
    updateLookupResult();
  });

  minusBtn.addEventListener('click', () => {
    const current = parseFloat(input.value) || 0;
    if (current > 1) {
      input.value = current - 1;
      localStorage.setItem('putt-distance', input.value);
      updateLookupResult();
    }
  });

  slopeInput.addEventListener('input', () => {
    localStorage.setItem('putt-slope', slopeInput.value);
    updateLookupResult();
  });

  slopePlusBtn.addEventListener('click', () => {
    const current = parseFloat(slopeInput.value) || 0;
    if (current < 6) {
      slopeInput.value = Math.round(Math.min(6, current + 0.5) * 10) / 10;
      localStorage.setItem('putt-slope', slopeInput.value);
      updateLookupResult();
    }
  });

  slopeMinusBtn.addEventListener('click', () => {
    const current = parseFloat(slopeInput.value) || 0;
    if (current > 0) {
      slopeInput.value = Math.round(Math.max(0, current - 0.5) * 10) / 10;
      localStorage.setItem('putt-slope', slopeInput.value);
      updateLookupResult();
    }
  });

  initClockFace();
}

// ========================================
// Common Distances
// ========================================

function renderCommonDistances() {
  const container = document.getElementById('distance-grid');
  const commonDistances = [3, 5, 6, 10, 15, 20, 25, 30, 40, 50, 65, 80];

  const cards = commonDistances.map(feet => {
    const bs = backswingDisplay(feet, currentStimp);
    return `
      <div class="distance-card" data-distance="${feet}">
        <div class="distance-card-feet">${feet} ft</div>
        <div class="distance-card-bs">${bs}</div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = cards;
  
  // Click handler to populate input
  container.querySelectorAll('.distance-card').forEach(card => {
    card.addEventListener('click', () => {
      const distance = card.dataset.distance;
      document.getElementById('distance-input').value = distance;
      updateLookupResult();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ========================================
// Quick Reference Tables
// ========================================

function renderBackswingTable() {
  const table = document.getElementById('backswing-table');
  const rows = puttingData.lagPuttingTable.rows.filter(r => r.original);

  const headerHTML = `
    <thead>
      <tr>
        <th>Distance</th>
        <th>Backswing</th>
        <th>Landmark</th>
      </tr>
    </thead>
  `;

  const bodyHTML = rows.map(r => {
    const rawDist = parseFloat(r.stimp10);
    const calDist = Math.round(rawDist / puttCal.distanceFactor) + ' ft';
    return `
      <tr class="row-original">
        <td>${calDist}</td>
        <td>${Math.round(parseFloat(r.inches))}"</td>
        <td>${r.landmark}</td>
      </tr>
    `;
  }).join('');

  table.innerHTML = headerHTML + '<tbody>' + bodyHTML + '</tbody>';
}


// ========================================
// Init
// ========================================

async function init() {
  try {
    loadCalibration();
    const data = await loadJSON('data/putting.json');
    puttingData = data;

    initQuickLookup();
    renderCommonDistances();
    renderBackswingTable();
    
  } catch (error) {
    console.error('Error in init():', error);
    document.body.innerHTML = `
      <div style="text-align:center; padding:3rem 1rem; color:#999;">
        <p>Failed to load data. Make sure you're running a local server.</p>
        <p style="font-size:0.8rem; margin-top:0.5rem;">Try: <code>npx serve</code> in the project root</p>
        <p style="font-size:0.7rem; margin-top:0.5rem; color:#c00;">${error.message}</p>
      </div>
    `;
  }
}

// ========================================
// Onboarding
// ========================================

function initOnboarding() {
  if (localStorage.getItem('zerobreak-onboarded')) return;

  const overlay = document.getElementById('onboarding-overlay');
  if (!overlay) return;
  overlay.classList.add('onboarding-visible');

  const slides = overlay.querySelectorAll('.onboarding-slide');
  const dots   = overlay.querySelectorAll('.dot');
  const nextBtn = document.getElementById('onboarding-next');
  const skipBtn = document.getElementById('onboarding-skip');
  let current = 0;

  function goTo(n) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('dot-active');
    current = n;
    slides[current].classList.add('active');
    dots[current].classList.add('dot-active');
    const isLast = current === slides.length - 1;
    nextBtn.textContent = isLast ? 'Calibrate Now' : 'Next';
    skipBtn.style.display = isLast ? 'block' : 'none';
  }

  nextBtn.addEventListener('click', () => {
    if (current < slides.length - 1) {
      goTo(current + 1);
    } else {
      localStorage.setItem('zerobreak-onboarded', '1');
      window.location.href = 'log.html?from=onboarding';
    }
  });

  skipBtn.addEventListener('click', () => {
    localStorage.setItem('zerobreak-onboarded', '1');
    overlay.classList.remove('onboarding-visible');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initOnboarding();
  init();
});
