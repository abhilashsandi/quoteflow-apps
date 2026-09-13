import { logger } from '../logger.js';
import { runCarrierApiBind } from './carrier-api-automation.js';
import { runCarrierBindAutomation } from './carrier-bind-automation.js';
import type { RatingServiceCallback } from './rating-service-callback.js';
import type { RatingServiceQuoteLookup } from './rating-service-quote-lookup.js';

export interface BindRequestedMessage {
  jobId: string;
  quoteId: string;
  carrierId: string;
  carrierCode: string;
  requestedAt: string;
}

/** Carriers whose bind goes through the mock carrier API instead of Playwright. Everything
 * else falls back to the Playwright-driven mock portal (currently just 'acme'). */
const API_DRIVEN_CARRIER_CODES = new Set(['vantage']);

export interface BindJobHandlerDeps {
  ratingService: RatingServiceCallback;
  /** Only needed for the Playwright path — it's what supplies real applicant data to the mock
   * portal's applicant-details page. */
  quoteLookup: RatingServiceQuoteLookup;
  mockCarrierPortalUrl: string;
  headless: boolean;
  carrierApiBaseUrl: string;
  carrierApiKey: string;
  simulatedFailureRate: number;
  automate?: typeof runCarrierBindAutomation;
  callCarrierApi?: typeof runCarrierApiBind;
}

/**
 * One attempt at one carrier.bind.requested job. Reports 'running' before the attempt (so a
 * live bind-status poll reflects it), 'succeeded' on success, and 'dead_lettered' only when
 * this is the LAST attempt (retryCount === maxRetries) — a failure that will still be retried
 * isn't reported at all, since the next 'running' callback already covers it. Always rethrows
 * on failure so the RabbitMQ client (not this function) decides retry vs. DLQ.
 *
 * Which bind mechanism runs is decided entirely by the job's own carrierCode
 * (API_DRIVEN_CARRIER_CODES above) — everything else about this function (retry reporting,
 * error handling, the DLQ decision) is identical regardless of which one ran.
 */
export function createBindJobHandler(deps: BindJobHandlerDeps) {
  const automate = deps.automate ?? runCarrierBindAutomation;
  const callCarrierApi = deps.callCarrierApi ?? runCarrierApiBind;

  return async function handleBindJob(
    content: string,
    retryCount: number,
    maxRetries: number,
  ): Promise<void> {
    const job = JSON.parse(content) as BindRequestedMessage;
    logger.info('Processing bind job', {
      jobId: job.jobId,
      quoteId: job.quoteId,
      carrierCode: job.carrierCode,
      retryCount,
    });

    await deps.ratingService.reportBindProgress(job.jobId, {
      status: 'running',
      incrementAttempt: true,
    });

    try {
      if (
        deps.simulatedFailureRate > 0 &&
        Math.random() < deps.simulatedFailureRate
      ) {
        throw new Error(
          `Simulated worker-side failure (rate ${deps.simulatedFailureRate})`,
        );
      }

      const result = API_DRIVEN_CARRIER_CODES.has(job.carrierCode)
        ? await callCarrierApi(
            { quoteId: job.quoteId, carrierCode: job.carrierCode },
            { apiBaseUrl: deps.carrierApiBaseUrl, apiKey: deps.carrierApiKey },
          )
        : await automate(
            {
              quoteId: job.quoteId,
              carrierCode: job.carrierCode,
              applicant: await deps.quoteLookup.getApplicantDetails(
                job.quoteId,
              ),
            },
            {
              mockCarrierPortalUrl: deps.mockCarrierPortalUrl,
              headless: deps.headless,
            },
          );

      await deps.ratingService.reportBindProgress(job.jobId, {
        status: 'succeeded',
      });
      logger.info('Bind job succeeded', {
        jobId: job.jobId,
        carrierCode: job.carrierCode,
        policyNumber: result.policyNumber,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Bind job attempt failed', {
        jobId: job.jobId,
        retryCount,
        message,
      });

      if (retryCount >= maxRetries) {
        await deps.ratingService.reportBindProgress(job.jobId, {
          status: 'dead_lettered',
          lastError: message,
        });
      }
      throw err;
    }
  };
}
