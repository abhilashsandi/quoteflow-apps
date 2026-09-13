import { useChatStreamStore } from './chat-stream.store.js';

describe('useChatStreamStore', () => {
  beforeEach(() => useChatStreamStore.getState().reset());

  it('starts empty and idle', () => {
    const state = useChatStreamStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.status).toBe('idle');
  });

  it('appendMessages adds to the end without touching existing messages', () => {
    useChatStreamStore
      .getState()
      .appendMessages([{ id: 'a', role: 'user', text: 'hi' }]);
    useChatStreamStore
      .getState()
      .appendMessages([{ id: 'b', role: 'model', text: '' }]);

    expect(useChatStreamStore.getState().messages).toEqual([
      { id: 'a', role: 'user', text: 'hi' },
      { id: 'b', role: 'model', text: '' },
    ]);
  });

  it('applyEventToMessage only updates the message with the matching id', () => {
    useChatStreamStore.getState().appendMessages([
      { id: 'a', role: 'user', text: 'hi' },
      { id: 'b', role: 'model', text: '' },
    ]);

    useChatStreamStore
      .getState()
      .applyEventToMessage('b', { type: 'text', text: 'Hello' });

    expect(useChatStreamStore.getState().messages).toEqual([
      { id: 'a', role: 'user', text: 'hi' },
      { id: 'b', role: 'model', text: 'Hello' },
    ]);
  });

  it('applyEventToMessage accumulates text across multiple events', () => {
    useChatStreamStore
      .getState()
      .appendMessages([{ id: 'a', role: 'model', text: '' }]);
    useChatStreamStore
      .getState()
      .applyEventToMessage('a', { type: 'text', text: 'Hello ' });
    useChatStreamStore
      .getState()
      .applyEventToMessage('a', { type: 'text', text: 'there!' });

    expect(useChatStreamStore.getState().messages[0].text).toBe('Hello there!');
  });

  it('applyEventToMessage sets citations from a citations event', () => {
    useChatStreamStore
      .getState()
      .appendMessages([{ id: 'a', role: 'model', text: '' }]);
    useChatStreamStore
      .getState()
      .applyEventToMessage('a', {
        type: 'citations',
        docs: [{ id: 'd1', title: 'Deductibles' }],
      });

    expect(useChatStreamStore.getState().messages[0].citations).toEqual([
      { id: 'd1', title: 'Deductibles' },
    ]);
  });

  it('applyEventToMessage appends tool calls rather than replacing them', () => {
    useChatStreamStore
      .getState()
      .appendMessages([{ id: 'a', role: 'model', text: '' }]);
    useChatStreamStore
      .getState()
      .applyEventToMessage('a', { type: 'tool_call', name: 'tool_one' });
    useChatStreamStore
      .getState()
      .applyEventToMessage('a', { type: 'tool_call', name: 'tool_two' });

    expect(useChatStreamStore.getState().messages[0].toolCalls).toEqual([
      { name: 'tool_one' },
      { name: 'tool_two' },
    ]);
  });

  it('setStatus clears the error when moving to a non-error status', () => {
    useChatStreamStore.getState().setStatus('error', 'boom');
    expect(useChatStreamStore.getState().error).toBe('boom');
    useChatStreamStore.getState().setStatus('idle');
    expect(useChatStreamStore.getState().error).toBeNull();
  });

  it('reset clears messages back to empty', () => {
    useChatStreamStore
      .getState()
      .appendMessages([{ id: 'a', role: 'user', text: 'hi' }]);
    useChatStreamStore.getState().reset();
    expect(useChatStreamStore.getState().messages).toEqual([]);
  });
});
