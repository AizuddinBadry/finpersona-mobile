import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/hooks/useAuth';
import { useCaptureFlow, formFromExtraction } from './useCaptureFlow';
import type { ExtractedReceiptData } from '@/lib/api/finpersona';

const mockedUseAuth = vi.mocked(useAuth);

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    qc,
    wrapper: ({ children }: { children: ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children),
  };
}

const sampleExtracted: ExtractedReceiptData = {
  merchant: 'Kinokuniya KLCC',
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

beforeEach(() => {
  mockedUseAuth.mockReturnValue({
    session: null,
    user: { id: 'u1' } as never,
    isLoading: false,
    isAuthenticated: true,
    signOut: vi.fn(),
  });
});

describe('formFromExtraction', () => {
  it('pre-fills form fields from Claude output and defaults currency to MYR', () => {
    const f = formFromExtraction({ ...sampleExtracted, currency: '' });
    expect(f).toEqual({
      merchantName: 'Kinokuniya KLCC',
      receiptDate: '2026-04-15',
      totalAmount: 142,
      currency: 'MYR',
      category: 'lifestyle',
      isClaimable: true,
      sourceId: '',
    });
  });

  it('seeds sourceId from a passed-in default', () => {
    const f = formFromExtraction(sampleExtracted, 'src-default');
    expect(f.sourceId).toBe('src-default');
  });

  it('falls back to null category when extraction has no suggestion', () => {
    const f = formFromExtraction({ ...sampleExtracted, suggested_category: '' });
    expect(f.category).toBeNull();
  });
});

describe('useCaptureFlow', () => {
  it('starts in idle phase', () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useCaptureFlow(), { wrapper });
    expect(result.current.phase).toBe('idle');
    expect(result.current.form).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });

  it('drives the happy path: capturing → uploading → extracting → review', async () => {
    const { wrapper } = makeWrapper();
    const capturePhoto = vi.fn().mockResolvedValue({ base64: 'AAA', mediaType: 'image/jpeg' });
    const uploadReceipt = vi.fn().mockResolvedValue({ url: 'https://b2/x', fileId: 'f1', fileName: 'n' });
    const extractReceipt = vi.fn().mockResolvedValue(sampleExtracted);
    const insertReceipt = vi.fn();

    const { result } = renderHook(
      () => useCaptureFlow({ capturePhoto, uploadReceipt, extractReceipt, insertReceipt }),
      { wrapper },
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.phase).toBe('review');
    expect(result.current.extracted).toEqual(sampleExtracted);
    expect(result.current.upload).toEqual({ url: 'https://b2/x', fileId: 'f1', fileName: 'n' });
    expect(result.current.form).toEqual({
      merchantName: 'Kinokuniya KLCC',
      receiptDate: '2026-04-15',
      totalAmount: 142,
      currency: 'MYR',
      category: 'lifestyle',
      isClaimable: true,
      sourceId: '',
    });
    // The base64 from capture flows into both upload + extract.
    expect(uploadReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ imageBase64: 'AAA', userId: 'u1', mediaType: 'image/jpeg' }),
    );
    expect(extractReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ imageBase64: 'AAA', mediaType: 'image/jpeg' }),
    );
  });

  it('errors when the user is not signed in', async () => {
    mockedUseAuth.mockReturnValue({
      session: null,
      user: null,
      isLoading: false,
      isAuthenticated: false,
      signOut: vi.fn(),
    });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useCaptureFlow(), { wrapper });
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.phase).toBe('error');
    expect(result.current.errorMessage).toMatch(/Sign in/);
  });

  it('captures upload errors into the error phase', async () => {
    const { wrapper } = makeWrapper();
    const capturePhoto = vi.fn().mockResolvedValue({ base64: 'AAA', mediaType: 'image/jpeg' });
    const uploadReceipt = vi.fn().mockRejectedValue(new Error('B2 down'));
    const { result } = renderHook(
      () => useCaptureFlow({ capturePhoto, uploadReceipt }),
      { wrapper },
    );
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.phase).toBe('error');
    expect(result.current.errorMessage).toBe('B2 down');
  });

  it('captures extract errors into the error phase', async () => {
    const { wrapper } = makeWrapper();
    const capturePhoto = vi.fn().mockResolvedValue({ base64: 'AAA', mediaType: 'image/jpeg' });
    const uploadReceipt = vi.fn().mockResolvedValue({ url: 'u', fileId: 'f', fileName: 'n' });
    const extractReceipt = vi.fn().mockRejectedValue(new Error('Claude rate limited'));
    const { result } = renderHook(
      () => useCaptureFlow({ capturePhoto, uploadReceipt, extractReceipt }),
      { wrapper },
    );
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.phase).toBe('error');
    expect(result.current.errorMessage).toBe('Claude rate limited');
  });

  it('seeds form.sourceId from the passed-in defaultSourceId after extraction', async () => {
    const { wrapper } = makeWrapper();
    const capturePhoto = vi.fn().mockResolvedValue({ base64: 'AAA', mediaType: 'image/jpeg' });
    const uploadReceipt = vi.fn().mockResolvedValue({ url: 'u', fileId: 'f', fileName: 'n' });
    const extractReceipt = vi.fn().mockResolvedValue(sampleExtracted);
    const { result } = renderHook(
      () =>
        useCaptureFlow({
          capturePhoto,
          uploadReceipt,
          extractReceipt,
          defaultSourceId: 'src-default',
        }),
      { wrapper },
    );
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.form?.sourceId).toBe('src-default');
  });

  it('confirm() inserts the receipt and transitions to done', async () => {
    const { wrapper, qc } = makeWrapper();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const capturePhoto = vi.fn().mockResolvedValue({ base64: 'AAA', mediaType: 'image/jpeg' });
    const uploadReceipt = vi.fn().mockResolvedValue({ url: 'https://b2/x', fileId: 'f1', fileName: 'n' });
    const extractReceipt = vi.fn().mockResolvedValue(sampleExtracted);
    const insertReceipt = vi.fn().mockResolvedValue({ id: 'new-id' });

    const { result } = renderHook(
      () =>
        useCaptureFlow({
          capturePhoto,
          uploadReceipt,
          extractReceipt,
          insertReceipt,
          defaultSourceId: 'src-default',
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.phase).toBe('review');

    await act(async () => {
      await result.current.confirm();
    });

    expect(result.current.phase).toBe('done');
    expect(result.current.insertedId).toBe('new-id');
    expect(insertReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        merchantName: 'Kinokuniya KLCC',
        imageUrl: 'https://b2/x',
        imageFileId: 'f1',
        extracted: sampleExtracted,
        sourceId: 'src-default',
      }),
    );
    // Receipt insert should bust the dependent query keys.
    const keys = invalidateSpy.mock.calls.map((c) => (c[0] as { queryKey: string[] }).queryKey[0]);
    expect(keys).toEqual(
      expect.arrayContaining(['home', 'insights', 'insights-claimable', 'lhdn', 'rewards']),
    );
  });

  it('captures insert errors into the error phase', async () => {
    const { wrapper } = makeWrapper();
    const capturePhoto = vi.fn().mockResolvedValue({ base64: 'AAA', mediaType: 'image/jpeg' });
    const uploadReceipt = vi.fn().mockResolvedValue({ url: 'u', fileId: 'f', fileName: 'n' });
    const extractReceipt = vi.fn().mockResolvedValue(sampleExtracted);
    const insertReceipt = vi.fn().mockRejectedValue(new Error('rls violation'));

    const { result } = renderHook(
      () => useCaptureFlow({ capturePhoto, uploadReceipt, extractReceipt, insertReceipt }),
      { wrapper },
    );
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      await result.current.confirm();
    });
    expect(result.current.phase).toBe('error');
    expect(result.current.errorMessage).toBe('rls violation');
  });

  it('setForm updates form fields without leaving review phase', async () => {
    const { wrapper } = makeWrapper();
    const capturePhoto = vi.fn().mockResolvedValue({ base64: 'AAA', mediaType: 'image/jpeg' });
    const uploadReceipt = vi.fn().mockResolvedValue({ url: 'u', fileId: 'f', fileName: 'n' });
    const extractReceipt = vi.fn().mockResolvedValue(sampleExtracted);

    const { result } = renderHook(
      () => useCaptureFlow({ capturePhoto, uploadReceipt, extractReceipt }),
      { wrapper },
    );
    await act(async () => {
      await result.current.start();
    });
    act(() => {
      result.current.setForm((f) => ({ ...f, merchantName: 'Edited Name' }));
    });
    await waitFor(() => {
      expect(result.current.form?.merchantName).toBe('Edited Name');
    });
    expect(result.current.phase).toBe('review');
  });

  it('reset() returns the hook to idle from any phase', async () => {
    const { wrapper } = makeWrapper();
    const capturePhoto = vi.fn().mockResolvedValue({ base64: 'AAA', mediaType: 'image/jpeg' });
    const uploadReceipt = vi.fn().mockResolvedValue({ url: 'u', fileId: 'f', fileName: 'n' });
    const extractReceipt = vi.fn().mockResolvedValue(sampleExtracted);

    const { result } = renderHook(
      () => useCaptureFlow({ capturePhoto, uploadReceipt, extractReceipt }),
      { wrapper },
    );
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.phase).toBe('review');
    act(() => {
      result.current.reset();
    });
    expect(result.current.phase).toBe('idle');
    expect(result.current.form).toBeNull();
    expect(result.current.extracted).toBeNull();
  });
});
