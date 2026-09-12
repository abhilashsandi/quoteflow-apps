import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './Select.js';

const meta: Meta<typeof Select> = {
  component: Select,
  title: 'Atoms/Select',
};
export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <Select defaultValue="single">
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Marital status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="single">Single</SelectItem>
        <SelectItem value="married">Married</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithMoreOptions: Story = {
  render: () => (
    <Select defaultValue="married">
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Marital status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="single">Single</SelectItem>
        <SelectItem value="married">Married</SelectItem>
        <SelectItem value="domestic_partner">Domestic Partner</SelectItem>
      </SelectContent>
    </Select>
  ),
};
