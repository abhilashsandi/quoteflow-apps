import { getFlags } from './flags';

describe('getFlags', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns bff-gateway's resolved flags merged over the defaults", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ showSavingsBadge: true }),
    }) as unknown as typeof fetch;

    await expect(getFlags()).resolves.toEqual({ showSavingsBadge: true });
  });

  it('fails open to the defaults when bff-gateway responds with an error status', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    await expect(getFlags()).resolves.toEqual({ showSavingsBadge: false });
  });

  it('fails open to the defaults when the request throws', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    await expect(getFlags()).resolves.toEqual({ showSavingsBadge: false });
  });
});
