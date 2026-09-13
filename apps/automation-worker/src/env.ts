import 'dotenv/config';
import { z } from 'zod';

function booleanFromString(defaultValue: 'true' | 'false') {
  return z
    .string()
    .default(defaultValue)
    .transform((value) => value !== 'false');
}

const envSchema = z.object({
  RABBITMQ_URL: z
    .string({
      error:
        'RABBITMQ_URL is required (e.g. amqp://guest:guest@localhost:5672)',
    })
    .min(1, 'RABBITMQ_URL must not be empty'),
  /** quoteflow-rating-service's own origin — this worker's only way back is the
   * server-to-server PATCH /internal/carrier-jobs/:jobId route (never a browser call). */
  RATING_SERVICE_URL: z
    .string({
      error: 'RATING_SERVICE_URL is required (e.g. http://localhost:4000)',
    })
    .min(1, 'RATING_SERVICE_URL must not be empty'),
  /** Where the Playwright automation navigates to. */
  MOCK_CARRIER_PORTAL_URL: z.string().default('http://localhost:4200'),
  /** Where the mock carrier portal's own Express server listens. */
  MOCK_CARRIER_PORTAL_PORT: z.coerce.number().int().positive().default(4200),
  BROWSER_HEADLESS: booleanFromString('true'),
  MAX_RETRIES: z.coerce.number().int().min(0).default(3),
  /** Fails a job before the Playwright automation even runs — lets a demo force the
   * retry/DLQ path deterministically instead of waiting on the mock portal's own random
   * failure rate below. 0 disables it. */
  SIMULATED_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0),
  /** The mock carrier portal's own simulated failure rate on /bind-form submissions —
   * models a real carrier system being flaky, independent of anything the worker does. */
  MOCK_PORTAL_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0.1),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(
      `Invalid or missing environment configuration:\n${issues}\n\nSee .env.example for the required variables.`,
    );
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
