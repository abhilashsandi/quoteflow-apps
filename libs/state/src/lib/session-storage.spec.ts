import { INITIAL_QUOTE_SESSION } from './quote-session.store.js';
import {
  clearSessionStorage,
  loadFromSessionStorage,
  saveToSessionStorage,
} from './session-storage.js';

describe('session-storage', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('round-trips data for a given quoteId', () => {
    const data = {
      ...INITIAL_QUOTE_SESSION,
      quoteId: 'q1',
      status: 'ready' as const,
    };
    saveToSessionStorage('q1', data);
    expect(loadFromSessionStorage('q1')).toEqual(data);
  });

  it('returns null for a quoteId that was never saved', () => {
    expect(loadFromSessionStorage('unknown')).toBeNull();
  });

  it('keeps different quoteIds isolated from each other', () => {
    saveToSessionStorage('q1', { ...INITIAL_QUOTE_SESSION, quoteId: 'q1' });
    saveToSessionStorage('q2', { ...INITIAL_QUOTE_SESSION, quoteId: 'q2' });
    expect(loadFromSessionStorage('q1')?.quoteId).toBe('q1');
    expect(loadFromSessionStorage('q2')?.quoteId).toBe('q2');
  });

  it('clearSessionStorage removes only the given quoteId', () => {
    saveToSessionStorage('q1', { ...INITIAL_QUOTE_SESSION, quoteId: 'q1' });
    saveToSessionStorage('q2', { ...INITIAL_QUOTE_SESSION, quoteId: 'q2' });
    clearSessionStorage('q1');
    expect(loadFromSessionStorage('q1')).toBeNull();
    expect(loadFromSessionStorage('q2')).not.toBeNull();
  });

  it('returns null instead of throwing on corrupted JSON', () => {
    window.sessionStorage.setItem('quoteflow:quote:bad', '{not json');
    expect(loadFromSessionStorage('bad')).toBeNull();
  });
});
