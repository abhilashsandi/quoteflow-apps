export type Result<T, E = ApiError> =
  { success: true; data: T } | { success: false; error: E };

export interface ApiError {
  status: number;
  code: string;
  details?: unknown;
}

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}
