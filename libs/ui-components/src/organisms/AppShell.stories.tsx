import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../atoms/Button.js';
import { StepIndicator } from '../molecules/StepIndicator.js';
import { AppShell } from './AppShell.js';

const meta: Meta<typeof AppShell> = {
  component: AppShell,
  title: 'Organisms/AppShell',
  args: {
    brand: 'QuoteFlow · Customer Portal',
    children: <p>Page content goes here.</p>,
    footer: '© Acme Insurance',
  },
};
export default meta;

type Story = StoryObj<typeof AppShell>;

export const Default: Story = {};

export const WithProgressAndActions: Story = {
  args: {
    headerActions: <Button variant="ghost">Sign out</Button>,
    progress: (
      <StepIndicator
        currentStepKey="rc1"
        steps={[
          { key: 'schema', label: 'Your info' },
          { key: 'rc1', label: 'Quote' },
          { key: 'rc2', label: 'Driving record' },
          { key: 'bind', label: 'Purchase' },
        ]}
      />
    ),
  },
};
