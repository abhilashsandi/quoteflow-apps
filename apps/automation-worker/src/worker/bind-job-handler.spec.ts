import { createBindJobHandler } from './bind-job-handler.js';
import type { RatingServiceCallback } from './rating-service-callback.js';

const ACME_JOB = {
  jobId: 'job-1',
  quoteId: 'quote-1',
  carrierId: 'carrier-1',
  carrierCode: 'acme',
  requestedAt: '2026-01-01T00:00:00.000Z',
};

const VANTAGE_JOB = {
  jobId: 'job-2',
  quoteId: 'quote-2',
  carrierId: 'carrier-2',
  carrierCode: 'vantage',
  requestedAt: '2026-01-01T00:00:00.000Z',
};

function fakeRatingService(): RatingServiceCallback & {
  reportBindProgress: jest.Mock;
} {
  return { reportBindProgress: jest.fn().mockResolvedValue(undefined) };
}

const BASE_DEPS = {
  mockCarrierPortalUrl: 'http://localhost:4200',
  headless: true,
  carrierApiBaseUrl: 'http://localhost:4300',
  carrierApiKey: 'test-key',
  simulatedFailureRate: 0,
};

describe('createBindJobHandler', () => {
  it('reports running, runs the Playwright automation for acme, and reports succeeded', async () => {
    const ratingService = fakeRatingService();
    const automate = jest.fn().mockResolvedValue({ policyNumber: 'ACME-123' });
    const callCarrierApi = jest.fn();
    const handle = createBindJobHandler({
      ...BASE_DEPS,
      ratingService,
      automate,
      callCarrierApi,
    });

    await handle(JSON.stringify(ACME_JOB), 0, 3);

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
    expect(callCarrierApi).not.toHaveBeenCalled();
    expect(ratingService.reportBindProgress).toHaveBeenNthCalledWith(
      2,
      'job-1',
      { status: 'succeeded' },
    );
  });

  it('reports running, calls the carrier API for vantage, and reports succeeded', async () => {
    const ratingService = fakeRatingService();
    const automate = jest.fn();
    const callCarrierApi = jest
      .fn()
      .mockResolvedValue({ policyNumber: 'VNTG-456' });
    const handle = createBindJobHandler({
      ...BASE_DEPS,
      ratingService,
      automate,
      callCarrierApi,
    });

    await handle(JSON.stringify(VANTAGE_JOB), 0, 3);

    expect(callCarrierApi).toHaveBeenCalledWith(
      { quoteId: 'quote-2', carrierCode: 'vantage' },
      { apiBaseUrl: 'http://localhost:4300', apiKey: 'test-key' },
    );
    expect(automate).not.toHaveBeenCalled();
    expect(ratingService.reportBindProgress).toHaveBeenNthCalledWith(
      2,
      'job-2',
      { status: 'succeeded' },
    );
  });

  it('does not report dead_lettered when the failure will still be retried', async () => {
    const ratingService = fakeRatingService();
    const automate = jest.fn().mockRejectedValue(new Error('carrier down'));
    const handle = createBindJobHandler({
      ...BASE_DEPS,
      ratingService,
      automate,
    });

    await expect(handle(JSON.stringify(ACME_JOB), 0, 3)).rejects.toThrow(
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
      ...BASE_DEPS,
      ratingService,
      automate,
    });

    await expect(handle(JSON.stringify(ACME_JOB), 3, 3)).rejects.toThrow(
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

  it('reports dead_lettered on the final attempt for an API-driven carrier too', async () => {
    const ratingService = fakeRatingService();
    const callCarrierApi = jest
      .fn()
      .mockRejectedValue(new Error('carrier API down'));
    const handle = createBindJobHandler({
      ...BASE_DEPS,
      ratingService,
      callCarrierApi,
    });

    await expect(handle(JSON.stringify(VANTAGE_JOB), 3, 3)).rejects.toThrow(
      'carrier API down',
    );

    expect(ratingService.reportBindProgress).toHaveBeenNthCalledWith(
      2,
      'job-2',
      {
        status: 'dead_lettered',
        lastError: 'carrier API down',
      },
    );
  });

  it('injects a simulated failure before running the automation when the rate forces it', async () => {
    const ratingService = fakeRatingService();
    const automate = jest.fn().mockResolvedValue({ policyNumber: 'ACME-123' });
    const handle = createBindJobHandler({
      ...BASE_DEPS,
      ratingService,
      automate,
      simulatedFailureRate: 1,
    });

    await expect(handle(JSON.stringify(ACME_JOB), 0, 3)).rejects.toThrow(
      /simulated worker-side failure/i,
    );
    expect(automate).not.toHaveBeenCalled();
  });
});
