import express, { type Express } from 'express';

export interface MockCarrierApiOptions {
  /** The bearer token a client must send — models a real carrier API's shared-secret auth,
   * contrasting the mock portal's session-cookie login. */
  apiKey: string;
  /** Probability (0-1) that a /v1/bind call fails, simulating a flaky real carrier API.
   * Independent of automation-worker's own SIMULATED_FAILURE_RATE. */
  failureRate: number;
}

interface BindRequestBody {
  quoteId?: string;
}

/**
 * A bare Express JSON API standing in for a real carrier's REST API — deliberately not a
 * browser flow: no login page, no form, just an authenticated POST returning JSON. This is
 * what "API-driven" means as opposed to Acme's Playwright-driven mock portal (see
 * mock-carrier-portal/app.ts) — the same worker consumes carrier.bind.requested jobs for both,
 * picking this path or that one based on the job's carrierCode (see bind-job-handler.ts).
 */
export function createMockCarrierApiApp(
  options: MockCarrierApiOptions,
): Express {
  const app = express();
  app.use(express.json());

  app.post('/v1/bind', async (req, res) => {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${options.apiKey}`) {
      res
        .status(401)
        .json({
          error: {
            code: 'unauthorized',
            message: 'Missing or invalid API key',
          },
        });
      return;
    }

    const { quoteId } = req.body as BindRequestBody;
    if (!quoteId) {
      res
        .status(400)
        .json({
          error: { code: 'invalid_request', message: 'quoteId is required' },
        });
      return;
    }

    // A real API call has network latency but nothing like a portal's page-load-per-step —
    // much shorter than the mock portal's simulated delay.
    await new Promise((resolve) =>
      setTimeout(resolve, 200 + Math.random() * 400),
    );

    if (Math.random() < options.failureRate) {
      res
        .status(503)
        .json({
          error: {
            code: 'carrier_unavailable',
            message: 'Vantage Direct API temporarily unavailable',
          },
        });
      return;
    }

    const policyNumber = `VNTG-${quoteId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    res.status(200).json({ policyNumber });
  });

  return app;
}
