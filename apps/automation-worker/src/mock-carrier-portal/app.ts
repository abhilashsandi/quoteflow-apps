import { randomUUID } from 'node:crypto';
import express, { type Express, type Request } from 'express';

const SESSION_COOKIE = 'acme_carrier_session';

interface CarrierSession {
  applicant?: { firstName: string; lastName: string; dob: string };
}

/** In-memory, per-process session store — fine for a dev/demo Express app that's never
 * horizontally scaled. Keyed by a random session id issued at login, not the boolean cookie
 * this portal used before it needed to remember anything across pages. */
const sessions = new Map<string, CarrierSession>();

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 420px; margin: 4rem auto; color: #1f2937; }
  label { display: block; margin-top: 1rem; font-size: 0.875rem; }
  input { display: block; width: 100%; padding: 0.5rem; margin-top: 0.25rem; box-sizing: border-box; }
  button { margin-top: 1.5rem; padding: 0.5rem 1rem; }
  #error { color: #b91c1c; margin-top: 1rem; }
  #result { color: #15803d; margin-top: 1rem; font-weight: 600; }
</style>
</head>
<body>${body}</body>
</html>`;
}

function getSessionId(req: Request): string | undefined {
  const match = /(?:^|;\s*)acme_carrier_session=([^;]+)/.exec(
    req.headers.cookie ?? '',
  );
  return match?.[1];
}

function getSession(req: Request): CarrierSession | undefined {
  const id = getSessionId(req);
  return id ? sessions.get(id) : undefined;
}

export interface MockCarrierPortalOptions {
  /** Probability (0-1) that a /bind-form submission fails, simulating a flaky real carrier
   * system. Independent of automation-worker's own SIMULATED_FAILURE_RATE. */
  failureRate: number;
}

/**
 * A bare Express + server-rendered HTML "Acme carrier portal" — deliberately not a React SPA
 * (see quoteflow-apps' spec: automation-worker's Playwright driver targets a real login +
 * form + result page, the way automation against a genuine carrier portal would). Exported as
 * a factory (rather than calling .listen() itself) so tests can drive it with supertest
 * without binding a port.
 */
export function createMockCarrierPortalApp(
  options: MockCarrierPortalOptions,
): Express {
  const app = express();
  app.use(express.urlencoded({ extended: true }));

  app.get('/', (_req, res) => {
    res.redirect(303, '/login');
  });

  app.get('/login', (_req, res) => {
    res.send(
      page(
        'Acme Carrier Portal — Login',
        `
      <h1>Acme Carrier Portal</h1>
      <form method="post" action="/login" id="login-form">
        <label for="username">Username</label>
        <input id="username" name="username" required />
        <label for="password">Password</label>
        <input id="password" name="password" type="password" required />
        <button id="login-submit" type="submit">Log in</button>
      </form>
    `,
      ),
    );
  });

  app.post('/login', (req, res) => {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };
    if (!username || !password) {
      res
        .status(400)
        .send(
          page(
            'Login failed',
            '<div id="error">Username and password are required</div>',
          ),
        );
      return;
    }
    const sessionId = randomUUID();
    sessions.set(sessionId, {});
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly`,
    );
    res.redirect(303, '/applicant-details');
  });

  app.get('/applicant-details', (req, res) => {
    const session = getSession(req);
    if (!session) {
      res.redirect(303, '/login');
      return;
    }
    res.send(
      page(
        'Acme Carrier Portal — Applicant Details',
        `
      <h1>Applicant Details</h1>
      <form method="post" action="/applicant-details" id="applicant-details-form">
        <label for="firstName">First name</label>
        <input id="firstName" name="firstName" required />
        <label for="lastName">Last name</label>
        <input id="lastName" name="lastName" required />
        <label for="dob">Date of birth</label>
        <input id="dob" name="dob" type="date" required />
        <button id="applicant-details-submit" type="submit">Continue</button>
      </form>
    `,
      ),
    );
  });

  app.post('/applicant-details', (req, res) => {
    const sessionId = getSessionId(req);
    const session = sessionId ? sessions.get(sessionId) : undefined;
    if (!sessionId || !session) {
      res.redirect(303, '/login');
      return;
    }
    const { firstName, lastName, dob } = req.body as {
      firstName?: string;
      lastName?: string;
      dob?: string;
    };
    if (!firstName || !lastName || !dob) {
      res
        .status(400)
        .send(
          page(
            'Applicant details failed',
            '<div id="error">First name, last name, and date of birth are required</div>',
          ),
        );
      return;
    }
    sessions.set(sessionId, { applicant: { firstName, lastName, dob } });
    res.redirect(303, '/bind-form');
  });

  app.get('/bind-form', (req, res) => {
    const session = getSession(req);
    if (!session) {
      res.redirect(303, '/login');
      return;
    }
    if (!session.applicant) {
      res.redirect(303, '/applicant-details');
      return;
    }
    res.send(
      page(
        'Acme Carrier Portal — Bind Policy',
        `
      <h1>Bind a Policy</h1>
      <p>Applicant: ${session.applicant.firstName} ${session.applicant.lastName}</p>
      <form method="post" action="/bind-form" id="bind-form">
        <label for="quoteId">Quote ID</label>
        <input id="quoteId" name="quoteId" required />
        <button id="submit-btn" type="submit">Bind Policy</button>
      </form>
    `,
      ),
    );
  });

  app.post('/bind-form', async (req, res) => {
    const session = getSession(req);
    if (!session) {
      res.redirect(303, '/login');
      return;
    }
    if (!session.applicant) {
      res.redirect(303, '/applicant-details');
      return;
    }
    const { quoteId } = req.body as { quoteId?: string };
    if (!quoteId) {
      res
        .status(400)
        .send(
          page('Bind failed', '<div id="error">A quote ID is required</div>'),
        );
      return;
    }

    // Simulates the carrier's own processing delay — this is what a real carrier portal's
    // server-side processing time looks like from the outside.
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 2000),
    );

    if (Math.random() < options.failureRate) {
      res.send(
        page(
          'Bind failed',
          '<div id="error">Acme carrier system temporarily unavailable</div>',
        ),
      );
      return;
    }

    const policyNumber = `ACME-${quoteId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    res.send(
      page(
        'Policy bound',
        `<p>Policy bound for ${session.applicant.firstName} ${session.applicant.lastName}</p>
      <div id="result">${policyNumber}</div>`,
      ),
    );
  });

  return app;
}
