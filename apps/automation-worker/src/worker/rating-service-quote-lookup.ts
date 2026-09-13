export interface ApplicantDetails {
  firstName: string;
  lastName: string;
  dob: string;
}

export interface RatingServiceQuoteLookup {
  getApplicantDetails(quoteId: string): Promise<ApplicantDetails>;
}

/**
 * Server-to-server read of a quote's driver-info answers — used to fill in the mock Acme
 * portal's applicant-details page the same way a real carrier automation would need real
 * applicant data, not just a quoteId. Hits quoteflow-rating-service's internal (no-CORS) route,
 * same trust boundary as rating-service-callback.ts's progress PATCH.
 */
export function createRatingServiceQuoteLookup(
  ratingServiceBaseUrl: string,
): RatingServiceQuoteLookup {
  async function getApplicantDetails(
    quoteId: string,
  ): Promise<ApplicantDetails> {
    const url = new URL(
      `/internal/quotes/${quoteId}`,
      ratingServiceBaseUrl,
    ).toString();
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `Failed to fetch quote ${quoteId} details: HTTP ${res.status}`,
      );
    }
    const data = (await res.json()) as {
      answers: Record<string, Record<string, unknown>>;
    };
    const driverInfo = data.answers?.['driver-info'] ?? {};
    const firstName = driverInfo.firstName;
    const lastName = driverInfo.lastName;
    const dob = driverInfo.dob;
    if (
      typeof firstName !== 'string' ||
      typeof lastName !== 'string' ||
      typeof dob !== 'string'
    ) {
      throw new Error(
        `Quote ${quoteId} is missing driver-info firstName/lastName/dob`,
      );
    }
    return { firstName, lastName, dob };
  }

  return { getApplicantDetails };
}
