// ========================================
// Data Loading
// ========================================

let puttingData = null;

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

function findBackswingData(distanceFeet) {
  const rows = puttingData.lagPuttingTable.rows;
  
  // Find exact match for Stimp 10
  const exactMatch = rows.find(r => parseFloat(r.stimp10.replace(' ft', '')) === distanceFeet);
  if (exactMatch) return exactMatch;
  
  // Find surrounding rows for interpolation
  let lower = null;
  let upper = null;
  
  for (let i = 0; i < rows.length; i++) {
    const feet = parseFloat(rows[i].stimp10.replace(' ft', ''));
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
  
  // Interpolate backswing inches
  const lowerFeet = parseFloat(lower.stimp10.replace(' ft', ''));
  const upperFeet = parseFloat(upper.stimp10.replace(' ft', ''));
  const t = (distanceFeet - lowerFeet) / (upperFeet - lowerFeet);
  
  const lowerInches = parseFloat(lower.inches.replace('"', ''));
  const upperInches = parseFloat(upper.inches.replace('"', ''));
  const interpolatedInches = lerp(lowerInches, upperInches, t);
  
  return {
    inches: interpolatedInches.toFixed(1) + '"',
    landmark: '(interpolated)',
    stimp10: distanceFeet + ' ft',
    original: false
  };
}

function calculateZBLVector(distanceFeet) {
  // Get Bryson data for 2% slope
  const brysonData = findPuttingData(distanceFeet);
  if (!brysonData) return null;
  
  const parsed = parseCell(brysonData.pct2);
  
  // ZBL vector: the aim distance along the zero break line at 2% slope (already in inches)
  // This is the distance you aim uphill/downhill from the hole
  const aimInches = parsed.base.toFixed(1);
  const plusInches = parsed.plusVariance > 0 ? parsed.plusVariance.toFixed(1) : null;
  const minusInches = parsed.minusVariance > 0 ? parsed.minusVariance.toFixed(1) : null;
  
  return {
    aimInches,
    plusInches,
    minusInches
  };
}

// ========================================
// Quick Lookup
// ========================================

function updateLookupResult() {
  const input = document.getElementById('distance-input');
  const result = document.getElementById('lookup-result');
  const distance = parseFloat(input.value);
  
  if (!distance || distance <= 0) {
    result.innerHTML = '<div class="result-empty">Enter a distance above</div>';
    return;
  }
  
  const backswingData = findBackswingData(distance);
  const zblData = calculateZBLVector(distance);
  
  if (!backswingData || !zblData) {
    result.innerHTML = '<div class="result-empty">Distance out of range</div>';
    return;
  }
  
  const zblDisplay = zblData.aimInches + '"';
  const hasVariance = zblData.plusInches || zblData.minusInches;
  
  result.innerHTML = `
    <div class="result-content">
      <div class="result-row">
        <div class="result-item">
          <div class="result-value">${backswingData.inches}</div>
          <div class="result-label">Backswing</div>
          <div class="slope-note">Uphill: +1 ft/10 ft/1%<br>Downhill: −1.5 ft/10 ft/1%</div>
        </div>
        <div class="result-divider"></div>
        <div class="result-item">
          <div class="result-value-container">
            <div class="result-value">${zblDisplay}</div>
            ${hasVariance ? `
              <div class="variance-display">
                ${zblData.plusInches ? `<span class="variance-plus">+${zblData.plusInches}</span>` : ''}
                ${zblData.minusInches ? `<span class="variance-minus">−${zblData.minusInches}</span>` : ''}
              </div>
            ` : ''}
          </div>
          <div class="result-label">ZBL Aim (2%)</div>
        </div>
      </div>
    </div>
  `;
}

function initQuickLookup() {
  const input = document.getElementById('distance-input');
  input.addEventListener('input', updateLookupResult);
}

// ========================================
// Common Distances
// ========================================

function renderCommonDistances() {
  const container = document.getElementById('distance-grid');
  const commonDistances = [3, 5, 6, 10, 15, 20, 25, 30, 40, 50, 65, 80];
  
  const cards = commonDistances.map(feet => {
    const backswingData = findBackswingData(feet);
    const zblData = calculateZBLVector(feet);
    if (!backswingData || !zblData) return '';
    
    return `
      <div class="distance-card" data-distance="${feet}">
        <div class="distance-card-feet">${feet} ft</div>
        <div class="distance-card-info">
          <div class="info-row">
            <span class="info-label">Backswing:</span>
            <span class="info-value">${backswingData.inches}</span>
          </div>
          <div class="info-row">
            <span class="info-label">ZBL Aim:</span>
            <span class="info-value">${zblData.aimInches}"</span>
          </div>
        </div>
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
  
  const bodyHTML = rows.map(r => `
    <tr class="row-original">
      <td>${r.stimp10}</td>
      <td>${r.inches}</td>
      <td>${r.landmark}</td>
    </tr>
  `).join('');
  
  table.innerHTML = headerHTML + '<tbody>' + bodyHTML + '</tbody>';
}

function renderZBLTable() {
  const table = document.getElementById('zbl-table');
  const rows = puttingData.brysonTable.rows.filter(r => r.original);
  
  const headerHTML = `
    <thead>
      <tr>
        <th>Distance</th>
        <th>ZBL Aim</th>
        <th>+/−</th>
      </tr>
    </thead>
  `;
  
  const bodyHTML = rows.map(r => {
    const parsed = parseCell(r.pct2);
    const aimInches = parsed.base.toFixed(1);
    const plusInches = parsed.plusVariance > 0 ? parsed.plusVariance.toFixed(1) : null;
    const minusInches = parsed.minusVariance > 0 ? parsed.minusVariance.toFixed(1) : null;
    
    let varianceStr = '—';
    if (plusInches && minusInches) {
      varianceStr = `<span style="color:var(--green-accent);">+${plusInches}</span> / <span style="color:var(--gray-600);">−${minusInches}</span>`;
    } else if (plusInches) {
      varianceStr = `<span style="color:var(--green-accent);">+${plusInches}</span>`;
    } else if (minusInches) {
      varianceStr = `<span style="color:var(--gray-600);">−${minusInches}</span>`;
    }
    
    return `
      <tr class="row-original">
        <td>${r.feet} ft</td>
        <td>${aimInches}"</td>
        <td>${varianceStr}</td>
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
    const data = await loadJSON('data/putting.json');
    puttingData = data;
    
    initQuickLookup();
    renderCommonDistances();
    renderBackswingTable();
    renderZBLTable();
    
  } catch (error) {
    console.error('Error loading data:', error);
    document.body.innerHTML = `
      <div style="text-align:center; padding:3rem 1rem; color:#999;">
        <p>Failed to load data. Make sure you're running a local server.</p>
        <p style="font-size:0.8rem; margin-top:0.5rem;">Try: <code>npx serve</code> in the project root</p>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', init);
