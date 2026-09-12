import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../atoms/Button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './Card.js';

const meta: Meta<typeof Card> = {
  component: Card,
  title: 'Molecules/Card',
};
export default meta;

type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Your quote</CardTitle>
        <CardDescription>Acme Insurance · Auto</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">$775.00 / mo</p>
      </CardContent>
      <CardFooter>
        <Button>Continue</Button>
      </CardFooter>
    </Card>
  ),
};
