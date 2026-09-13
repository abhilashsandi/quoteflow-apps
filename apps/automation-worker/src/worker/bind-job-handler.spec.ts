import { createBindJobHandler } from './bind-job-handler.js';
import type { RatingServiceCallback } from './rating-service-callback.js';

const JOB = {
  jobId: 'job-1',
  quoteId: 'quote-1',
  carrierId: 'carrier-1',
  carrierCode: 'acme',
  requestedAt: '2026-01-01T00:00:00.000Z',
};

function fakeRatingService(): RatingServiceCallback & {
  reportBindProgress: jest.Mock;
} {
  return { reportBindProgress: jest.fn().mockResolvedValue(undefined) };
}

describe('createBindJobHandler', () => {
  it('reports running, runs the automation, and reports succeeded', async () => {
    const ratingService = fakeRatingService();
    const automate = jest.fn().mockResolvedValue({ policyNumber: 'ACME-123' });
    const handle = createBindJobHandler({
      ratingService,
      mockCarrierPortalUrl: 'http://localhost:4200',
      headless: true,
      simulatedFailureRate: 0,
      automate,
    });

    await handle(JSON.stringify(JOB), 0, 3);

    expect(ratingService.reportBindProgress).toHaveBeenNthCalledWith(
      1,
      'job-1',
      {
        status: 'running',
        incrementAttempt: true,
      },
    );
    expect(automate).toHaveBeenCalledWith(
      { quoteId: 'quote-1', carrierCode: 'acme' },
      { mockCarrierPortalUrl: 'http://localhost:4200', headless: true },
    );
    expect(ratingService.reportBindProgress).toHaveBeenNthCalledWith(
      2,
      'job-1',
      { status: 'succeeded' },
    );
  });

  it('does not report dead_lettered when the failure will still be retried', async () => {
    const ratingService = fakeRatingService();
    const automate = jest.fn().mockRejectedValue(new Error('carrier down'));
    const handle = createBindJobHandler({
      ratingService,
      mockCarrierPortalUrl: 'http://localhost:4200',
      headless: true,
      simulatedFailureRate: 0,
      automate,
    });

    await expect(handle(JSON.stringify(JOB), 0, 3)).rejects.toThrow(
      'carrier down',
    );

    expect(ratingService.reportBindProgress).toHaveBeenCalledTimes(1);
    expect(ratingService.reportBindProgress).toHaveBeenCalledWith('job-1', {
      status: 'running',
      incrementAttempt: true,
    });
  });

  it('reports dead_lettered when this is the final attempt', async () => {
    const ratingService = fakeRatingService();
    const automate = jest.fn().mockRejectedValue(new Error('carrier down'));
    const handle = createBindJobHandler({
      ratingService,
      mockCarrierPortalUrl: 'http://localhost:4200',
      headless: true,
      simulatedFailureRate: 0,
      automate,
    });

    await expect(handle(JSON.stringify(JOB), 3, 3)).rejects.toThrow(
      'carrier down',
    );

    expect(ratingService.reportBindProgress).toHaveBeenNthCalledWith(
      2,
      'job-1',
      {
        status: 'dead_lettered',
        lastError: 'carrier down',
      },
    );
  });

  it('injects a simulated failure before running the automation when the rate forces it', async () => {
    const ratingService = fakeRatingService();
    const automate = jest.fn().mockResolvedValue({ policyNumber: 'ACME-123' });
    const handle = createBindJobHandler({
      ratingService,
      mockCarrierPortalUrl: 'http://localhost:4200',
      headless: true,
      simulatedFailureRate: 1,
      automate,
    });

    await expect(handle(JSON.stringify(JOB), 0, 3)).rejects.toThrow(
      /simulated worker-side failure/i,
    );
    expect(automate).not.toHaveBeenCalled();
  });
});
