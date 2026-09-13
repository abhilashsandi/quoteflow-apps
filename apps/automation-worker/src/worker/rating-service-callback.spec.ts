import { createRatingServiceCallback } from './rating-service-callback.js';

describe('createRatingServiceCallback', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('PATCHes the internal carrier-jobs route with the given patch', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    const callback = createRatingServiceCallback('http://localhost:4000');
    await callback.reportBindProgress('job-1', {
      status: 'running',
      incrementAttempt: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/internal/carrier-jobs/job-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'running', incrementAttempt: true }),
      }),
    );
  });

  it('throws when the response is not ok', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;

    const callback = createRatingServiceCallback('http://localhost:4000');
    await expect(
      callback.reportBindProgress('job-1', { status: 'succeeded' }),
    ).rejects.toThrow(/404/);
  });
});
