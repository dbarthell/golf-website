// Clock positions: θ measured clockwise from 12 o'clock.
// CLOCK_DATA stores the true physics angles (used for breakFactor / uphillFactor).
// HOUR_POSITIONS stores the visually-respaced angles (used for button placement +
// clock hand rendering) so that :30 buttons have equal gaps on-screen.

const P = Math.PI;

export const CLOCK_DATA: Record<string, { theta: number }> = {
  '12':   { theta: 0 },
  '1':    { theta: P / 6 },
  '1.5':  { theta: P / 4 },
  '2':    { theta: P / 3 },
  '3':    { theta: P / 2 },
  '4':    { theta: 2 * P / 3 },
  '4.5':  { theta: 3 * P / 4 },
  '5':    { theta: 5 * P / 6 },
  '6':    { theta: P },
  '7':    { theta: 7 * P / 6 },
  '7.5':  { theta: 5 * P / 4 },
  '8':    { theta: 4 * P / 3 },
  '9':    { theta: 3 * P / 2 },
  '10':   { theta: 5 * P / 3 },
  '10.5': { theta: 7 * P / 4 },
  '11':   { theta: 11 * P / 6 },
};

export interface HourPosition {
  key: string;
  /** Visual (respaced) angle — used for button placement and hand rotation */
  theta: number;
  label: string;
  half?: boolean;
}

// Cardinals sit at 0 / 90 / 180 / 270°; non-cardinals compressed to 22.5° and
// 67.5° within each quadrant so that :30 buttons have equal visual gaps.
export const HOUR_POSITIONS: HourPosition[] = [
  { key: '12',   theta: 0,            label: '12' },
  { key: '1',    theta: P / 8,        label: '1' },
  { key: '1.5',  theta: P / 4,        label: '1:30', half: true },
  { key: '2',    theta: 3 * P / 8,    label: '2' },
  { key: '3',    theta: P / 2,        label: '3' },
  { key: '4',    theta: 5 * P / 8,    label: '4' },
  { key: '4.5',  theta: 3 * P / 4,    label: '4:30', half: true },
  { key: '5',    theta: 7 * P / 8,    label: '5' },
  { key: '6',    theta: P,            label: '6' },
  { key: '7',    theta: 9 * P / 8,    label: '7' },
  { key: '7.5',  theta: 5 * P / 4,    label: '7:30', half: true },
  { key: '8',    theta: 11 * P / 8,   label: '8' },
  { key: '9',    theta: 3 * P / 2,    label: '9' },
  { key: '10',   theta: 13 * P / 8,   label: '10' },
  { key: '10.5', theta: 7 * P / 4,    label: '10:30', half: true },
  { key: '11',   theta: 15 * P / 8,   label: '11' },
];

/**
 * Returns uphillFactor and breakFactor for a given clock position key.
 * uphillFactor > 0 = uphill putt (ball below hole)
 * breakFactor  > 0 = R→L break (aim right)
 */
export function getClockFactors(clockKey: string): { uphillFactor: number; breakFactor: number } | null {
  const data = CLOCK_DATA[clockKey];
  if (!data) return null;
  return {
    uphillFactor: -Math.cos(data.theta),
    breakFactor:   Math.sin(data.theta),
  };
}
