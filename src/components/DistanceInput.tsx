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

  function decrement() {
    if (value === '' || (value as number) <= 0) return;
    const curDisplay = ftToDisplay(value as number);
    const step = unit === 'm' ? 1 : 1;
    const minDisplay = unit === 'm' ? 0.3 : 1;
    const next = Math.max(minDisplay, curDisplay - step);
    onChange(displayToFt(next));
  }

  function increment() {
    const curDisplay = value === '' ? 0 : ftToDisplay(value as number);
    onChange(displayToFt(curDisplay + 1));
  }

  return (
    <div className="lookup-input-section">
      <label className="lookup-label">Distance ({unitLabel})</label>
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
