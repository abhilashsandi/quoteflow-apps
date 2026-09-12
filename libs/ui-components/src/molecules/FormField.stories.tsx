import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from '../atoms/Input.js';
import { FormField } from './FormField.js';

const meta: Meta<typeof FormField> = {
  component: FormField,
  title: 'Molecules/FormField',
  args: { htmlFor: 'first-name', label: 'First name' },
};
export default meta;

type Story = StoryObj<typeof FormField>;

export const Default: Story = {
  render: (args) => (
    <FormField {...args}>
      <Input id="first-name" placeholder="Jane" />
    </FormField>
  ),
};

export const Required: Story = {
  args: { required: true },
  render: (args) => (
    <FormField {...args}>
      <Input id="first-name" placeholder="Jane" />
    </FormField>
  ),
};

export const WithError: Story = {
  args: { required: true, error: 'SSN must be 9 digits' },
  render: (args) => (
    <FormField {...args} htmlFor="ssn" label="Social Security Number">
      <Input id="ssn" invalid defaultValue="123-45-67" />
    </FormField>
  ),
};

export const WithDescription: Story = {
  args: { description: "We'll only use this to verify your identity." },
  render: (args) => (
    <FormField {...args}>
      <Input id="first-name" placeholder="Jane" />
    </FormField>
  ),
};
