import { GoogleGenAI } from '@google/genai';
import { createGeminiClient } from './gemini-client.js';

jest.mock('@google/genai');

// eslint-disable-next-line @typescript-eslint/no-empty-function -- an empty async generator body is the point
async function* emptyStream(): AsyncGenerator<never> {}

describe('createGeminiClient', () => {
  let embedContent: jest.Mock;
  let generateContentStream: jest.Mock;

  beforeEach(() => {
    embedContent = jest.fn();
    generateContentStream = jest.fn();
    (GoogleGenAI as unknown as jest.Mock).mockImplementation(() => ({
      models: { embedContent, generateContentStream },
    }));
  });

  it('embedText requests the given task type and pinned dimensionality, returning the values', async () => {
    embedContent.mockResolvedValue({
      embeddings: [{ values: [0.1, 0.2, 0.3] }],
    });
    const client = createGeminiClient({
      apiKey: 'key',
      chatModel: 'gemini-3.6-flash',
      embeddingModel: 'text-embedding-004',
      embeddingDimensions: 768,
    });

    const values = await client.embedText('hello', 'RETRIEVAL_QUERY');

    expect(values).toEqual([0.1, 0.2, 0.3]);
    expect(embedContent).toHaveBeenCalledWith({
      model: 'text-embedding-004',
      contents: 'hello',
      config: { taskType: 'RETRIEVAL_QUERY', outputDimensionality: 768 },
    });
  });

  it('embedText throws when Gemini returns no embedding values', async () => {
    embedContent.mockResolvedValue({ embeddings: [] });
    const client = createGeminiClient({
      apiKey: 'key',
      chatModel: 'gemini-3.6-flash',
      embeddingModel: 'text-embedding-004',
      embeddingDimensions: 768,
    });

    await expect(client.embedText('hello', 'RETRIEVAL_QUERY')).rejects.toThrow(
      /no embedding values/i,
    );
  });

  it('generateContentStream passes contents, systemInstruction, and wrapped tool declarations', async () => {
    generateContentStream.mockResolvedValue(emptyStream());
    const client = createGeminiClient({
      apiKey: 'key',
      chatModel: 'gemini-3.6-flash',
      embeddingModel: 'text-embedding-004',
      embeddingDimensions: 768,
    });

    const contents = [{ role: 'user' as const, parts: [{ text: 'hi' }] }];
    await client.generateContentStream({
      contents,
      systemInstruction: 'be nice',
      functionDeclarations: [{ name: 'do_thing' }],
    });

    expect(generateContentStream).toHaveBeenCalledWith({
      model: 'gemini-3.6-flash',
      contents,
      config: {
        systemInstruction: 'be nice',
        tools: [{ functionDeclarations: [{ name: 'do_thing' }] }],
      },
    });
  });

  it('generateContentStream omits tools entirely when no function declarations are given', async () => {
    generateContentStream.mockResolvedValue(emptyStream());
    const client = createGeminiClient({
      apiKey: 'key',
      chatModel: 'gemini-3.6-flash',
      embeddingModel: 'text-embedding-004',
      embeddingDimensions: 768,
    });

    await client.generateContentStream({ contents: [] });

    expect(generateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ tools: undefined }),
      }),
    );
  });
});
