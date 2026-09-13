import type { Meta, StoryObj } from '@storybook/react-vite';
import { FeedbackButtons } from './FeedbackButtons.js';
import { ChatMessageBubble } from './ChatMessageBubble.js';

const meta: Meta<typeof ChatMessageBubble> = {
  component: ChatMessageBubble,
  title: 'Molecules/ChatMessageBubble',
};
export default meta;

type Story = StoryObj<typeof ChatMessageBubble>;

export const UserMessage: Story = {
  args: { role: 'user', text: 'What is a deductible?' },
};

export const ModelMessage: Story = {
  args: {
    role: 'model',
    text: 'A deductible is the amount you pay out of pocket before your insurance covers the rest of a claim.',
    citations: [{ id: 'deductibles', title: 'How Deductibles Work' }],
    feedback: <FeedbackButtons value={null} onChange={() => undefined} />,
  },
};

export const StreamingModelMessage: Story = {
  args: { role: 'model', text: '' },
};
