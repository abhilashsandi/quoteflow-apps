'use client';

import { MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { useChatStream } from 'state';
import {
  Button,
  ChatMessageBubble,
  ChatPanelShell,
  FeedbackButtons,
  Input,
  type Feedback,
} from 'ui-components';
import { BFF_GATEWAY_URL } from '../lib/config';

export interface AssistantChatWidgetProps {
  /** Lets the assistant's get_quote_summary tool answer "how's my quote going?" without the
   * user repeating their quoteId. Omitted on pages with no quote yet. */
  quoteId?: string;
}

/**
 * A floating chat button that opens the QuoteFlow assistant — RAG-grounded coverage answers
 * plus a get_quote_summary tool call, both driven entirely by bff-gateway's
 * POST /assistant/chat SSE endpoint via useChatStream(). Everything here is composition: the
 * hook owns the network/streaming logic, ui-components owns the presentation.
 */
export function AssistantChatWidget({ quoteId }: AssistantChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [feedbackByMessageId, setFeedbackByMessageId] = useState<
    Record<string, Feedback>
  >({});
  const { messages, status, sendMessage } = useChatStream({
    bffGatewayBaseUrl: BFF_GATEWAY_URL,
    quoteId,
  });

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const text = draft;
    if (!text.trim() || status === 'streaming') return;
    setDraft('');
    void sendMessage(text);
  }

  function handleFeedback(
    messageId: string,
    messageText: string,
    value: Feedback,
  ): void {
    setFeedbackByMessageId((prev) => ({ ...prev, [messageId]: value }));
    if (!value) return;
    void fetch(`${BFF_GATEWAY_URL}/assistant/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId, messageText, rating: value }),
    });
  }

  if (!open) {
    return (
      <Button
        size="icon"
        className="fixed right-6 bottom-6 z-50 size-14 shadow-lg"
        onClick={() => setOpen(true)}
        aria-label="Open the QuoteFlow assistant"
      >
        <MessageCircle />
      </Button>
    );
  }

  return (
    <div className="fixed right-6 bottom-6 z-50 h-[32rem] w-96 max-w-[calc(100vw-3rem)]">
      <ChatPanelShell
        title="QuoteFlow Assistant"
        onClose={() => setOpen(false)}
        inputRow={
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about your coverage…"
              disabled={status === 'streaming'}
              aria-label="Message the assistant"
            />
            <Button
              type="submit"
              disabled={status === 'streaming' || !draft.trim()}
            >
              Send
            </Button>
          </form>
        }
      >
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Ask me anything about your coverage, deductibles, or how your quote
            is going.
          </p>
        ) : (
          messages.map((message) => (
            <ChatMessageBubble
              key={message.id}
              role={message.role}
              text={message.text}
              citations={message.citations}
              feedback={
                message.role === 'model' && message.text ? (
                  <FeedbackButtons
                    value={feedbackByMessageId[message.id] ?? null}
                    onChange={(value) =>
                      handleFeedback(message.id, message.text, value)
                    }
                  />
                ) : undefined
              }
            />
          ))
        )}
        {status === 'error' ? (
          <p className="text-destructive text-xs">
            Something went wrong — please try again.
          </p>
        ) : null}
      </ChatPanelShell>
    </div>
  );
}
