export interface ParsedCell {
  base: number;
  plusVariance: number;
  minusVariance: number;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function parseCell(cellValue: string | number | undefined): ParsedCell {
  if (cellValue === undefined || cellValue === null || cellValue === '') {
    return { base: 0, plusVariance: 0, minusVariance: 0 };
  }

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

  const num = parseFloat(str);
  return isNaN(num)
    ? { base: 0, plusVariance: 0, minusVariance: 0 }
    : { base: num, plusVariance: 0, minusVariance: 0 };
}

export function formatVariance(plusVariance: number, minusVariance: number): string {
  if (plusVariance === 0 && minusVariance === 0) return '';
  if (plusVariance === minusVariance) return `±${plusVariance}`;
  if (plusVariance > 0 && minusVariance > 0) return `+${plusVariance}/−${minusVariance}`;
  if (plusVariance > 0) return `+${plusVariance}`;
  if (minusVariance > 0) return `−${minusVariance}`;
  return '';
}
