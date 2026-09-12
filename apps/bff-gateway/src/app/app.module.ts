import { Module } from '@nestjs/common';
import { HealthController } from '../health/health.controller.js';
import { QuotesModule } from '../quotes/quotes.module.js';

@Module({
  imports: [QuotesModule],
  controllers: [HealthController],
})
export class AppModule {}
