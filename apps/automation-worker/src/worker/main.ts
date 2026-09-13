import { env } from '../env.js';
import { logger } from '../logger.js';
import { createBindJobHandler } from './bind-job-handler.js';
import { createRabbitMQClient } from './rabbitmq-client.js';
import { createRatingServiceCallback } from './rating-service-callback.js';

async function main(): Promise<void> {
  const rabbitMQ = createRabbitMQClient({
    url: env.RABBITMQ_URL,
    maxRetries: env.MAX_RETRIES,
  });
  const ratingService = createRatingServiceCallback(env.RATING_SERVICE_URL);

  await rabbitMQ.connect();
  logger.info('Connected to RabbitMQ, consuming carrier.bind.requested');

  const handleBindJob = createBindJobHandler({
    ratingService,
    mockCarrierPortalUrl: env.MOCK_CARRIER_PORTAL_URL,
    headless: env.BROWSER_HEADLESS,
    simulatedFailureRate: env.SIMULATED_FAILURE_RATE,
  });
  await rabbitMQ.consume(handleBindJob);

  const dlqCheckInterval = setInterval(() => {
    void rabbitMQ.checkDlqDepth().then((depth) => {
      if (depth > 0) logger.warn('DLQ has messages', { depth });
    });
  }, 60_000);

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down`);
    clearInterval(dlqCheckInterval);
    await rabbitMQ.disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  logger.error('Worker failed to start', {
    message: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
