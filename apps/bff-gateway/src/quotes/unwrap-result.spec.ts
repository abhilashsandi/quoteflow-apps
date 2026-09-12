import { HttpException } from '@nestjs/common';
import { unwrapResult } from './unwrap-result.js';

describe('unwrapResult', () => {
  it('returns the data for a successful Result', () => {
    expect(unwrapResult({ success: true, data: { quoteId: 'q1' } })).toEqual({
      quoteId: 'q1',
    });
  });

  it('throws an HttpException carrying the upstream status and error code', () => {
    expect(() =>
      unwrapResult({
        success: false,
        error: {
          status: 404,
          code: 'quote_not_found',
          details: { quoteId: 'q1' },
        },
      }),
    ).toThrow(HttpException);

    try {
      unwrapResult({
        success: false,
        error: {
          status: 404,
          code: 'quote_not_found',
          details: { quoteId: 'q1' },
        },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(404);
      expect((err as HttpException).getResponse()).toEqual({
        error: 'quote_not_found',
        details: { quoteId: 'q1' },
      });
    }
  });

  it('falls back to 502 for a network-level error (status 0)', () => {
    try {
      unwrapResult({
        success: false,
        error: { status: 0, code: 'network_error' },
      });
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(502);
    }
  });
});
