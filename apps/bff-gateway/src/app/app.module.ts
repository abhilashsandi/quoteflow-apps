import { Module } from '@nestjs/common';
import { FlagsModule } from '../flags/flags.module.js';
import { HealthController } from '../health/health.controller.js';
import { QuotesModule } from '../quotes/quotes.module.js';

@Module({
  imports: [QuotesModule, FlagsModule],
  controllers: [HealthController],
})
export class AppModule {}
