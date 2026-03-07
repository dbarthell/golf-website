import { NumberInput, ActionIcon, Group } from '@mantine/core';
import { IconChevronUp, IconChevronDown } from '@tabler/icons-react';

interface DistanceInputProps {
  value: number | null;
  onChange: (val: number | null) => void;
}

export default function DistanceInput({ value, onChange }: DistanceInputProps) {
  const handlePlus = () => {
    const next = (value ?? 0) + 1;
    onChange(Math.min(100, next));
  };

  const handleMinus = () => {
    if (!value || value <= 1) return;
    onChange(value - 1);
  };

  return (
    <div className="lookup-input-section">
      <label className="lookup-label">Distance (ft)</label>
      <Group gap="xs" align="center" wrap="nowrap">
        <ActionIcon
          classNames={{ root: 'input-btn' }}
          variant="transparent"
          onClick={handleMinus}
          aria-label="Decrease distance"
        >
          <IconChevronDown size={20} />
        </ActionIcon>
        <NumberInput
          classNames={{ input: 'distance-input' }}
          style={{ flex: 1 }}
          hideControls
          placeholder="—"
          min={1}
          max={100}
          value={value ?? ''}
          onChange={v => onChange(v === '' ? null : Number(v))}
        />
        <ActionIcon
          classNames={{ root: 'input-btn' }}
          variant="transparent"
          onClick={handlePlus}
          aria-label="Increase distance"
        >
          <IconChevronUp size={20} />
        </ActionIcon>
      </Group>
    </div>
  );
}
