import { chromium } from 'playwright';

export interface CarrierBindPayload {
  quoteId: string;
  carrierCode: string;
  /** Filled into the mock portal's applicant-details page — a real carrier automation would
   * need the same real applicant data, not just a quoteId. See bind-job-handler.ts, which
   * fetches this from quoteflow-rating-service before calling this function. */
  applicant: { firstName: string; lastName: string; dob: string };
}

export interface CarrierBindResult {
  policyNumber: string;
}

export interface RunCarrierBindAutomationOptions {
  mockCarrierPortalUrl: string;
  headless: boolean;
}

/**
 * Drives the mock Acme carrier portal — a bare Express + server-rendered HTML app (see
 * ../mock-carrier-portal/app.ts), not a React SPA — exactly the way automation against a real
 * carrier's portal would: log in, fill the bind form, submit, and scrape the result page.
 * `#result` / `#error` is the DOM contract the mock portal's server-rendered pages guarantee.
 */
export async function runCarrierBindAutomation(
  payload: CarrierBindPayload,
  options: RunCarrierBindAutomationOptions,
): Promise<CarrierBindResult> {
  const browser = await chromium.launch({ headless: options.headless });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${options.mockCarrierPortalUrl}/login`, {
      waitUntil: 'networkidle',
    });
    await page.fill('#username', 'automation-worker');
    await page.fill('#password', 'automation-worker-password');
    await page.click('#login-submit');
    await page.waitForURL('**/applicant-details');

    await page.fill('#firstName', payload.applicant.firstName);
    await page.fill('#lastName', payload.applicant.lastName);
    await page.fill('#dob', payload.applicant.dob);
    await page.click('#applicant-details-submit');
    await page.waitForURL('**/bind-form');

    await page.fill('#quoteId', payload.quoteId);
    await page.click('#submit-btn');
    await page.waitForSelector('#result, #error', { timeout: 30_000 });

    const errorEl = await page.$('#error');
    if (errorEl) {
      const text = await errorEl.textContent();
      throw new Error(`Carrier portal error: ${text ?? 'unknown error'}`);
    }

    const resultEl = await page.$('#result');
    const policyNumber = (await resultEl?.textContent())?.trim();
    if (!policyNumber) {
      throw new Error('Empty result scraped from carrier portal');
    }

    return { policyNumber };
  } finally {
    await browser.close();
  }
}
