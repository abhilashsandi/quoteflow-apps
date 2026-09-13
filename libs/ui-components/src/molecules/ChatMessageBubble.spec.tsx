import { render, screen } from '@testing-library/react';
import { ChatMessageBubble } from './ChatMessageBubble.js';

describe('ChatMessageBubble', () => {
  it('renders the message text', () => {
    render(<ChatMessageBubble role="user" text="What is a deductible?" />);
    expect(screen.getByText('What is a deductible?')).toBeInTheDocument();
  });

  it('shows an ellipsis placeholder for an empty model message (mid-stream)', () => {
    render(<ChatMessageBubble role="model" text="" />);
    expect(screen.getByText('…')).toBeInTheDocument();
  });

  it('renders citations only for the model role', () => {
    render(
      <ChatMessageBubble
        role="model"
        text="answer"
        citations={[{ id: 'deductibles', title: 'How Deductibles Work' }]}
      />,
    );
    expect(screen.getByText('How Deductibles Work')).toBeInTheDocument();
  });

  it('does not render citations for a user message', () => {
    render(
      <ChatMessageBubble
        role="user"
        text="question"
        citations={[{ id: 'deductibles', title: 'How Deductibles Work' }]}
      />,
    );
    expect(screen.queryByText('How Deductibles Work')).not.toBeInTheDocument();
  });

  it('renders the feedback slot for a model message', () => {
    render(
      <ChatMessageBubble
        role="model"
        text="answer"
        feedback={<button>feedback-slot</button>}
      />,
    );
    expect(screen.getByText('feedback-slot')).toBeInTheDocument();
  });
});
