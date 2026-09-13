/** bff-gateway's origin — every quote read/write goes through here, never quoteflow-rating-service directly. */
export const BFF_GATEWAY_URL =
  process.env.NEXT_PUBLIC_BFF_GATEWAY_URL ?? 'http://localhost:4100';

/**
 * quoteflow-rating-service's own public origin — used only to fetch its config/validator
 * bundles directly (immutable, content-hashed, cacheable static assets), which is why this
 * one path bypasses bff-gateway: it's not quote data, so there's nothing for the gateway to
 * mediate.
 */
export const RATING_SERVICE_URL =
  process.env.NEXT_PUBLIC_RATING_SERVICE_URL ?? 'http://localhost:4000';

/** Only one carrier exists in this sample. */
export const CARRIER_CODE = 'acme';

export const FUNNEL_ORDER = ['schema', 'rc1', 'rc2', 'bind'] as const;

/** Grouped for SidebarSteps — same four stages as customer-portal, laid out the same way. */
export const SIDEBAR_STEP_GROUPS = [
  {
    heading: 'Build the plan',
    steps: [{ key: 'schema', label: "Customer's Details" }],
  },
  {
    heading: 'Review & bind',
    steps: [
      { key: 'rc1', label: 'Quote' },
      { key: 'rc2', label: 'Driving Record' },
      { key: 'bind', label: 'Bind Policy' },
    ],
  },
];
