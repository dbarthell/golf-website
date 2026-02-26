// Analyze the pattern of +/− adjustments to extrapolate missing + values for 2% slope

const puttingData = require('../data/putting.json');

function parseCell(str) {
  const match = str.match(/^([\d.]+)\s*(?:([+−][\d.]+))?(?:\/(−[\d.]+))?$/);
  if (!match) return null;
  
  const base = parseFloat(match[1]);
  let plus = 0, minus = 0;
  
  if (match[2]) {
    const val = parseFloat(match[2].replace('−', '-'));
    if (val > 0) plus = val;
    else minus = Math.abs(val);
  }
  if (match[3]) {
    minus = Math.abs(parseFloat(match[3].replace('−', '-')));
  }
  
  return { base, plus, minus };
}

console.log('Distance | pct1 | pct2 | pct3 | Plus/Minus Ratio (3%)');
console.log('---------|------|------|------|----------------------');

puttingData.brysonTable.rows.forEach(row => {
  if (!row.original) return; // Only look at original calibration points
  
  const pct1 = parseCell(row.pct1);
  const pct2 = parseCell(row.pct2);
  const pct3 = parseCell(row.pct3);
  
  const ratio3 = pct3.plus && pct3.minus ? (pct3.plus / pct3.minus).toFixed(2) : 'N/A';
  
  // Estimate missing + value for pct2 based on pct3 ratio
  let estimated = '';
  if (pct2.minus > 0 && pct3.plus > 0 && pct3.minus > 0) {
    const estimatedPlus = (pct2.minus * (pct3.plus / pct3.minus)).toFixed(1);
    estimated = ` → Est +${estimatedPlus}`;
  }
  
  console.log(
    `${row.feet.padEnd(8)} | ` +
    `${pct1.base.toFixed(1).padEnd(4)} | ` +
    `${pct2.base.toFixed(1).padEnd(4)} ${pct2.minus > 0 ? '−' + pct2.minus : ''}${estimated} | ` +
    `${pct3.base.toFixed(1).padEnd(4)} ${pct3.plus > 0 ? '+' + pct3.plus : ''}${pct3.minus > 0 ? '/−' + pct3.minus : ''} | ` +
    `${ratio3}`
  );
});

// Calculate average ratio for longer putts
console.log('\n--- Analysis for longer putts (≥20 ft) ---');
const longPutts = puttingData.brysonTable.rows.filter(r => r.original && parseFloat(r.feet) >= 20);
let ratios = [];

longPutts.forEach(row => {
  const pct3 = parseCell(row.pct3);
  if (pct3.plus > 0 && pct3.minus > 0) {
    const ratio = pct3.plus / pct3.minus;
    ratios.push(ratio);
    console.log(`${row.feet} ft: +${pct3.plus}/−${pct3.minus} = ratio ${ratio.toFixed(3)}`);
  }
});

const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
console.log(`\nAverage +/− ratio for long putts at 3%: ${avgRatio.toFixed(3)}`);
console.log('\nSuggested additions to 2% column:');

puttingData.brysonTable.rows.forEach(row => {
  if (!row.original) return;
  const pct2 = parseCell(row.pct2);
  if (pct2.minus > 0 && pct2.plus === 0) {
    const estimatedPlus = (pct2.minus * avgRatio).toFixed(1);
    console.log(`${row.feet} ft: "${pct2.base} +${estimatedPlus}/−${pct2.minus}"`);
  }
});
