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

  /** Round a value to the nearest 0.5 and format it (no trailing .0) */
  function r05(n: number): string {
    const r = Math.round(n * 2) / 2;
    return r % 1 === 0 ? r.toFixed(0) : r.toFixed(1);
  }

  /** Format raw inches as an aim display string in the current unit */
  function fmtAim(inches: number): string {
    if (unit === 'm') return r05(inToCm(inches)) + ' cm';
    return r05(inches) + '"';
  }

  /** Format raw calibrated inches as a backswing display value (inches or cm) */
  function fmtBackswing(inches: number): string {
    if (unit === 'm') return r05(inches * 2.54) + ' cm';
    return r05(inches) + '"';
  }

  /** Format variance inches (like "1.5") as aim variance in current unit */
  function fmtAimVariance(inches: string): string {
    if (unit === 'm') return r05(inToCm(parseFloat(inches))) + ' cm';
    return inches + '"';
  }

  /**
   * Return [numericString, unitLabel] for a backswing value — used to render
   * the number at large size and the unit at a smaller mid-weight size.
   */
  function fmtBackswingParts(inches: number): [string, string] {
    if (unit === 'm') return [r05(inches * 2.54), 'cm'];
    return [r05(inches), '"'];
  }

  /**
   * Return [numericString, unitLabel] for an aim value — used to render
   * the number at large size and the unit at a smaller mid-weight size.
   */
  function fmtAimParts(inches: number): [string, string] {
    if (unit === 'm') return [r05(inToCm(inches)), 'cm'];
    return [r05(inches), '"'];
  }

  /**
   * Convert a feet value to the numeric display-unit value.
   * In metric, snaps to the nearest 0.5 m so that the feet↔metres round-trip
   * always yields a clean displayed number (e.g. 16 ft → 4.9 m → 5.0 m).
   */
  function ftToDisplay(feet: number): number {
    if (unit === 'm') {
      const m = ftToM(feet);
      return Math.round(m * 2) / 2;
    }
    return feet;
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
    fmtBackswing,
    fmtBackswingParts,
    fmtAimParts,
    ftToDisplay,
    displayToFt,
    unitLabel,
    aimLabel,
  };
}
