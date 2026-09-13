import { env } from '../env.js';
import { logger } from '../logger.js';
import { createMockCarrierApiApp } from './app.js';

const app = createMockCarrierApiApp({
  apiKey: env.MOCK_CARRIER_API_KEY,
  failureRate: env.MOCK_CARRIER_API_FAILURE_RATE,
});

app.listen(env.MOCK_CARRIER_API_PORT, () => {
  logger.info(
    `Mock Vantage Direct API listening on :${env.MOCK_CARRIER_API_PORT}`,
  );
});
