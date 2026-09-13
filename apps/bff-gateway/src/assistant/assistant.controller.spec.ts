import { Test } from '@nestjs/testing';
import type { ChatStreamEvent } from 'ai-assistant';
import type { Response } from 'express';
import { AssistantController } from './assistant.controller.js';
import { AssistantService } from './assistant.service.js';

function fakeResponse(): Response {
  return {
    writeHead: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
  } as unknown as Response;
}

async function* streamOf(
  events: ChatStreamEvent[],
): AsyncGenerator<ChatStreamEvent> {
  for (const event of events) yield event;
}

describe('AssistantController', () => {
  let controller: AssistantController;
  let streamChat: jest.Mock;
  let executeTool: jest.Mock;

  beforeEach(async () => {
    streamChat = jest.fn();
    executeTool = jest.fn();
    const moduleRef = await Test.createTestingModule({
      controllers: [AssistantController],
      providers: [
        {
          provide: AssistantService,
          useValue: {
            chatService: { streamChat },
            executeTool,
            recordFeedback: jest.fn(),
          },
        },
      ],
    }).compile();
    controller = moduleRef.get(AssistantController);
  });

  it('writes SSE headers and one data: line per streamed event', async () => {
    streamChat.mockReturnValue(
      streamOf([{ type: 'text', text: 'Hi' }, { type: 'done' }]),
    );
    const res = fakeResponse();

    await controller.chat({ messages: [{ role: 'user', text: 'hello' }] }, res);

    expect(res.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ 'Content-Type': 'text/event-stream' }),
    );
    expect(res.write).toHaveBeenNthCalledWith(
      1,
      `data: ${JSON.stringify({ type: 'text', text: 'Hi' })}\n\n`,
    );
    expect(res.write).toHaveBeenNthCalledWith(
      2,
      `data: ${JSON.stringify({ type: 'done' })}\n\n`,
    );
    expect(res.end).toHaveBeenCalled();
  });

  it('passes messages, quoteId, the get_quote_summary tool, and the executor through to streamChat', async () => {
    streamChat.mockReturnValue(streamOf([]));
    const res = fakeResponse();

    await controller.chat(
      { quoteId: 'q1', messages: [{ role: 'user', text: 'hi' }] },
      res,
    );

    expect(streamChat).toHaveBeenCalledWith(
      expect.objectContaining({
        quoteId: 'q1',
        messages: [{ role: 'user', text: 'hi' }],
        executeTool,
        tools: [expect.objectContaining({ name: 'get_quote_summary' })],
      }),
    );
  });

  it('feedback forwards to AssistantService.recordFeedback and defaults a missing quoteId to null', async () => {
    const recordFeedback = jest.fn().mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      controllers: [AssistantController],
      providers: [{ provide: AssistantService, useValue: { recordFeedback } }],
    }).compile();
    const feedbackController = moduleRef.get(AssistantController);

    const result = await feedbackController.feedback({
      messageText: 'thanks',
      rating: 'up',
    });

    expect(recordFeedback).toHaveBeenCalledWith({
      quoteId: null,
      messageText: 'thanks',
      rating: 'up',
    });
    expect(result).toEqual({ success: true });
  });
});
