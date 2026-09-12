import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  RATING_SERVICE_URL: z
    .string({
      error: 'RATING_SERVICE_URL is required (e.g. http://localhost:4000)',
    })
    .min(1, 'RATING_SERVICE_URL must not be empty'),
  PORT: z.coerce.number().int().positive().default(4100),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:3001')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    // Fail fast and loud, same convention as quoteflow-rating-service: never silently proxy
    // to a default rating-service URL.
    console.error(
      `Invalid or missing environment configuration:\n${issues}\n\nSee .env.example for the required variables.`,
    );
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
