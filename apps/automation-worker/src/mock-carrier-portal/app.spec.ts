import request from 'supertest';
import { createMockCarrierPortalApp } from './app.js';

function loggedInAgent(failureRate = 0) {
  const app = createMockCarrierPortalApp({ failureRate });
  const agent = request.agent(app);
  return agent
    .post('/login')
    .type('form')
    .send({
      username: 'automation-worker',
      password: 'automation-worker-password',
    })
    .then(() => agent);
}

describe('mock carrier portal app', () => {
  it('serves a login form with the fields Playwright fills', async () => {
    const app = createMockCarrierPortalApp({ failureRate: 0 });
    const res = await request(app).get('/login');
    expect(res.status).toBe(200);
    expect(res.text).toContain('id="username"');
    expect(res.text).toContain('id="password"');
    expect(res.text).toContain('id="login-submit"');
  });

  it('rejects a bind-form login attempt with no session, redirecting to /login', async () => {
    const app = createMockCarrierPortalApp({ failureRate: 0 });
    const res = await request(app).get('/bind-form');
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/login');
  });

  it('grants access to /bind-form after logging in', async () => {
    const agent = await loggedInAgent();
    const res = await agent.get('/bind-form');
    expect(res.status).toBe(200);
    expect(res.text).toContain('id="quoteId"');
    expect(res.text).toContain('id="submit-btn"');
  });

  it('returns a #result element with a policy number on a successful bind (failureRate 0)', async () => {
    const agent = await loggedInAgent(0);
    const res = await agent
      .post('/bind-form')
      .type('form')
      .send({ quoteId: 'quote-12345678' });
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/<div id="result">ACME-QUOTE-12-[0-9A-Z]+<\/div>/);
  }, 10_000);

  it('returns a #error element on a forced failure (failureRate 1)', async () => {
    const agent = await loggedInAgent(1);
    const res = await agent
      .post('/bind-form')
      .type('form')
      .send({ quoteId: 'quote-12345678' });
    expect(res.status).toBe(200);
    expect(res.text).toContain('id="error"');
  }, 10_000);

  it('rejects a bind-form submission with no quoteId', async () => {
    const agent = await loggedInAgent();
    const res = await agent.post('/bind-form').type('form').send({});
    expect(res.status).toBe(400);
    expect(res.text).toContain('A quote ID is required');
  });
});
