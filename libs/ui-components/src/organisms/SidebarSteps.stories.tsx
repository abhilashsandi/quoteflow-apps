import type { Meta, StoryObj } from '@storybook/react-vite';
import { SidebarSteps } from './SidebarSteps.js';

const groups = [
  {
    heading: 'Build your plan',
    steps: [
      { key: 'contact', label: 'Contact Information' },
      { key: 'personal', label: 'Personal Details' },
      { key: 'license', label: 'License Details' },
      { key: 'drivers', label: 'Find Drivers' },
      { key: 'vehicles', label: 'Find Vehicles' },
    ],
  },
  {
    heading: 'Review & purchase',
    steps: [
      { key: 'review', label: 'Review Your Information' },
      { key: 'compare', label: 'Compare Your Quotes' },
      { key: 'checkout', label: 'Checkout' },
    ],
  },
];

const meta: Meta<typeof SidebarSteps> = {
  component: SidebarSteps,
  title: 'Organisms/SidebarSteps',
  args: { groups },
};
export default meta;

type Story = StoryObj<typeof SidebarSteps>;

export const FirstStep: Story = { args: { currentStepKey: 'contact' } };
export const MidwayWithCompleted: Story = {
  args: {
    currentStepKey: 'license',
    completedStepKeys: ['contact', 'personal'],
  },
};
export const ReviewStage: Story = {
  args: {
    currentStepKey: 'review',
    completedStepKeys: [
      'contact',
      'personal',
      'license',
      'drivers',
      'vehicles',
    ],
  },
};
