import type { Meta, StoryObj } from '@storybook/react-vite';
import { Car, Home } from 'lucide-react';
import { useState } from 'react';
import { OptionCard } from './OptionCard.js';

const meta: Meta<typeof OptionCard> = {
  component: OptionCard,
  title: 'Molecules/OptionCard',
  args: { title: 'Auto', description: 'I need to insure my vehicle(s).' },
};
export default meta;

type Story = StoryObj<typeof OptionCard>;

export const Unselected: Story = {
  args: { icon: <Car />, onSelect: () => undefined },
};
export const Selected: Story = {
  args: { icon: <Car />, selected: true, onSelect: () => undefined },
};
export const WithBadge: Story = {
  args: {
    icon: <Home />,
    title: 'Home',
    description: 'I own or am purchasing a house.',
    badge: 'Bundle',
    onSelect: () => undefined,
  },
};

function InteractivePicker() {
  const [selected, setSelected] = useState('auto');
  const options = [
    {
      key: 'auto',
      title: 'Auto',
      description: 'I need to insure my vehicle(s).',
      icon: <Car />,
    },
    {
      key: 'home',
      title: 'Home',
      description: 'I own or am purchasing a house.',
      icon: <Home />,
      badge: 'Bundle',
    },
  ];
  return (
    <div className="flex gap-4">
      {options.map((option) => (
        <OptionCard
          key={option.key}
          icon={option.icon}
          title={option.title}
          description={option.description}
          badge={option.badge}
          selected={selected === option.key}
          onSelect={() => setSelected(option.key)}
        />
      ))}
    </div>
  );
}

export const InteractiveGrid: Story = { render: () => <InteractivePicker /> };
