import { BFF_GATEWAY_URL } from './config';

export interface QuoteFlowFlags {
  showSavingsBadge: boolean;
}

const DEFAULT_FLAGS: QuoteFlowFlags = { showSavingsBadge: false };

/**
 * Called directly from the server component that renders the landing page — resolved before
 * the page is ever sent to the browser, so there's no client fetch or loading state for this
 * one flag. Fails open to DEFAULT_FLAGS if bff-gateway is unreachable; a feature flag should
 * never be able to break the page it's on.
 */
export async function getFlags(): Promise<QuoteFlowFlags> {
  try {
    const res = await fetch(`${BFF_GATEWAY_URL}/flags`, { cache: 'no-store' });
    if (!res.ok) return DEFAULT_FLAGS;
    return { ...DEFAULT_FLAGS, ...(await res.json()) };
  } catch {
    return DEFAULT_FLAGS;
  }
}
