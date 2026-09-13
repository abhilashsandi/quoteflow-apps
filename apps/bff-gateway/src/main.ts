import './telemetry/otel.js';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module.js';
import { env } from './env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: env.CORS_ORIGINS });
  await app.listen(env.PORT);
  Logger.log(`bff-gateway listening on :${env.PORT}`);
}

bootstrap();
