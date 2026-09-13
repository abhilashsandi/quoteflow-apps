import { createChatService } from './chat-service.js';
import type { GeminiClient } from './gemini-client.js';
import type { KnowledgeStore } from './knowledge-store.js';
import type { ChatStreamEvent } from './types.js';

interface ChunkPart {
  functionCall?: { name: string; args: Record<string, unknown> };
  thoughtSignature?: string;
}

interface Chunk {
  text?: string;
  candidates?: { content: { parts: ChunkPart[] } }[];
}

function streamOf(chunks: Chunk[]): AsyncGenerator<Chunk> {
  return (async function* () {
    for (const chunk of chunks) yield chunk;
  })();
}

/** A chunk carrying one function call — shaped as a real GenerateContentResponse would be
 * (candidates[0].content.parts), including the thoughtSignature Gemini attaches and requires
 * to be echoed back on the follow-up request. */
function functionCallChunk(
  name: string,
  args: Record<string, unknown>,
  thoughtSignature = 'sig-1',
): Chunk {
  return {
    candidates: [
      {
        content: {
          parts: [{ functionCall: { name, args }, thoughtSignature }],
        },
      },
    ],
  };
}

function fakeGemini(overrides: Partial<GeminiClient> = {}): GeminiClient {
  return {
    embedText: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    generateContentStream: jest.fn().mockResolvedValue(streamOf([])),
    ...overrides,
  };
}

function fakeKnowledgeStore(
  overrides: Partial<KnowledgeStore> = {},
): KnowledgeStore {
  return {
    ensureSchema: jest.fn(),
    upsertDoc: jest.fn(),
    retrieveRelevantDocs: jest.fn().mockResolvedValue([]),
    recordFeedback: jest.fn(),
    close: jest.fn(),
    ...overrides,
  } as KnowledgeStore;
}

async function collect(
  gen: AsyncGenerator<ChatStreamEvent>,
): Promise<ChatStreamEvent[]> {
  const events: ChatStreamEvent[] = [];
  for await (const event of gen) events.push(event);
  return events;
}

describe('createChatService', () => {
  it('embeds the last user message with RETRIEVAL_QUERY and yields citations before text', async () => {
    const gemini = fakeGemini({
      generateContentStream: jest
        .fn()
        .mockResolvedValue(streamOf([{ text: 'Hello ' }, { text: 'there!' }])),
    });
    const knowledgeStore = fakeKnowledgeStore({
      retrieveRelevantDocs: jest
        .fn()
        .mockResolvedValue([
          {
            id: 'doc-1',
            title: 'Deductibles',
            content: '...',
            similarity: 0.9,
          },
        ]),
    });
    const service = createChatService({ gemini, knowledgeStore });

    const events = await collect(
      service.streamChat({
        messages: [{ role: 'user', text: 'What is a deductible?' }],
      }),
    );

    expect(gemini.embedText).toHaveBeenCalledWith(
      'What is a deductible?',
      'RETRIEVAL_QUERY',
    );
    expect(events[0]).toEqual({
      type: 'citations',
      docs: [{ id: 'doc-1', title: 'Deductibles' }],
    });
    expect(events).toContainEqual({ type: 'text', text: 'Hello ' });
    expect(events).toContainEqual({ type: 'text', text: 'there!' });
    expect(events[events.length - 1]).toEqual({ type: 'done' });
  });

  it('skips the citations event when no relevant docs are found', async () => {
    const gemini = fakeGemini({
      generateContentStream: jest
        .fn()
        .mockResolvedValue(streamOf([{ text: 'Hi' }])),
    });
    const knowledgeStore = fakeKnowledgeStore();
    const service = createChatService({ gemini, knowledgeStore });

    const events = await collect(
      service.streamChat({ messages: [{ role: 'user', text: 'hi' }] }),
    );

    expect(events.some((e) => e.type === 'citations')).toBe(false);
  });

  it('runs a tool call round trip: calls executeTool and streams the follow-up response', async () => {
    const firstStream = streamOf([
      functionCallChunk('get_quote_summary', { quoteId: 'q1' }),
    ]);
    const followUpStream = streamOf([{ text: 'Your premium is $600/mo.' }]);
    const generateContentStream = jest
      .fn()
      .mockResolvedValueOnce(firstStream)
      .mockResolvedValueOnce(followUpStream);
    const gemini = fakeGemini({ generateContentStream });
    const knowledgeStore = fakeKnowledgeStore();
    const executeTool = jest.fn().mockResolvedValue({ premium: 600 });
    const service = createChatService({ gemini, knowledgeStore });

    const events = await collect(
      service.streamChat({
        messages: [{ role: 'user', text: 'How much is my quote?' }],
        tools: [
          {
            name: 'get_quote_summary',
            description: 'x',
            parametersJsonSchema: {},
          },
        ],
        executeTool,
      }),
    );

    expect(executeTool).toHaveBeenCalledWith('get_quote_summary', {
      quoteId: 'q1',
    });
    expect(events).toContainEqual({
      type: 'tool_call',
      name: 'get_quote_summary',
      args: { quoteId: 'q1' },
    });
    expect(events).toContainEqual({
      type: 'tool_result',
      name: 'get_quote_summary',
    });
    expect(events).toContainEqual({
      type: 'text',
      text: 'Your premium is $600/mo.',
    });
    expect(generateContentStream).toHaveBeenCalledTimes(2);

    const secondCallArgs = generateContentStream.mock.calls[1][0];
    expect(secondCallArgs.contents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'model',
          parts: [
            expect.objectContaining({
              functionCall: {
                name: 'get_quote_summary',
                args: { quoteId: 'q1' },
              },
              thoughtSignature: 'sig-1',
            }),
          ],
        }),
        expect.objectContaining({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: 'get_quote_summary',
                response: { result: { premium: 600 } },
              },
            },
          ],
        }),
      ]),
    );
  });

  it('does not attempt a tool call round trip when no executeTool is provided', async () => {
    const generateContentStream = jest
      .fn()
      .mockResolvedValue(
        streamOf([functionCallChunk('get_quote_summary', {})]),
      );
    const gemini = fakeGemini({ generateContentStream });
    const service = createChatService({
      gemini,
      knowledgeStore: fakeKnowledgeStore(),
    });

    const events = await collect(
      service.streamChat({ messages: [{ role: 'user', text: 'hi' }] }),
    );

    expect(generateContentStream).toHaveBeenCalledTimes(1);
    expect(events.some((e) => e.type === 'tool_call')).toBe(false);
    expect(events[events.length - 1]).toEqual({ type: 'done' });
  });

  it('yields an error event instead of throwing when Gemini fails', async () => {
    const gemini = fakeGemini({
      generateContentStream: jest
        .fn()
        .mockRejectedValue(new Error('quota exceeded')),
    });
    const service = createChatService({
      gemini,
      knowledgeStore: fakeKnowledgeStore(),
    });

    const events = await collect(
      service.streamChat({ messages: [{ role: 'user', text: 'hi' }] }),
    );

    expect(events).toEqual([{ type: 'error', message: 'quota exceeded' }]);
  });
});
