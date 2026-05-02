import { describe, it, expect, vi, beforeEach } from 'vitest';

// supabase.auth.getSession() is consulted by both functions to attach a
// Bearer header. Mock the module so the test doesn't hit the network.
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tkn' } } }),
    },
  },
}));

vi.mock('@/lib/env', () => ({
  getEnv: () => ({
    SUPABASE_URL: 'u',
    SUPABASE_ANON_KEY: 'k',
    API_BASE_URL: 'https://api.test',
    APPLE_SERVICES_ID: '',
  }),
}));

import { uploadReceipt, extractReceipt } from './finpersona';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('uploadReceipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs base64 + userId to /api/upload and returns parsed result', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, url: 'https://b2/img.jpg', fileId: 'f1', fileName: 'n.jpg' }),
    );
    const result = await uploadReceipt({
      imageBase64: 'AAA',
      userId: 'u1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toEqual({ url: 'https://b2/img.jpg', fileId: 'f1', fileName: 'n.jpg' });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.test/api/upload',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer tkn',
        }),
      }),
    );
    const callArgs = fetchImpl.mock.calls[0]![1] as RequestInit;
    expect(JSON.parse(callArgs.body as string)).toEqual({
      image: 'AAA',
      userId: 'u1',
      contentType: 'image/jpeg',
    });
  });

  it('forwards a custom mediaType to the server', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, url: 'x', fileId: 'y', fileName: 'z' }),
    );
    await uploadReceipt({
      imageBase64: 'AAA',
      userId: 'u1',
      mediaType: 'image/png',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body as string);
    expect(body.contentType).toBe('image/png');
  });

  it('throws with the server error when success is false', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ success: false, error: 'B2 down' }, 500),
    );
    await expect(
      uploadReceipt({
        imageBase64: 'AAA',
        userId: 'u1',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow('B2 down');
  });
});

describe('extractReceipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs image + mediaType to /api/extract and returns parsed data', async () => {
    const data = {
      merchant: 'Kinokuniya',
      date: '2026-04-15',
      total: 142,
      currency: 'MYR',
      items: [],
      suggested_category: 'lifestyle',
      category_confidence: 0.9,
      reasoning: 'books',
      is_eligible: true,
      eligibility_explanation: 'lifestyle eligible',
      tax_relief_rules: [],
    };
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, data }),
    );
    const result = await extractReceipt({
      imageBase64: 'AAA',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toEqual(data);

    const url = fetchImpl.mock.calls[0]![0];
    expect(url).toBe('https://api.test/api/extract');
    const init = fetchImpl.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      image: 'AAA',
      mediaType: 'image/jpeg',
      isBusinessAccount: false,
    });
    // taxYear is intentionally undefined → let the server infer from date.
    expect(body.taxYear).toBeUndefined();
  });

  it('forwards a taxYear when given', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, data: { merchant: '', date: '', total: 0, currency: '', items: [], suggested_category: 'x', category_confidence: 0, reasoning: '', is_eligible: false, eligibility_explanation: '', tax_relief_rules: [] } }),
    );
    await extractReceipt({
      imageBase64: 'AAA',
      taxYear: 2025,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body as string);
    expect(body.taxYear).toBe(2025);
  });

  it('throws when extraction fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ success: false, error: 'Claude rate limited' }, 503),
    );
    await expect(
      extractReceipt({
        imageBase64: 'AAA',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow('Claude rate limited');
  });

  it('still throws something useful when the server returns no error string', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ success: false }, 500),
    );
    await expect(
      extractReceipt({
        imageBase64: 'AAA',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/500/);
  });
});
