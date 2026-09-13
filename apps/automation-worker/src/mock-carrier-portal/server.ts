import { env } from '../env.js';
import { logger } from '../logger.js';
import { createMockCarrierPortalApp } from './app.js';

const app = createMockCarrierPortalApp({
  failureRate: env.MOCK_PORTAL_FAILURE_RATE,
});

app.listen(env.MOCK_CARRIER_PORTAL_PORT, () => {
  logger.info(
    `Mock Acme carrier portal listening on :${env.MOCK_CARRIER_PORTAL_PORT}`,
  );
});
