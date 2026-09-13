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

/** Default carrier for a direct `/quote` visit (no `resume` param, i.e. bypassing GaQ/compare). */
export const CARRIER_CODE = 'acme';

/** The two carriers GaQ (`/quote/start`) rates side by side — see `quote/start/actions.ts`. */
export const ACME_CARRIER_CODE = 'acme';
export const VANTAGE_CARRIER_CODE = 'vantage';

/**
 * Fields GaQ collects in one step, covering both carriers' `driver-info` page (identical field
 * keys on both) plus Vantage's `vehicle-info` page — Acme's PATCH just omits the vehicle fields.
 * See quoteflow-rating-service's `src/carriers/{acme,vantage}/routeConfigs/base.ts` for the
 * source of truth these mirror.
 */
export const GAQ_DRIVER_FIELDS = [
  'firstName',
  'lastName',
  'dob',
  'ssn',
  'phone',
  'maritalStatus',
] as const;
export const GAQ_VEHICLE_FIELDS = ['vin', 'make', 'model', 'year'] as const;

export const FUNNEL_ORDER = ['schema', 'rc1', 'rc2', 'bind'] as const;

export const FUNNEL_STEPS = [
  { key: 'schema', label: 'Your info' },
  { key: 'rc1', label: 'Quote' },
  { key: 'rc2', label: 'Driving record' },
  { key: 'bind', label: 'Purchase' },
];

/** Grouped for SidebarSteps — same four stages, organized the way a longer real flow would be. */
export const SIDEBAR_STEP_GROUPS = [
  {
    heading: 'Build your plan',
    steps: [{ key: 'schema', label: 'Personal Details' }],
  },
  {
    heading: 'Review & purchase',
    steps: [
      { key: 'rc1', label: 'Your Quote' },
      { key: 'rc2', label: 'Driving Record' },
      { key: 'bind', label: 'Purchase' },
    ],
  },
];
