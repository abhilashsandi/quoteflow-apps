import { Body, Controller, Post, Res } from '@nestjs/common';
import { GET_QUOTE_SUMMARY_TOOL, type ChatMessage } from 'ai-assistant';
import type { Response } from 'express';
import { AssistantService } from './assistant.service.js';

interface ChatRequestBody {
  quoteId?: string;
  messages: ChatMessage[];
}

interface FeedbackRequestBody {
  quoteId?: string;
  messageText: string;
  rating: 'up' | 'down';
}

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  /**
   * Streams the assistant's response as SSE, one `data:` line per ChatStreamEvent
   * (citations/tool_call/tool_result/text/done/error) — the browser's useChatStream() hook
   * parses these directly, so the event shape here must stay in sync with libs/ai-assistant's
   * ChatStreamEvent union.
   */
  @Post('chat')
  async chat(
    @Body() body: ChatRequestBody,
    @Res() res: Response,
  ): Promise<void> {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const stream = this.assistant.chatService.streamChat({
      messages: body.messages,
      quoteId: body.quoteId,
      tools: [GET_QUOTE_SUMMARY_TOOL],
      executeTool: this.assistant.executeTool,
    });

    for await (const event of stream) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
    res.end();
  }

  @Post('feedback')
  async feedback(
    @Body() body: FeedbackRequestBody,
  ): Promise<{ success: true }> {
    await this.assistant.recordFeedback({
      quoteId: body.quoteId ?? null,
      messageText: body.messageText,
      rating: body.rating,
    });
    return { success: true };
  }
}
