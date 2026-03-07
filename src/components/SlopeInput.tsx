import { NumberInput, ActionIcon, Group } from '@mantine/core';
import { IconChevronUp, IconChevronDown } from '@tabler/icons-react';

interface SlopeInputProps {
  value: number;
  onChange: (val: number) => void;
}

export default function SlopeInput({ value, onChange }: SlopeInputProps) {
  const handlePlus = () => {
    if (value < 6) onChange(Math.round(Math.min(6, value + 0.5) * 10) / 10);
  };

  const handleMinus = () => {
    if (value > 0) onChange(Math.round(Math.max(0, value - 0.5) * 10) / 10);
  };

  return (
    <div className="lookup-input-section">
      <label className="lookup-label">Slope (%)</label>
      <Group gap="xs" align="center" wrap="nowrap">
        <ActionIcon
          classNames={{ root: 'input-btn' }}
          variant="transparent"
          onClick={handleMinus}
          aria-label="Decrease slope"
        >
          <IconChevronDown size={20} />
        </ActionIcon>
        <NumberInput
          classNames={{ input: 'slope-input' }}
          style={{ flex: 1 }}
          hideControls
          min={0}
          max={6}
          step={0.5}
          value={value}
          onChange={v => onChange(v === '' ? 0 : Number(v))}
        />
        <ActionIcon
          classNames={{ root: 'input-btn' }}
          variant="transparent"
          onClick={handlePlus}
          aria-label="Increase slope"
        >
          <IconChevronUp size={20} />
        </ActionIcon>
      </Group>
    </div>
  );
}
