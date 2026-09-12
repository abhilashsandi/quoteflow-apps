import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../atoms/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../molecules/Card.js';
import { StepIndicator } from '../molecules/StepIndicator.js';
import { AppShell } from './AppShell.js';
import { SidebarSteps } from './SidebarSteps.js';

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

export const GradientWithSidebar: Story = {
  args: {
    gradient: true,
    sidebar: (
      <SidebarSteps
        currentStepKey="personal"
        completedStepKeys={['contact']}
        groups={[
          {
            heading: 'Build your plan',
            steps: [
              { key: 'contact', label: 'Contact Information' },
              { key: 'personal', label: 'Personal Details' },
              { key: 'license', label: 'License Details' },
            ],
          },
          {
            heading: 'Review & purchase',
            steps: [
              { key: 'review', label: 'Review Your Information' },
              { key: 'checkout', label: 'Checkout' },
            ],
          },
        ]}
      />
    ),
    children: (
      <Card>
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Form fields would go here.
          </p>
        </CardContent>
      </Card>
    ),
  },
};
