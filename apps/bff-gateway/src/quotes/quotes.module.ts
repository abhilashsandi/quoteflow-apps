import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller.js';
import { RatingServiceClientService } from './rating-service-client.service.js';

@Module({
  controllers: [QuotesController],
  providers: [RatingServiceClientService],
  exports: [RatingServiceClientService],
})
export class QuotesModule {}
