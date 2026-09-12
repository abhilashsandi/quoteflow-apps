import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { FeedbackButtons, type Feedback } from './FeedbackButtons.js';

const meta: Meta<typeof FeedbackButtons> = {
  component: FeedbackButtons,
  title: 'Molecules/FeedbackButtons',
};
export default meta;

type Story = StoryObj<typeof FeedbackButtons>;

function InteractiveFeedback() {
  const [value, setValue] = useState<Feedback>(null);
  return <FeedbackButtons value={value} onChange={setValue} />;
}

export const Interactive: Story = {
  render: () => <InteractiveFeedback />,
};

export const ThumbsUpSelected: Story = {
  args: { value: 'up', onChange: () => undefined },
};

export const ThumbsDownSelected: Story = {
  args: { value: 'down', onChange: () => undefined },
};
