import { create } from 'zustand';

export type ChatDisplayRole = 'user' | 'model';

export interface ChatDisplayMessage {
  id: string;
  role: ChatDisplayRole;
  text: string;
  citations?: { id: string; title: string }[];
  toolCalls?: { name: string }[];
}

export type ChatStreamStatus = 'idle' | 'streaming' | 'error';

export interface ServerChatEvent {
  type: 'citations' | 'tool_call' | 'tool_result' | 'text' | 'done' | 'error';
  docs?: { id: string; title: string }[];
  name?: string;
  text?: string;
  message?: string;
}

export interface ChatStreamData {
  messages: ChatDisplayMessage[];
  status: ChatStreamStatus;
  error: string | null;
}

export const INITIAL_CHAT_STREAM: ChatStreamData = {
  messages: [],
  status: 'idle',
  error: null,
};

export interface ChatStreamStore extends ChatStreamData {
  appendMessages: (messages: ChatDisplayMessage[]) => void;
  applyEventToMessage: (assistantId: string, event: ServerChatEvent) => void;
  setStatus: (status: ChatStreamStatus, error?: string | null) => void;
  reset: () => void;
}

/**
 * A plain module-level Zustand store, same pattern as quote-session.store.ts and for the same
 * reason: useChatStream's sendMessage needs to read the latest message list from inside a
 * long-running async function (building history, applying streamed events) without falling
 * into useState's stale-closure trap — reading the live store via `.getState()` sidesteps
 * that entirely, the same way useQuoteSession does.
 */
export const useChatStreamStore = create<ChatStreamStore>((set) => ({
  ...INITIAL_CHAT_STREAM,
  appendMessages: (messages) =>
    set((s) => ({ messages: [...s.messages, ...messages] })),
  applyEventToMessage: (assistantId, event) =>
    set((s) => ({
      messages: s.messages.map((message) => {
        if (message.id !== assistantId) return message;
        switch (event.type) {
          case 'text':
            return { ...message, text: message.text + (event.text ?? '') };
          case 'citations':
            return { ...message, citations: event.docs ?? [] };
          case 'tool_call':
            return {
              ...message,
              toolCalls: [
                ...(message.toolCalls ?? []),
                { name: event.name ?? 'unknown' },
              ],
            };
          default:
            return message;
        }
      }),
    })),
  setStatus: (status, error = null) => set({ status, error }),
  reset: () => set(INITIAL_CHAT_STREAM),
}));
