import { fireEvent, render, screen } from '@testing-library/react';
import { useChatStream } from 'state';
import { AssistantChatWidget } from './AssistantChatWidget';

jest.mock('state', () => ({ useChatStream: jest.fn() }));

const mockUseChatStream = useChatStream as jest.Mock;

function baseChatStream(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    messages: [],
    status: 'idle',
    error: null,
    sendMessage: jest.fn(),
    ...overrides,
  };
}

describe('AssistantChatWidget', () => {
  beforeEach(() => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true }) as unknown as typeof fetch;
  });

  it('renders only the floating open button initially', () => {
    mockUseChatStream.mockReturnValue(baseChatStream());
    render(<AssistantChatWidget />);

    expect(
      screen.getByLabelText('Open the QuoteFlow assistant'),
    ).toBeInTheDocument();
    expect(screen.queryByText('QuoteFlow Assistant')).not.toBeInTheDocument();
  });

  it('opens the panel and shows the empty-state prompt', () => {
    mockUseChatStream.mockReturnValue(baseChatStream());
    render(<AssistantChatWidget />);

    fireEvent.click(screen.getByLabelText('Open the QuoteFlow assistant'));

    expect(screen.getByText('QuoteFlow Assistant')).toBeInTheDocument();
    expect(
      screen.getByText(/ask me anything about your coverage/i),
    ).toBeInTheDocument();
  });

  it('submits the typed message and clears the input', () => {
    const sendMessage = jest.fn();
    mockUseChatStream.mockReturnValue(baseChatStream({ sendMessage }));
    render(<AssistantChatWidget quoteId="q1" />);
    fireEvent.click(screen.getByLabelText('Open the QuoteFlow assistant'));

    const input = screen.getByLabelText('Message the assistant');
    fireEvent.change(input, { target: { value: 'What is a deductible?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(sendMessage).toHaveBeenCalledWith('What is a deductible?');
    expect(input).toHaveValue('');
  });

  it('does not submit an empty message', () => {
    const sendMessage = jest.fn();
    mockUseChatStream.mockReturnValue(baseChatStream({ sendMessage }));
    render(<AssistantChatWidget />);
    fireEvent.click(screen.getByLabelText('Open the QuoteFlow assistant'));

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('renders user and model messages with citations', () => {
    mockUseChatStream.mockReturnValue(
      baseChatStream({
        messages: [
          { id: '1', role: 'user', text: 'What is a deductible?' },
          {
            id: '2',
            role: 'model',
            text: 'A deductible is the amount you pay out of pocket.',
            citations: [{ id: 'deductibles', title: 'How Deductibles Work' }],
          },
        ],
      }),
    );
    render(<AssistantChatWidget />);
    fireEvent.click(screen.getByLabelText('Open the QuoteFlow assistant'));

    expect(screen.getByText('What is a deductible?')).toBeInTheDocument();
    expect(
      screen.getByText('A deductible is the amount you pay out of pocket.'),
    ).toBeInTheDocument();
    expect(screen.getByText('How Deductibles Work')).toBeInTheDocument();
  });

  it('shows feedback buttons only on a non-empty model message and posts feedback on click', () => {
    mockUseChatStream.mockReturnValue(
      baseChatStream({
        messages: [{ id: '2', role: 'model', text: 'Here is your answer.' }],
      }),
    );
    render(<AssistantChatWidget quoteId="q1" />);
    fireEvent.click(screen.getByLabelText('Open the QuoteFlow assistant'));

    fireEvent.click(screen.getByLabelText('Good response'));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/assistant/feedback'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          quoteId: 'q1',
          messageText: 'Here is your answer.',
          rating: 'up',
        }),
      }),
    );
  });

  it('does not show feedback buttons for an empty (still-streaming) model message', () => {
    mockUseChatStream.mockReturnValue(
      baseChatStream({
        messages: [{ id: '2', role: 'model', text: '' }],
        status: 'streaming',
      }),
    );
    render(<AssistantChatWidget />);
    fireEvent.click(screen.getByLabelText('Open the QuoteFlow assistant'));

    expect(screen.queryByLabelText('Good response')).not.toBeInTheDocument();
  });

  it('shows an error message when the stream status is error', () => {
    mockUseChatStream.mockReturnValue(
      baseChatStream({ status: 'error', error: 'boom' }),
    );
    render(<AssistantChatWidget />);
    fireEvent.click(screen.getByLabelText('Open the QuoteFlow assistant'));

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('disables the input and send button while streaming', () => {
    mockUseChatStream.mockReturnValue(baseChatStream({ status: 'streaming' }));
    render(<AssistantChatWidget />);
    fireEvent.click(screen.getByLabelText('Open the QuoteFlow assistant'));

    expect(screen.getByLabelText('Message the assistant')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
});
