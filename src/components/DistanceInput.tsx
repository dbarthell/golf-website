import { Group, NumberInput, ActionIcon } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';

interface Props {
  value: number | '';
  onChange: (val: number | '') => void;
}

export function DistanceInput({ value, onChange }: Props) {
  const cur = typeof value === 'number' ? value : 0;

  function decrement() {
    if (cur > 1) onChange(cur - 1);
  }
  function increment() {
    onChange(cur + 1);
  }

  return (
    <div className="lookup-input-section">
      <label className="lookup-label">Distance (ft)</label>
      <Group gap={0} wrap="nowrap" className="input-wrapper">
        <ActionIcon
          variant="subtle"
          className="input-btn input-minus"
          onClick={decrement}
          aria-label="Decrease distance"
        >
          <IconChevronDown size={22} stroke={2.5} />
        </ActionIcon>
        <NumberInput
          value={value}
          placeholder="—"
          min={1}
          max={100}
          inputMode="decimal"
          classNames={{ input: 'distance-input' }}
          hideControls
          onChange={v => onChange(v === '' ? '' : Number(v))}
        />
        <ActionIcon
          variant="subtle"
          className="input-btn input-plus"
          onClick={increment}
          aria-label="Increase distance"
        >
          <IconChevronUp size={22} stroke={2.5} />
        </ActionIcon>
      </Group>
    </div>
  );
}
