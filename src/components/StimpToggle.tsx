import { SegmentedControl } from '@mantine/core';

const STIMPS = [9, 10, 10.5, 11, 11.5, 12];

interface Props {
  value: number;
  onChange: (stimp: number) => void;
  /** 'dark' (default) = dark hero variant; 'light' = calibrate page variant */
  variant?: 'dark' | 'light';
}

export function StimpToggle({ value, onChange, variant = 'dark' }: Props) {
  const isDark = variant === 'dark';
  return (
    <SegmentedControl
      value={String(value)}
      onChange={v => onChange(parseFloat(v))}
      data={STIMPS.map(s => ({ value: String(s), label: String(s) }))}
      size="sm"
      classNames={{
        root:      isDark ? 'stimp-sc-dark'           : 'stimp-sc-light',
        indicator: isDark ? 'stimp-sc-indicator-dark' : 'stimp-sc-indicator-light',
        label:     isDark ? 'stimp-sc-label-dark'     : 'stimp-sc-label-light',
        control:   isDark ? 'stimp-sc-control-dark'   : '',
      }}
      styles={{
        label: { paddingTop: '0.18rem', paddingBottom: '0.18rem' },
      }}
    />
  );
}
