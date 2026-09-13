import { Module } from '@nestjs/common';
import { QuotesModule } from '../quotes/quotes.module.js';
import { AssistantController } from './assistant.controller.js';
import { AssistantService } from './assistant.service.js';

@Module({
  imports: [QuotesModule],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
