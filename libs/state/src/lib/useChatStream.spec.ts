import { act, renderHook } from '@testing-library/react';
import { useChatStreamStore } from './chat-stream.store.js';
import { useChatStream } from './useChatStream.js';

const BASE_URL = 'http://localhost:4100';

function sseBody(frames: string[]): {
  getReader: () => ReadableStreamDefaultReader<Uint8Array>;
} {
  let index = 0;
  return {
    getReader: () =>
      ({
        read: async () => {
          if (index >= frames.length) return { done: true, value: undefined };
          const value = Buffer.from(frames[index], 'utf-8');
          index += 1;
          return { done: false, value };
        },
        releaseLock: () => undefined,
      }) as unknown as ReadableStreamDefaultReader<Uint8Array>,
  };
}

function mockSseFetch(frames: string[], ok = true, status = 200): jest.Mock {
  const mockFetch = jest
    .fn()
    .mockResolvedValue({ ok, status, body: sseBody(frames) });
  global.fetch = mockFetch as unknown as typeof fetch;
  return mockFetch;
}

describe('useChatStream', () => {
  beforeEach(() => useChatStreamStore.getState().reset());

  it('appends a user message and an empty model placeholder immediately', async () => {
    mockSseFetch([`data: ${JSON.stringify({ type: 'done' })}\n\n`]);
    const { result } = renderHook(() =>
      useChatStream({ bffGatewayBaseUrl: BASE_URL }),
    );

    await act(() => result.current.sendMessage('hi'));

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toMatchObject({
      role: 'user',
      text: 'hi',
    });
    expect(result.current.messages[1]).toMatchObject({
      role: 'model',
      text: '',
    });
  });

  it('appends streamed text chunks onto the model message', async () => {
    mockSseFetch([
      `data: ${JSON.stringify({ type: 'text', text: 'Hello ' })}\n\n`,
      `data: ${JSON.stringify({ type: 'text', text: 'there!' })}\n\n`,
      `data: ${JSON.stringify({ type: 'done' })}\n\n`,
    ]);
    const { result } = renderHook(() =>
      useChatStream({ bffGatewayBaseUrl: BASE_URL }),
    );

    await act(() => result.current.sendMessage('hi'));

    expect(result.current.status).toBe('idle');
    expect(result.current.messages[1].text).toBe('Hello there!');
  });

  it('attaches citations to the model message', async () => {
    mockSseFetch([
      `data: ${JSON.stringify({ type: 'citations', docs: [{ id: 'd1', title: 'Deductibles' }] })}\n\n`,
      `data: ${JSON.stringify({ type: 'text', text: 'A deductible is...' })}\n\n`,
      `data: ${JSON.stringify({ type: 'done' })}\n\n`,
    ]);
    const { result } = renderHook(() =>
      useChatStream({ bffGatewayBaseUrl: BASE_URL }),
    );

    await act(() => result.current.sendMessage('What is a deductible?'));

    expect(result.current.status).toBe('idle');
    expect(result.current.messages[1].citations).toEqual([
      { id: 'd1', title: 'Deductibles' },
    ]);
  });

  it('records a tool_call event on the model message', async () => {
    mockSseFetch([
      `data: ${JSON.stringify({ type: 'tool_call', name: 'get_quote_summary', args: {} })}\n\n`,
      `data: ${JSON.stringify({ type: 'tool_result', name: 'get_quote_summary' })}\n\n`,
      `data: ${JSON.stringify({ type: 'text', text: "You're at the driving-record step." })}\n\n`,
      `data: ${JSON.stringify({ type: 'done' })}\n\n`,
    ]);
    const { result } = renderHook(() =>
      useChatStream({ bffGatewayBaseUrl: BASE_URL, quoteId: 'q1' }),
    );

    await act(() => result.current.sendMessage('How is my quote going?'));

    expect(result.current.status).toBe('idle');
    expect(result.current.messages[1].toolCalls).toEqual([
      { name: 'get_quote_summary' },
    ]);
  });

  it('sends quoteId and the running message history in the request body', async () => {
    const mockFetch = mockSseFetch([
      `data: ${JSON.stringify({ type: 'done' })}\n\n`,
    ]);
    const { result } = renderHook(() =>
      useChatStream({ bffGatewayBaseUrl: BASE_URL, quoteId: 'q1' }),
    );

    await act(() => result.current.sendMessage('hi'));

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/assistant/chat`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          quoteId: 'q1',
          messages: [{ role: 'user', text: 'hi' }],
        }),
      }),
    );
  });

  it('sets an error status when the server sends an error event', async () => {
    mockSseFetch([
      `data: ${JSON.stringify({ type: 'error', message: 'quota exceeded' })}\n\n`,
    ]);
    const { result } = renderHook(() =>
      useChatStream({ bffGatewayBaseUrl: BASE_URL }),
    );

    await act(() => result.current.sendMessage('hi'));

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('quota exceeded');
  });

  it('sets an error status when the HTTP response itself is not ok', async () => {
    mockSseFetch([], false, 500);
    const { result } = renderHook(() =>
      useChatStream({ bffGatewayBaseUrl: BASE_URL }),
    );

    await act(() => result.current.sendMessage('hi'));

    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/500/);
  });

  it('ignores an empty or whitespace-only message', async () => {
    const mockFetch = mockSseFetch([]);
    const { result } = renderHook(() =>
      useChatStream({ bffGatewayBaseUrl: BASE_URL }),
    );

    await act(() => result.current.sendMessage('   '));

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(0);
  });
});
