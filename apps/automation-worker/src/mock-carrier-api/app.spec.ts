import request from 'supertest';
import { createMockCarrierApiApp } from './app.js';

describe('mock carrier API app', () => {
  it('rejects a request with no Authorization header', async () => {
    const app = createMockCarrierApiApp({ apiKey: 'secret', failureRate: 0 });
    const res = await request(app).post('/v1/bind').send({ quoteId: 'q1' });
    expect(res.status).toBe(401);
  });

  it('rejects a request with the wrong bearer token', async () => {
    const app = createMockCarrierApiApp({ apiKey: 'secret', failureRate: 0 });
    const res = await request(app)
      .post('/v1/bind')
      .set('Authorization', 'Bearer wrong-token')
      .send({ quoteId: 'q1' });
    expect(res.status).toBe(401);
  });

  it('rejects a request with no quoteId', async () => {
    const app = createMockCarrierApiApp({ apiKey: 'secret', failureRate: 0 });
    const res = await request(app)
      .post('/v1/bind')
      .set('Authorization', 'Bearer secret')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns a policyNumber on a successful bind (failureRate 0)', async () => {
    const app = createMockCarrierApiApp({ apiKey: 'secret', failureRate: 0 });
    const res = await request(app)
      .post('/v1/bind')
      .set('Authorization', 'Bearer secret')
      .send({ quoteId: 'quote-12345678' });
    expect(res.status).toBe(200);
    expect(res.body.policyNumber).toMatch(/^VNTG-QUOTE-12-[0-9A-Z]+$/);
  }, 10_000);

  it('returns a 503 error on a forced failure (failureRate 1)', async () => {
    const app = createMockCarrierApiApp({ apiKey: 'secret', failureRate: 1 });
    const res = await request(app)
      .post('/v1/bind')
      .set('Authorization', 'Bearer secret')
      .send({ quoteId: 'quote-12345678' });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('carrier_unavailable');
  }, 10_000);
});
