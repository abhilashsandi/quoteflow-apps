import { Module } from '@nestjs/common';
import { AssistantModule } from '../assistant/assistant.module.js';
import { FlagsModule } from '../flags/flags.module.js';
import { HealthController } from '../health/health.controller.js';
import { QuotesModule } from '../quotes/quotes.module.js';

@Module({
  imports: [QuotesModule, FlagsModule, AssistantModule],
  controllers: [HealthController],
})
export class AppModule {}
