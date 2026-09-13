'use client';

import { useCallback } from 'react';
import {
  useChatStreamStore,
  type ChatDisplayMessage,
  type ServerChatEvent,
} from './chat-stream.store.js';

export interface UseChatStreamOptions {
  /** bff-gateway's origin — the browser talks to bff-gateway, never the assistant's Gemini
   * client or pgvector store directly. */
  bffGatewayBaseUrl: string;
  /** Lets the assistant's get_quote_summary tool work without the user repeating their
   * quoteId in the chat. */
  quoteId?: string;
}

export interface UseChatStreamResult {
  messages: ChatDisplayMessage[];
  status: 'idle' | 'streaming' | 'error';
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Parses bff-gateway's `POST /assistant/chat` SSE stream and exposes it as a plain
 * message-list + status, the way useQuoteSession exposes the quote lifecycle — backed by the
 * same kind of module-level Zustand store, for the same reason (see chat-stream.store.ts).
 * Reads the response body directly with the Fetch streaming API rather than EventSource,
 * since EventSource can't send a POST body (the conversation history) with the request.
 */
export function useChatStream({
  bffGatewayBaseUrl,
  quoteId,
}: UseChatStreamOptions): UseChatStreamResult {
  const store = useChatStreamStore();

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMessage: ChatDisplayMessage = {
        id: newId(),
        role: 'user',
        text: trimmed,
      };
      const assistantId = newId();
      const history = [
        ...useChatStreamStore.getState().messages,
        userMessage,
      ].map((m) => ({
        role: m.role,
        text: m.text,
      }));

      useChatStreamStore
        .getState()
        .appendMessages([
          userMessage,
          { id: assistantId, role: 'model', text: '' },
        ]);
      useChatStreamStore.getState().setStatus('streaming');

      try {
        const res = await fetch(`${bffGatewayBaseUrl}/assistant/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quoteId, messages: history }),
        });
        if (!res.ok || !res.body) {
          throw new Error(`Assistant request failed: HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';
          for (const frame of frames) {
            const line = frame.split('\n').find((l) => l.startsWith('data: '));
            if (!line) continue;
            const event = JSON.parse(
              line.slice('data: '.length),
            ) as ServerChatEvent;
            if (event.type === 'error')
              throw new Error(event.message ?? 'The assistant hit an error');
            useChatStreamStore
              .getState()
              .applyEventToMessage(assistantId, event);
          }
        }

        useChatStreamStore.getState().setStatus('idle');
      } catch (err) {
        useChatStreamStore
          .getState()
          .setStatus(
            'error',
            err instanceof Error ? err.message : 'Unknown error',
          );
      }
    },
    [bffGatewayBaseUrl, quoteId],
  );

  return {
    messages: store.messages,
    status: store.status,
    error: store.error,
    sendMessage,
  };
}
