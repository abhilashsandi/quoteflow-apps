import request from 'supertest';
import { createMockCarrierPortalApp } from './app.js';

async function loggedInAgent(failureRate = 0) {
  const app = createMockCarrierPortalApp({ failureRate });
  const agent = request.agent(app);
  await agent.post('/login').type('form').send({
    username: 'automation-worker',
    password: 'automation-worker-password',
  });
  return agent;
}

async function agentPastApplicantDetails(failureRate = 0) {
  const agent = await loggedInAgent(failureRate);
  await agent
    .post('/applicant-details')
    .type('form')
    .send({ firstName: 'Jane', lastName: 'Doe', dob: '1990-01-01' });
  return agent;
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

  it('redirects a logged-in user to /applicant-details, not straight to /bind-form', async () => {
    const app = createMockCarrierPortalApp({ failureRate: 0 });
    const res = await request(app).post('/login').type('form').send({
      username: 'automation-worker',
      password: 'automation-worker-password',
    });
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/applicant-details');
  });

  it('rejects an /applicant-details visit with no session, redirecting to /login', async () => {
    const app = createMockCarrierPortalApp({ failureRate: 0 });
    const res = await request(app).get('/applicant-details');
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/login');
  });

  it('serves the applicant details form with the fields Playwright fills', async () => {
    const agent = await loggedInAgent();
    const res = await agent.get('/applicant-details');
    expect(res.status).toBe(200);
    expect(res.text).toContain('id="firstName"');
    expect(res.text).toContain('id="lastName"');
    expect(res.text).toContain('id="dob"');
    expect(res.text).toContain('id="applicant-details-submit"');
  });

  it('rejects an applicant-details submission missing a field', async () => {
    const agent = await loggedInAgent();
    const res = await agent
      .post('/applicant-details')
      .type('form')
      .send({ firstName: 'Jane', lastName: 'Doe' });
    expect(res.status).toBe(400);
    expect(res.text).toContain('id="error"');
  });

  it('redirects to /bind-form once applicant details are submitted', async () => {
    const agent = await loggedInAgent();
    const res = await agent
      .post('/applicant-details')
      .type('form')
      .send({ firstName: 'Jane', lastName: 'Doe', dob: '1990-01-01' });
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/bind-form');
  });

  it('rejects a bind-form visit with no session, redirecting to /login', async () => {
    const app = createMockCarrierPortalApp({ failureRate: 0 });
    const res = await request(app).get('/bind-form');
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/login');
  });

  it('bounces a logged-in-but-not-yet-detailed session from /bind-form back to /applicant-details', async () => {
    const agent = await loggedInAgent();
    const res = await agent.get('/bind-form');
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/applicant-details');
  });

  it('grants access to /bind-form once applicant details are on file', async () => {
    const agent = await agentPastApplicantDetails();
    const res = await agent.get('/bind-form');
    expect(res.status).toBe(200);
    expect(res.text).toContain('id="quoteId"');
    expect(res.text).toContain('id="submit-btn"');
    expect(res.text).toContain('Jane Doe');
  });

  it('returns a #result element with a policy number on a successful bind (failureRate 0)', async () => {
    const agent = await agentPastApplicantDetails(0);
    const res = await agent
      .post('/bind-form')
      .type('form')
      .send({ quoteId: 'quote-12345678' });
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/<div id="result">ACME-QUOTE-12-[0-9A-Z]+<\/div>/);
    expect(res.text).toContain('Policy bound for Jane Doe');
  }, 10_000);

  it('returns a #error element on a forced failure (failureRate 1)', async () => {
    const agent = await agentPastApplicantDetails(1);
    const res = await agent
      .post('/bind-form')
      .type('form')
      .send({ quoteId: 'quote-12345678' });
    expect(res.status).toBe(200);
    expect(res.text).toContain('id="error"');
  }, 10_000);

  it('rejects a bind-form submission with no quoteId', async () => {
    const agent = await agentPastApplicantDetails();
    const res = await agent.post('/bind-form').type('form').send({});
    expect(res.status).toBe(400);
    expect(res.text).toContain('A quote ID is required');
  });
});
