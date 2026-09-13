import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  createChatService,
  createGeminiClient,
  createKnowledgeStore,
  GET_QUOTE_SUMMARY_TOOL,
  type ChatService,
  type ToolExecutor,
} from 'ai-assistant';
import { env } from '../env.js';
import { RatingServiceClientService } from '../quotes/rating-service-client.service.js';

@Injectable()
export class AssistantService implements OnModuleInit {
  private readonly gemini = createGeminiClient({
    apiKey: env.GEMINI_API_KEY,
    chatModel: env.GEMINI_CHAT_MODEL,
    embeddingModel: env.GEMINI_EMBEDDING_MODEL,
    embeddingDimensions: env.GEMINI_EMBEDDING_DIMENSIONS,
  });

  private readonly knowledgeStore = createKnowledgeStore({
    connectionString: env.ASSISTANT_DATABASE_URL,
    embeddingDimensions: env.GEMINI_EMBEDDING_DIMENSIONS,
  });

  readonly chatService: ChatService = createChatService({
    gemini: this.gemini,
    knowledgeStore: this.knowledgeStore,
    ragTopK: env.ASSISTANT_RAG_TOP_K,
  });

  constructor(private readonly ratingService: RatingServiceClientService) {}

  async onModuleInit(): Promise<void> {
    await this.knowledgeStore.ensureSchema();
  }

  /**
   * The only tool the assistant can call. Returns the quote's live funnel stage and saved
   * answers from quoteflow-rating-service — not the premium, which this sample never persists
   * standalone (it's recomputed fresh on each patch/report call, never stored on the quote).
   */
  readonly executeTool: ToolExecutor = async (name, args) => {
    if (name !== GET_QUOTE_SUMMARY_TOOL.name) {
      throw new Error(`Unknown tool: ${name}`);
    }
    const quoteId = args['quoteId'];
    if (typeof quoteId !== 'string' || !quoteId) {
      throw new Error('get_quote_summary requires a quoteId argument');
    }

    const result = await this.ratingService.client.getQuoteSchema(quoteId);
    if (!result.success) {
      throw new Error(`Could not load quote ${quoteId}: ${result.error.code}`);
    }
    return {
      quoteId: result.data.quoteId,
      funnelStage: result.data.funnelStage,
      carrier: result.data.carrier.name,
      answers: result.data.answers,
    };
  };

  recordFeedback(feedback: {
    quoteId: string | null;
    messageText: string;
    rating: 'up' | 'down';
  }): Promise<void> {
    return this.knowledgeStore.recordFeedback(feedback);
  }
}
