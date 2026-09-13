import {
  GoogleGenAI,
  type Content,
  type FunctionDeclaration,
  type GenerateContentResponse,
} from '@google/genai';

export interface GeminiClientOptions {
  apiKey: string;
  chatModel: string;
  embeddingModel: string;
  /** Pinned rather than left to the model's default so the pgvector column's dimension is a
   * fixed, known value (see knowledge-store.ts's schema). */
  embeddingDimensions: number;
}

export interface GenerateChatStreamOptions {
  contents: Content[];
  systemInstruction?: string;
  functionDeclarations?: FunctionDeclaration[];
}

export interface GeminiClient {
  /** RETRIEVAL_QUERY for a user's chat message, RETRIEVAL_DOCUMENT for text being indexed —
   * Gemini's embedding model produces different (better-matching) vectors for each, so
   * getting this right on both sides of the seed/query split matters for retrieval quality. */
  embedText(
    text: string,
    taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT',
  ): Promise<number[]>;
  generateContentStream(
    options: GenerateChatStreamOptions,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;
}

export function createGeminiClient(options: GeminiClientOptions): GeminiClient {
  const ai = new GoogleGenAI({ apiKey: options.apiKey });

  async function embedText(
    text: string,
    taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT',
  ): Promise<number[]> {
    const response = await ai.models.embedContent({
      model: options.embeddingModel,
      contents: text,
      config: { taskType, outputDimensionality: options.embeddingDimensions },
    });
    const values = response.embeddings?.[0]?.values;
    if (!values) throw new Error('Gemini returned no embedding values');
    return values;
  }

  async function generateContentStream(
    streamOptions: GenerateChatStreamOptions,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    return ai.models.generateContentStream({
      model: options.chatModel,
      contents: streamOptions.contents,
      config: {
        systemInstruction: streamOptions.systemInstruction,
        tools: streamOptions.functionDeclarations?.length
          ? [{ functionDeclarations: streamOptions.functionDeclarations }]
          : undefined,
      },
    });
  }

  return { embedText, generateContentStream };
}
