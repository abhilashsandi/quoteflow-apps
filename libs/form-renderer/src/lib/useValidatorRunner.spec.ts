import { renderHook } from '@testing-library/react';
import { useValidatorRunner } from './useValidatorRunner.js';
import * as validatorLoader from './validator-loader.js';

function mockManifestFetch(manifest: unknown): jest.Mock {
  const mockFetch = jest
    .fn()
    .mockResolvedValue({ json: () => Promise.resolve(manifest) });
  global.fetch = mockFetch as unknown as typeof fetch;
  return mockFetch;
}

describe('useValidatorRunner', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns valid:true without any network call when no baseUrl is given', async () => {
    const mockFetch = mockManifestFetch({ configs: {}, validators: null });
    const { result } = renderHook(() => useValidatorRunner(undefined));
    const outcome = await result.current.validate('ssn', '123');
    expect(outcome).toEqual({ valid: true });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns valid:true when the manifest has no validators bundle published yet', async () => {
    mockManifestFetch({ configs: {}, validators: null });
    const { result } = renderHook(() =>
      useValidatorRunner('http://localhost:4000'),
    );
    const outcome = await result.current.validate('ssn', '123');
    expect(outcome).toEqual({ valid: true });
  });

  it('fetches the manifest once and reuses it across multiple validate() calls', async () => {
    const mockFetch = mockManifestFetch({
      configs: {},
      validators: '/bundles/validators/index-ABC.js',
    });
    jest
      .spyOn(validatorLoader, 'loadValidatorsModule')
      .mockResolvedValue({ validators: { ssn: () => ({ valid: true }) } });

    const { result } = renderHook(() =>
      useValidatorRunner('http://localhost:4000'),
    );
    await result.current.validate('ssn', '123-45-6789');
    await result.current.validate('ssn', '000-00-0000');

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('resolves the validators bundle URL relative to the rating service base URL', async () => {
    mockManifestFetch({
      configs: {},
      validators: '/bundles/validators/index-ABC.js',
    });
    const loadSpy = jest
      .spyOn(validatorLoader, 'loadValidatorsModule')
      .mockResolvedValue({ validators: { ssn: () => ({ valid: true }) } });

    const { result } = renderHook(() =>
      useValidatorRunner('http://localhost:4000'),
    );
    await result.current.validate('ssn', '123');

    expect(loadSpy).toHaveBeenCalledWith(
      'http://localhost:4000/bundles/validators/index-ABC.js',
    );
  });

  it('runs the named validator and returns its result', async () => {
    mockManifestFetch({
      configs: {},
      validators: '/bundles/validators/index-ABC.js',
    });
    jest.spyOn(validatorLoader, 'loadValidatorsModule').mockResolvedValue({
      validators: {
        ssn: (v: string) => ({ valid: v.length === 3, message: 'bad ssn' }),
      },
    });

    const { result } = renderHook(() =>
      useValidatorRunner('http://localhost:4000'),
    );
    expect(await result.current.validate('ssn', 'abc')).toEqual({
      valid: true,
      message: 'bad ssn',
    });
    expect(await result.current.validate('ssn', 'a')).toEqual({
      valid: false,
      message: 'bad ssn',
    });
  });

  it('returns valid:true for a validator name the bundle does not export', async () => {
    mockManifestFetch({
      configs: {},
      validators: '/bundles/validators/index-ABC.js',
    });
    jest
      .spyOn(validatorLoader, 'loadValidatorsModule')
      .mockResolvedValue({ validators: {} });

    const { result } = renderHook(() =>
      useValidatorRunner('http://localhost:4000'),
    );
    expect(await result.current.validate('unknown', 'x')).toEqual({
      valid: true,
    });
  });
});
