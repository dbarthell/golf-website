const STIMPS = [9, 10, 10.5, 11, 11.5, 12];

interface Props {
  value: number;
  onChange: (stimp: number) => void;
  /** 'dark' (default) = dark hero variant; 'light' = calibrate page variant */
  variant?: 'dark' | 'light';
}

export function StimpToggle({ value, onChange, variant = 'dark' }: Props) {
  return (
    <div className={`stimp-toggle${variant === 'light' ? ' stimp-toggle-light' : ''}`}>
      {STIMPS.map(s => (
        <button
          key={s}
          className={`stimp-btn${value === s ? ' stimp-btn-active' : ''}`}
          onClick={() => onChange(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
