import { err, ok, type ApiError, type Result } from './result.js';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Every call resolves to a Result instead of throwing — callers (server actions, route
 * handlers) branch on `success` rather than wrapping every call in try/catch.
 */
export async function requestJson<T>(
  url: string,
  options: RequestOptions = {},
): Promise<Result<T, ApiError>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body !== undefined
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...options.headers,
      },
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (cause) {
    return err({
      status: 0,
      code: 'network_error',
      details: (cause as Error).message,
    });
  }

  let body: unknown;
  const text = await response.text();
  try {
    body = text.length > 0 ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const parsed = body as { error?: string; details?: unknown } | undefined;
    return err({
      status: response.status,
      code: parsed?.error ?? 'unknown_error',
      details: parsed?.details,
    });
  }

  return ok(body as T);
}
