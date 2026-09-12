import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label } from './Label.js';

const meta: Meta<typeof Label> = {
  component: Label,
  title: 'Atoms/Label',
  args: { children: 'First name', htmlFor: 'first-name' },
};
export default meta;

type Story = StoryObj<typeof Label>;

export const Default: Story = {};
