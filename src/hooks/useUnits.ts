import { useContext } from 'react';
import { UnitsContext } from '../context/UnitsContext';

export type { Unit } from '../context/UnitsContext';

// ── Conversion utilities ───────────────────────────────────────────────────────

/** Round to 1 decimal place */
function r1(n: number) { return Math.round(n * 10) / 10; }

/** Convert feet → metres (1 dp) */
export function ftToM(feet: number): number { return r1(feet * 0.3048); }

/** Convert metres → feet (nearest foot) */
export function mToFt(metres: number): number { return Math.round(metres / 0.3048); }

/** Convert inches → centimetres (1 dp) */
export function inToCm(inches: number): number { return r1(inches * 2.54); }

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useUnits() {
  const { unit, toggleUnit } = useContext(UnitsContext);

  /** Format a raw feet value as a display string with unit label */
  function fmtDist(feet: number): string {
    if (unit === 'm') return `${ftToM(feet)} m`;
    return `${feet} ft`;
  }

  /** Format raw inches as an aim display string in the current unit */
  function fmtAim(inches: number): string {
    if (unit === 'm') return `${inToCm(inches).toFixed(1)} cm`;
    const r = Math.round(inches * 2) / 2;
    return (r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)) + '"';
  }

  /** Format variance inches (like "1.5") as aim variance in current unit */
  function fmtAimVariance(inches: string): string {
    if (unit === 'm') return inToCm(parseFloat(inches)).toFixed(1) + ' cm';
    return inches + '"';
  }

  /** Convert a feet value to the numeric display-unit value */
  function ftToDisplay(feet: number): number {
    return unit === 'm' ? ftToM(feet) : feet;
  }

  /** Convert a display-unit numeric value back to feet */
  function displayToFt(val: number): number {
    return unit === 'm' ? mToFt(val) : val;
  }

  const unitLabel = unit === 'm' ? 'm' : 'ft';
  const aimLabel  = unit === 'm' ? 'cm' : '"';

  return {
    unit,
    toggleUnit,
    fmtDist,
    fmtAim,
    fmtAimVariance,
    ftToDisplay,
    displayToFt,
    unitLabel,
    aimLabel,
  };
}
