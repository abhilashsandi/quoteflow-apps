export interface CarrierApiBindPayload {
  quoteId: string;
  carrierCode: string;
}

export interface CarrierApiBindResult {
  policyNumber: string;
}

export interface RunCarrierApiBindOptions {
  apiBaseUrl: string;
  apiKey: string;
}

/**
 * The API-driven counterpart to carrier-bind-automation.ts's Playwright driver — one
 * authenticated POST instead of a browser session. This is what "API-driven" looks like from
 * the worker's side: no browser, no login page, just a bearer-token request/response against
 * the carrier's own REST API (see ../mock-carrier-api/app.ts for the mock).
 */
export async function runCarrierApiBind(
  payload: CarrierApiBindPayload,
  options: RunCarrierApiBindOptions,
): Promise<CarrierApiBindResult> {
  const res = await fetch(`${options.apiBaseUrl}/v1/bind`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({ quoteId: payload.quoteId }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Carrier API bind failed: HTTP ${res.status} ${body}`);
  }

  const data = (await res.json()) as { policyNumber?: string };
  if (!data.policyNumber) {
    throw new Error('Carrier API returned no policyNumber');
  }

  return { policyNumber: data.policyNumber };
}
