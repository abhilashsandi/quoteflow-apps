import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input.js';

const meta: Meta<typeof Input> = {
  component: Input,
  title: 'Atoms/Input',
  args: { placeholder: 'Jane Doe' },
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {};
export const Invalid: Story = {
  args: { invalid: true, defaultValue: 'bad value' },
};
export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Jane Doe' },
};
