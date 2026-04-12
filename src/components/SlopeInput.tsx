import { Group, NumberInput, ActionIcon } from '@mantine/core';
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
      <Group gap={0} wrap="nowrap" className="input-wrapper">
        <ActionIcon
          variant="transparent"
          color="white"
          className="input-btn input-minus"
          onClick={decrement}
          aria-label="Decrease slope"
        >
          <IconChevronDown size={22} stroke={2.5} />
        </ActionIcon>
        <NumberInput
          value={value}
          placeholder="0"
          min={0}
          max={6}
          step={0.5}
          decimalScale={1}
          inputMode="decimal"
          classNames={{ input: 'slope-input' }}
          hideControls
          onChange={v => {
            const n = Number(v);
            if (!isNaN(n)) onChange(Math.min(6, Math.max(0, n)));
          }}
          onFocus={e => e.target.select()}
        />
        <ActionIcon
          variant="transparent"
          color="white"
          className="input-btn input-plus"
          onClick={increment}
          aria-label="Increase slope"
        >
          <IconChevronUp size={22} stroke={2.5} />
        </ActionIcon>
      </Group>
    </div>
  );
}
