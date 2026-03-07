export interface ClockEntry {
  theta: number;
}

export interface ClockFactors {
  uphillFactor: number;
  breakFactor: number;
}

// Theta measured clockwise from 12 o'clock (math angles, used for the putting calculations)
export const CLOCK_DATA: Record<string, ClockEntry> = {
  '12':   { theta: 0 },
  '1':    { theta: Math.PI / 6 },
  '1.5':  { theta: Math.PI / 4 },
  '2':    { theta: Math.PI / 3 },
  '3':    { theta: Math.PI / 2 },
  '4':    { theta: 2 * Math.PI / 3 },
  '4.5':  { theta: 3 * Math.PI / 4 },
  '5':    { theta: 5 * Math.PI / 6 },
  '6':    { theta: Math.PI },
  '7':    { theta: 7 * Math.PI / 6 },
  '7.5':  { theta: 5 * Math.PI / 4 },
  '8':    { theta: 4 * Math.PI / 3 },
  '9':    { theta: 3 * Math.PI / 2 },
  '10':   { theta: 5 * Math.PI / 3 },
  '10.5': { theta: 7 * Math.PI / 4 },
  '11':   { theta: 11 * Math.PI / 6 },
};

// uphillFactor > 0 = uphill putt, < 0 = downhill putt
// breakFactor > 0 = R→L break (aim right), < 0 = L→R break (aim left)
export function getClockFactors(clockKey: string): ClockFactors | null {
  const data = CLOCK_DATA[clockKey];
  if (!data) return null;
  return {
    uphillFactor: -Math.cos(data.theta),
    breakFactor:   Math.sin(data.theta),
  };
}

export interface HourPosition {
  key: string;
  theta: number;   // visual display theta (compressed for equal spacing)
  label: string;
  half?: boolean;
}

const P = Math.PI;

// Visual positions: cardinals at 0/90/180/270°, non-cardinals compressed to
// 22.5° and 67.5° within each quadrant so :30 buttons have equal gaps.
// CLOCK_DATA thetas (used for the math) are unchanged.
export const HOUR_POSITIONS: HourPosition[] = [
  { key: '12',   theta: 0,              label: '12' },
  { key: '1',    theta: P / 8,          label: '1' },
  { key: '1.5',  theta: P / 4,          label: '1:30', half: true },
  { key: '2',    theta: 3 * P / 8,      label: '2' },
  { key: '3',    theta: P / 2,          label: '3' },
  { key: '4',    theta: 5 * P / 8,      label: '4' },
  { key: '4.5',  theta: 3 * P / 4,      label: '4:30', half: true },
  { key: '5',    theta: 7 * P / 8,      label: '5' },
  { key: '6',    theta: P,              label: '6' },
  { key: '7',    theta: 9 * P / 8,      label: '7' },
  { key: '7.5',  theta: 5 * P / 4,      label: '7:30', half: true },
  { key: '8',    theta: 11 * P / 8,     label: '8' },
  { key: '9',    theta: 3 * P / 2,      label: '9' },
  { key: '10',   theta: 13 * P / 8,     label: '10' },
  { key: '10.5', theta: 7 * P / 4,      label: '10:30', half: true },
  { key: '11',   theta: 15 * P / 8,     label: '11' },
];
