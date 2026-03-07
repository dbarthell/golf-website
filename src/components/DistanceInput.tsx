import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';

interface Props {
  value: number | '';
  onChange: (val: number | '') => void;
}

export function DistanceInput({ value, onChange }: Props) {
  function decrement() {
    const cur = typeof value === 'number' ? value : 0;
    if (cur > 1) onChange(cur - 1);
  }
  function increment() {
    const cur = typeof value === 'number' ? value : 0;
    onChange(cur + 1);
  }

  return (
    <div className="lookup-input-section">
      <label className="lookup-label">Distance (ft)</label>
      <div className="input-wrapper">
        <button className="input-btn input-minus" onClick={decrement} aria-label="Decrease distance">
          <IconChevronDown size={22} stroke={2.5} />
        </button>
        <input
          type="number"
          className="distance-input"
          value={value}
          placeholder="—"
          min={1}
          max={100}
          inputMode="decimal"
          onChange={e => {
            const v = e.target.value;
            onChange(v === '' ? '' : parseFloat(v));
          }}
        />
        <button className="input-btn input-plus" onClick={increment} aria-label="Increase distance">
          <IconChevronUp size={22} stroke={2.5} />
        </button>
      </div>
    </div>
  );
}
