import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  RATING_SERVICE_URL: z
    .string({
      error: 'RATING_SERVICE_URL is required (e.g. http://localhost:4000)',
    })
    .min(1, 'RATING_SERVICE_URL must not be empty'),
  PORT: z.coerce.number().int().positive().default(4100),
  /** Sent as the Origin header on every call to quoteflow-rating-service — see
   * RatingServiceClientService for why (Node's fetch never sends one, and Repo 1's CORS
   * policy on /quotes deliberately requires one). Must be in Repo 1's own CORS_ORIGINS. */
  SELF_ORIGIN: z.string().default('http://localhost:4100'),
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
  /** Path (relative to the Nx workspace root — where `nx run bff-gateway:serve` runs from,
   * regardless of which app it's serving) to the JSON file the local feature-flag provider
   * reads at startup. See libs/feature-flags's README for the LaunchDarkly-shaped provider
   * this would swap to in a real deployment. */
  FEATURE_FLAGS_FILE: z.string().default('apps/bff-gateway/flags.local.json'),
  /** The user supplies this themselves (never committed, never read by an agent) — see
   * .env.example. Same @google/genai + model as the ai-chat reference project this pattern is
   * mirrored from. */
  GEMINI_API_KEY: z
    .string({
      error: 'GEMINI_API_KEY is required — copy it into apps/bff-gateway/.env',
    })
    .min(1, 'GEMINI_API_KEY must not be empty'),
  GEMINI_CHAT_MODEL: z.string().default('gemini-3.6-flash'),
  GEMINI_EMBEDDING_MODEL: z.string().default('gemini-embedding-001'),
  /** Pinned so the assistant Postgres's vector column has a fixed, known width — see
   * libs/ai-assistant's knowledge-store.ts. */
  GEMINI_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(768),
  /** A separate Postgres instance (pgvector extension) from quoteflow-rating-service's own —
   * this is the assistant's knowledge base, not quote data, so it doesn't compromise
   * bff-gateway's "no direct quote-data database" architecture. */
  ASSISTANT_DATABASE_URL: z
    .string({
      error:
        'ASSISTANT_DATABASE_URL is required (e.g. postgres://postgres:quoteflow@localhost:5433/quoteflow_assistant)',
    })
    .min(1, 'ASSISTANT_DATABASE_URL must not be empty'),
  ASSISTANT_RAG_TOP_K: z.coerce.number().int().positive().default(3),
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
