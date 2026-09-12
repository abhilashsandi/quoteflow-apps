import {
  INITIAL_QUOTE_SESSION,
  useQuoteSessionStore,
} from './quote-session.store.js';

describe('useQuoteSessionStore', () => {
  beforeEach(() => useQuoteSessionStore.getState().reset());

  it('starts at the initial (idle, empty) state', () => {
    const state = useQuoteSessionStore.getState();
    expect(state.quoteId).toBeNull();
    expect(state.status).toBe('idle');
  });

  it('setFieldValue merges into the answers for that page without clobbering other pages', () => {
    useQuoteSessionStore.getState().hydrate({
      ...INITIAL_QUOTE_SESSION,
      answers: {
        'driver-info': { firstName: 'Jane' },
        'vehicle-info': { make: 'Honda' },
      },
    });
    useQuoteSessionStore
      .getState()
      .setFieldValue('driver-info', 'lastName', 'Doe');

    expect(useQuoteSessionStore.getState().answers).toEqual({
      'driver-info': { firstName: 'Jane', lastName: 'Doe' },
      'vehicle-info': { make: 'Honda' },
    });
  });

  it('setStatus clears the error when moving to a non-error status', () => {
    useQuoteSessionStore.getState().setStatus('error', 'boom');
    expect(useQuoteSessionStore.getState().error).toBe('boom');
    useQuoteSessionStore.getState().setStatus('ready');
    expect(useQuoteSessionStore.getState().error).toBeNull();
  });

  it('reset returns to the initial state after being hydrated', () => {
    useQuoteSessionStore
      .getState()
      .hydrate({ ...INITIAL_QUOTE_SESSION, quoteId: 'q1', status: 'ready' });
    useQuoteSessionStore.getState().reset();
    expect(useQuoteSessionStore.getState()).toMatchObject(
      INITIAL_QUOTE_SESSION,
    );
  });
});
