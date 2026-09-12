import type { Meta, StoryObj } from '@storybook/react-vite';
import { StepIndicator } from './StepIndicator.js';

const steps = [
  { key: 'schema', label: 'Your info' },
  { key: 'rc1', label: 'Quote' },
  { key: 'rc2', label: 'Driving record' },
  { key: 'bind', label: 'Purchase' },
];

const meta: Meta<typeof StepIndicator> = {
  component: StepIndicator,
  title: 'Molecules/StepIndicator',
  args: { steps },
};
export default meta;

type Story = StoryObj<typeof StepIndicator>;

export const FirstStep: Story = { args: { currentStepKey: 'schema' } };
export const MiddleStep: Story = { args: { currentStepKey: 'rc2' } };
export const LastStep: Story = { args: { currentStepKey: 'bind' } };
