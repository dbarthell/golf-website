import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';

interface Props {
  value: number;
  onChange: (val: number) => void;
}

export function SlopeInput({ value, onChange }: Props) {
  function decrement() {
    if (value > 0) {
      onChange(Math.round(Math.max(0, value - 0.5) * 10) / 10);
    }
  }
  function increment() {
    if (value < 6) {
      onChange(Math.round(Math.min(6, value + 0.5) * 10) / 10);
    }
  }

  return (
    <div className="lookup-input-section">
      <label className="lookup-label">Slope (%)</label>
      <div className="input-wrapper">
        <button className="input-btn input-minus" onClick={decrement} aria-label="Decrease slope">
          <IconChevronDown size={22} stroke={2.5} />
        </button>
        <input
          type="number"
          className="slope-input"
          value={value}
          placeholder="0"
          min={0}
          max={6}
          step={0.5}
          inputMode="decimal"
          onChange={e => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(Math.min(6, Math.max(0, v)));
          }}
        />
        <button className="input-btn input-plus" onClick={increment} aria-label="Increase slope">
          <IconChevronUp size={22} stroke={2.5} />
        </button>
      </div>
    </div>
  );
}
