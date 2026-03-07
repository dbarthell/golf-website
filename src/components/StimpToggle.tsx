import { SegmentedControl } from '@mantine/core';

interface StimpToggleProps {
  value: number;
  onChange: (val: number) => void;
  variant?: 'dark' | 'light';
}

const STIMP_VALUES = [9, 10, 10.5, 11, 11.5, 12];
const DATA = STIMP_VALUES.map(s => ({ value: String(s), label: String(s) }));

export default function StimpToggle({ value, onChange, variant = 'dark' }: StimpToggleProps) {
  const isDark = variant === 'dark';
  return (
    <SegmentedControl
      data={DATA}
      value={String(value)}
      onChange={v => onChange(parseFloat(v))}
      fullWidth
      classNames={{
        root:      isDark ? 'stimp-sc-dark'           : 'stimp-sc-light',
        indicator: isDark ? 'stimp-sc-indicator-dark' : 'stimp-sc-indicator-light',
        label:     isDark ? 'stimp-sc-label-dark'     : 'stimp-sc-label-light',
      }}
    />
  );
}
