import { Group, NumberInput, ActionIcon } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useUnits } from '../hooks/useUnits';

interface Props {
  value: number | '';
  onChange: (val: number | '') => void;
}

export function DistanceInput({ value, onChange }: Props) {
  const { unit, ftToDisplay, displayToFt, unitLabel } = useUnits();

  // The displayed value is in the current unit; internally we store feet.
  const displayValue: number | '' = value === '' ? '' : ftToDisplay(value as number);

  function handleChange(v: number | '') {
    if (v === '') { onChange(''); return; }
    onChange(displayToFt(v as number));
  }

  // Both units step by 1 whole unit per button press (1 ft or 1 m).
  // In metric we use floor/ceil — not round — so that any non-whole starting
  // value (e.g. "4.9 m" from a ft↔m round-trip) always steps to the next
  // clean whole metre rather than accumulating imprecision.
  function decrement() {
    if (value === '' || (value as number) <= 0) return;
    const cur = ftToDisplay(value as number);
    const next = unit === 'm'
      ? Math.max(1, Math.ceil(cur) - 1)
      : Math.max(1, cur - 1);
    onChange(displayToFt(next));
  }

  function increment() {
    const cur = value === '' ? 0 : ftToDisplay(value as number);
    const next = unit === 'm' ? Math.floor(cur) + 1 : cur + 1;
    onChange(displayToFt(next));
  }

  return (
    <div className="lookup-input-section">
      <label className="lookup-label">Distance ({unitLabel})</label>
      <Group gap={0} wrap="nowrap" className="input-wrapper">
        <ActionIcon
          variant="transparent"
          color="white"
          className="input-btn input-minus"
          onClick={decrement}
          aria-label="Decrease distance"
        >
          <IconChevronDown size={22} stroke={2.5} />
        </ActionIcon>
        <NumberInput
          value={displayValue}
          placeholder="—"
          min={unit === 'm' ? 0.3 : 1}
          max={unit === 'm' ? 30.5 : 100}
          step={unit === 'm' ? 0.5 : 1}
          inputMode="decimal"
          classNames={{ input: 'distance-input' }}
          hideControls
          onChange={v => handleChange(v === '' ? '' : Number(v))}
        />
        <ActionIcon
          variant="transparent"
          color="white"
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
