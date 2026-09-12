import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge.js';

const meta: Meta<typeof Badge> = {
  component: Badge,
  title: 'Atoms/Badge',
  args: { children: 'Bound' },
};
export default meta;

type Story = StoryObj<typeof Badge>;

export const Default: Story = {};
export const Secondary: Story = {
  args: { variant: 'secondary', children: 'In progress' },
};
export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Failed' },
};
export const Outline: Story = {
  args: { variant: 'outline', children: 'Draft' },
};
