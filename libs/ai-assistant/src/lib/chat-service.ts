import type { Content, FunctionCall, Part } from '@google/genai';
import type { GeminiClient } from './gemini-client.js';
import type { KnowledgeStore } from './knowledge-store.js';
import type {
  ChatStreamEvent,
  StreamChatOptions,
  ToolDefinition,
} from './types.js';

export interface ChatServiceOptions {
  gemini: GeminiClient;
  knowledgeStore: KnowledgeStore;
  /** How many knowledge docs to retrieve and inject per turn. */
  ragTopK?: number;
}

export interface ChatService {
  streamChat(options: StreamChatOptions): AsyncGenerator<ChatStreamEvent>;
}

const BASE_SYSTEM_PREAMBLE = `You are the QuoteFlow assistant, helping a customer understand their Acme Insurance auto quote. Be concise and friendly. Only answer questions about insurance coverage, the quote process, or the customer's own quote — politely decline anything else. When you use information from a reference document below, mention which one (by title) you drew from.`;

function buildSystemInstruction(
  preamble: string,
  docs: { id: string; title: string; content: string }[],
): string {
  if (docs.length === 0) return preamble;
  const docsBlock = docs
    .map((doc) => `### ${doc.title}\n${doc.content}`)
    .join('\n\n');
  return `${preamble}\n\nReference documents:\n\n${docsBlock}`;
}

/**
 * Orchestrates one assistant turn: embed the user's latest message, retrieve the most
 * relevant coverage documents via pgvector (RAG), stream Gemini's response, and — if Gemini
 * calls a tool — run it and stream a follow-up response grounded in its result. Yields
 * ChatStreamEvents the caller (bff-gateway's SSE controller) forwards to the browser as-is.
 */
export function createChatService(options: ChatServiceOptions): ChatService {
  const ragTopK = options.ragTopK ?? 3;

  async function* streamChat(
    streamOptions: StreamChatOptions,
  ): AsyncGenerator<ChatStreamEvent> {
    try {
      const lastUserMessage = [...streamOptions.messages]
        .reverse()
        .find((m) => m.role === 'user');
      const docs = lastUserMessage
        ? await options.knowledgeStore.retrieveRelevantDocs(
            await options.gemini.embedText(
              lastUserMessage.text,
              'RETRIEVAL_QUERY',
            ),
            ragTopK,
          )
        : [];

      if (docs.length > 0) {
        yield {
          type: 'citations',
          docs: docs.map((doc) => ({ id: doc.id, title: doc.title })),
        };
      }

      const systemInstructionParts = [
        buildSystemInstruction(BASE_SYSTEM_PREAMBLE, docs),
      ];
      if (streamOptions.quoteId) {
        systemInstructionParts.push(
          `The customer's current quoteId is ${streamOptions.quoteId}.`,
        );
      }
      const systemInstruction = systemInstructionParts.join('\n\n');

      const contents: Content[] = streamOptions.messages.map((message) => ({
        role: message.role,
        parts: [{ text: message.text }],
      }));

      const functionDeclarations = streamOptions.tools?.map(
        toFunctionDeclaration,
      );

      const firstStream = await options.gemini.generateContentStream({
        contents,
        systemInstruction,
        functionDeclarations,
      });

      // Captured as whole Parts, not just the FunctionCall payload: newer Gemini models attach
      // a `thoughtSignature` to the function-call part, and echoing the model's turn back
      // without it on the follow-up request is rejected ("Function call is missing a
      // thought_signature"). Re-deriving a bare {functionCall} part loses that field.
      const pendingCallParts: Part[] = [];
      const pendingCalls: FunctionCall[] = [];
      for await (const chunk of firstStream) {
        if (chunk.text) yield { type: 'text', text: chunk.text };
        for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
          if (part.functionCall) {
            pendingCallParts.push(part);
            pendingCalls.push(part.functionCall);
          }
        }
      }

      if (pendingCalls.length > 0 && streamOptions.executeTool) {
        contents.push({ role: 'model', parts: pendingCallParts });

        const responseParts: Part[] = [];
        for (const call of pendingCalls) {
          const name = call.name ?? 'unknown_tool';
          const args = call.args ?? {};
          yield { type: 'tool_call', name, args };
          const result = await streamOptions.executeTool(name, args);
          yield { type: 'tool_result', name };
          responseParts.push({
            functionResponse: { name, response: { result } },
          });
        }
        contents.push({ role: 'user', parts: responseParts });

        const followUpStream = await options.gemini.generateContentStream({
          contents,
          systemInstruction,
        });
        for await (const chunk of followUpStream) {
          if (chunk.text) yield { type: 'text', text: chunk.text };
        }
      }

      yield { type: 'done' };
    } catch (err) {
      yield {
        type: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  return { streamChat };
}

function toFunctionDeclaration(tool: ToolDefinition) {
  return {
    name: tool.name,
    description: tool.description,
    parametersJsonSchema: tool.parametersJsonSchema,
  };
}
