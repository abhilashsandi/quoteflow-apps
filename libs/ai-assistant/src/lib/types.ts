export type ChatRole = 'user' | 'model';

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
}

export interface RetrievedDoc extends KnowledgeDoc {
  /** Cosine similarity to the query embedding, 1 (identical) to -1 (opposite). */
  similarity: number;
}

/** A tool's JSON-Schema-shaped declaration — passed to Gemini as-is via
 * FunctionDeclaration.parametersJsonSchema, and to executeTool as the args' shape. */
export interface ToolDefinition {
  name: string;
  description: string;
  parametersJsonSchema: Record<string, unknown>;
}

/**
 * Actually runs a tool call and returns its result (as a JSON-serializable value fed back to
 * Gemini as a FunctionResponse). Left for the caller to provide — this lib deliberately has no
 * knowledge of bff-gateway's quote service, only of the tool contract.
 */
export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>,
) => Promise<unknown>;

export type ChatStreamEvent =
  | { type: 'citations'; docs: { id: string; title: string }[] }
  | { type: 'tool_call'; name: string; args: Record<string, unknown> }
  | { type: 'tool_result'; name: string }
  | { type: 'text'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export interface StreamChatOptions {
  messages: ChatMessage[];
  /** Present when the assistant is opened from a quote in progress — makes get_quote_summary
   * usable without the user having to repeat their quoteId in the chat. */
  quoteId?: string;
  tools?: ToolDefinition[];
  executeTool?: ToolExecutor;
}
