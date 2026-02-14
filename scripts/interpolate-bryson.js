#!/usr/bin/env node
/**
 * Computes interpolated Bryson table rows for every foot 1–25
 * plus the original half-foot values (2.5, 7.5).
 *
 * Reads data/putting.json, outputs the expanded rows as JSON.
 */

const fs = require('fs');
const path = require('path');

const putting = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'putting.json'), 'utf8')
);

const originalRows = putting.brysonTable.rows.filter(r => r.original);

// ── Parse cell values ──────────────────────────────────────────────
// Formats:
//   "3.5"              → { base: 3.5, high: 0, low: 0 }
//   "9 −1.5"           → { base: 9, high: 0, low: 1.5 }
//   "4 +1.5/−1.5"      → { base: 4, high: 1.5, low: 1.5 }

function parseCell(s) {
  s = String(s).trim();
  // Normalise minus signs (Unicode − U+2212 → ASCII -)
  s = s.replace(/\u2212/g, '-');

  // Pattern: base +high/-low
  const full = s.match(/^([\d.]+)\s*\+([\d.]+)\s*\/\s*-([\d.]+)$/);
  if (full) {
    return { base: parseFloat(full[1]), high: parseFloat(full[2]), low: parseFloat(full[3]) };
  }

  // Pattern: base -low  (only negative variance)
  const neg = s.match(/^([\d.]+)\s+-([\d.]+)$/);
  if (neg) {
    return { base: parseFloat(neg[1]), high: 0, low: parseFloat(neg[2]) };
  }

  // Plain number
  return { base: parseFloat(s), high: 0, low: 0 };
}

// ── Round to nearest 0.5 ──────────────────────────────────────────
function roundHalf(n) {
  return Math.round(n * 2) / 2;
}

// ── Format cell value back to display string ──────────────────────
function formatCell(base, high, low) {
  base = roundHalf(base);
  high = roundHalf(high);
  low = roundHalf(low);

  let s = String(base);

  if (high > 0 && low > 0) {
    s += ` +${high}/\u2212${low}`;
  } else if (low > 0) {
    s += ` \u2212${low}`;
  } else if (high > 0) {
    s += ` +${high}`;
  }

  return s;
}

// ── Build lookup of original data ─────────────────────────────────
const pctKeys = ['pct1', 'pct2', 'pct3', 'pct4', 'pct5', 'pct6'];

// Original anchor points sorted by feet
const anchors = originalRows.map(r => ({
  feet: parseFloat(r.feet),
  steps: r.steps,
  values: Object.fromEntries(pctKeys.map(k => [k, parseCell(r[k])]))
})).sort((a, b) => a.feet - b.feet);

const anchorFeet = anchors.map(a => a.feet);

// ── Interpolate a single value ────────────────────────────────────
function interpolateAt(feet, key) {
  // Below first anchor → extrapolate from first two anchors
  if (feet < anchors[0].feet) {
    const lo = anchors[0];
    const hi = anchors[1];
    const t = (feet - lo.feet) / (hi.feet - lo.feet); // negative t for extrapolation
    const loV = lo.values[key];
    const hiV = hi.values[key];
    return {
      base: Math.max(0, loV.base + t * (hiV.base - loV.base)),
      high: Math.max(0, loV.high + t * (hiV.high - loV.high)),
      low:  Math.max(0, loV.low  + t * (hiV.low  - loV.low)),
    };
  }

  // Find bracketing anchors
  let loIdx = 0;
  let hiIdx = anchors.length - 1;

  for (let i = 0; i < anchors.length; i++) {
    if (anchors[i].feet <= feet) loIdx = i;
    if (anchors[i].feet >= feet) { hiIdx = i; break; }
  }

  const lo = anchors[loIdx];
  const hi = anchors[hiIdx];

  if (lo.feet === hi.feet) {
    // Exact match
    const v = lo.values[key];
    return { base: v.base, high: v.high, low: v.low };
  }

  const t = (feet - lo.feet) / (hi.feet - lo.feet);
  const loV = lo.values[key];
  const hiV = hi.values[key];

  return {
    base: loV.base + t * (hiV.base - loV.base),
    high: loV.high + t * (hiV.high - loV.high),
    low:  loV.low  + t * (hiV.low  - loV.low),
  };
}

// ── Generate all target feet ──────────────────────────────────────
const targetFeet = [];
for (let f = 1; f <= 25; f++) {
  targetFeet.push(f);
}
// Add the original half-foot values
targetFeet.push(2.5, 7.5);
// Sort and deduplicate
targetFeet.sort((a, b) => a - b);

const originalFeetSet = new Set(anchorFeet.map(String));

// ── Build rows ────────────────────────────────────────────────────
const rows = targetFeet.map(feet => {
  const isOriginal = originalFeetSet.has(String(feet));

  // If original, use exact original data
  if (isOriginal) {
    const orig = originalRows.find(r => parseFloat(r.feet) === feet);
    return {
      steps: orig.steps,
      feet: orig.feet,
      pct1: orig.pct1,
      pct2: orig.pct2,
      pct3: orig.pct3,
      pct4: orig.pct4,
      pct5: orig.pct5,
      pct6: orig.pct6,
      original: true
    };
  }

  // Interpolated
  const steps = Math.round((feet / 3) * 10) / 10; // 1 decimal place

  const row = {
    steps: steps,
    feet: String(feet),
    original: false
  };

  for (const key of pctKeys) {
    const v = interpolateAt(feet, key);
    row[key] = formatCell(v.base, v.high, v.low);
  }

  return row;
});

// ── Output ────────────────────────────────────────────────────────
console.log(JSON.stringify(rows, null, 2));
