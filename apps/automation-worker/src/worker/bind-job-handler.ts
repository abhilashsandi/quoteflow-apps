import { logger } from '../logger.js';
import { runCarrierBindAutomation } from './carrier-bind-automation.js';
import type { RatingServiceCallback } from './rating-service-callback.js';

export interface BindRequestedMessage {
  jobId: string;
  quoteId: string;
  carrierId: string;
  carrierCode: string;
  requestedAt: string;
}

export interface BindJobHandlerDeps {
  ratingService: RatingServiceCallback;
  mockCarrierPortalUrl: string;
  headless: boolean;
  simulatedFailureRate: number;
  automate?: typeof runCarrierBindAutomation;
}

/**
 * One attempt at one carrier.bind.requested job. Reports 'running' before the attempt (so a
 * live bind-status poll reflects it), 'succeeded' on success, and 'dead_lettered' only when
 * this is the LAST attempt (retryCount === maxRetries) — a failure that will still be retried
 * isn't reported at all, since the next 'running' callback already covers it. Always rethrows
 * on failure so the RabbitMQ client (not this function) decides retry vs. DLQ.
 */
export function createBindJobHandler(deps: BindJobHandlerDeps) {
  const automate = deps.automate ?? runCarrierBindAutomation;

  return async function handleBindJob(
    content: string,
    retryCount: number,
    maxRetries: number,
  ): Promise<void> {
    const job = JSON.parse(content) as BindRequestedMessage;
    logger.info('Processing bind job', {
      jobId: job.jobId,
      quoteId: job.quoteId,
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

      const result = await automate(
        { quoteId: job.quoteId, carrierCode: job.carrierCode },
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
