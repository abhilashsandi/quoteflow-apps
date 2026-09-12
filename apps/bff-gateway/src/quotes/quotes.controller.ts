import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { JsonPatchOp } from 'api-client';
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
}
