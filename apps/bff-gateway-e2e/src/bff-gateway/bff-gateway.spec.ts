import axios from 'axios';

describe('GET /health', () => {
  it('returns ok against a real running instance of the app', async () => {
    const res = await axios.get('/health');
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ok');
    expect(res.data.service).toBe('bff-gateway');
  });
});

describe('POST /quotes (no live rating service in this e2e run)', () => {
  it('surfaces a 502 network_error rather than hanging or crashing the server', async () => {
    await expect(
      axios.post('/quotes', { carrierCode: 'acme' }),
    ).rejects.toMatchObject({
      response: { status: 502, data: { error: 'network_error' } },
    });
  });
});
