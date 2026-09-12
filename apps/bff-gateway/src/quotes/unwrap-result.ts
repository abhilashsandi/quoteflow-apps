import { HttpException } from '@nestjs/common';
import type { ApiError, Result } from 'api-client';

/** Turns api-client's Result into either the plain data or a Nest HttpException carrying the
 * upstream rating-service's status/error code/details straight through. */
export function unwrapResult<T>(result: Result<T, ApiError>): T {
  if (result.success) return result.data;
  const status =
    result.error.status >= 400 && result.error.status < 600
      ? result.error.status
      : 502;
  throw new HttpException(
    { error: result.error.code, details: result.error.details },
    status,
  );
}
