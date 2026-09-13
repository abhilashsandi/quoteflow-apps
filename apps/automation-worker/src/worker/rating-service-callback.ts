export const CARRIER_JOB_STATUSES = [
  'pending',
  'running',
  'succeeded',
  'failed',
  'dead_lettered',
] as const;
export type CarrierJobStatus = (typeof CARRIER_JOB_STATUSES)[number];

export interface ReportBindProgressPatch {
  status: CarrierJobStatus;
  lastError?: string | null;
  incrementAttempt?: boolean;
}

export interface RatingServiceCallback {
  reportBindProgress(
    jobId: string,
    patch: ReportBindProgressPatch,
  ): Promise<void>;
}

/**
 * The only way this worker talks back to quoteflow-rating-service: a server-to-server PATCH
 * to its internal (no-CORS) route, never a browser call. See that service's
 * src/routes/internal.route.ts and src/app.ts for why that route has to stay mounted ahead of
 * its CORS-wrapped API router.
 */
export function createRatingServiceCallback(
  ratingServiceBaseUrl: string,
): RatingServiceCallback {
  async function reportBindProgress(
    jobId: string,
    patch: ReportBindProgressPatch,
  ): Promise<void> {
    const url = new URL(
      `/internal/carrier-jobs/${jobId}`,
      ratingServiceBaseUrl,
    ).toString();
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      throw new Error(
        `Failed to report bind progress for job ${jobId}: HTTP ${res.status}`,
      );
    }
  }

  return { reportBindProgress };
}
