import { Body, Controller, Get, Param, Patch, Post, Res } from '@nestjs/common';
import type { JsonPatchOp } from 'api-client';
import type { Response } from 'express';
import { RatingServiceClientService } from './rating-service-client.service.js';
import { unwrapResult } from './unwrap-result.js';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly ratingService: RatingServiceClientService) {}

  @Post()
  async createQuote(@Body('carrierCode') carrierCode: string) {
    return unwrapResult(
      await this.ratingService.client.createQuote(carrierCode),
    );
  }

  @Get(':quoteId/schemas')
  async getSchema(@Param('quoteId') quoteId: string) {
    return unwrapResult(
      await this.ratingService.client.getQuoteSchema(quoteId),
    );
  }

  @Patch(':quoteId')
  async patchQuote(
    @Param('quoteId') quoteId: string,
    @Body() ops: JsonPatchOp[],
  ) {
    return unwrapResult(
      await this.ratingService.client.patchQuote(quoteId, ops),
    );
  }

  @Post(':quoteId/reports')
  async pullReport(@Param('quoteId') quoteId: string) {
    return unwrapResult(await this.ratingService.client.pullReport(quoteId));
  }

  @Post(':quoteId/bind')
  async requestBind(@Param('quoteId') quoteId: string) {
    return unwrapResult(await this.ratingService.client.requestBind(quoteId));
  }

  @Get(':quoteId/bind-status')
  async getBindStatus(@Param('quoteId') quoteId: string) {
    return unwrapResult(await this.ratingService.client.getBindStatus(quoteId));
  }

  /**
   * Streams quoteflow-rating-service's SSE response straight through rather than
   * re-implementing the event bus here — the browser never talks to Repo 1 directly, so this
   * is the only way it can see live bind progress.
   */
  @Get(':quoteId/bind-events')
  async bindEvents(
    @Param('quoteId') quoteId: string,
    @Res() res: Response,
  ): Promise<void> {
    const upstream = await fetch(
      this.ratingService.client.bindEventsUrl(quoteId),
    );
    res.writeHead(upstream.status, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    if (!upstream.body) {
      res.end();
      return;
    }
    const reader = upstream.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  }
}
