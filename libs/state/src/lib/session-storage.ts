import type { QuoteSessionData } from './quote-session.store.js';

const STORAGE_PREFIX = 'quoteflow:quote:';

function key(quoteId: string): string {
  return `${STORAGE_PREFIX}${quoteId}`;
}

/**
 * sessionStorage is the source of truth for the current tab — every field change writes
 * here immediately, so a refresh survives with zero round trips. Wrapped in try/catch: a
 * private-browsing quota error here should never break typing in the form.
 */
export function saveToSessionStorage(
  quoteId: string,
  data: QuoteSessionData,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key(quoteId), JSON.stringify(data));
  } catch {
    // storage full or blocked — in-memory state still works for the rest of this tab session
  }
}

export function loadFromSessionStorage(
  quoteId: string,
): QuoteSessionData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key(quoteId));
    return raw ? (JSON.parse(raw) as QuoteSessionData) : null;
  } catch {
    return null;
  }
}

export function clearSessionStorage(quoteId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(key(quoteId));
  } catch {
    // nothing to do
  }
}
