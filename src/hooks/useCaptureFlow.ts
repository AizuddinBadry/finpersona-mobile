/**
 * useCaptureFlow — orchestrates the receipt capture pipeline:
 *
 *   idle
 *    → start()    → capturing → uploading → extracting → review (form ready)
 *   review
 *    → confirm()  → saving → done
 *   any phase
 *    → reset()    → idle
 *   any failure
 *    → error (with .message + .retry())
 *
 * Each side-effecting step (capture, upload, extract, insert) is injectable
 * so the hook stays pure-testable. Production code wires the real adapters
 * through the default args.
 */
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { capturePhoto as defaultCapture, type CapturedPhoto } from '@/lib/camera';
import {
  uploadReceipt as defaultUpload,
  extractReceipt as defaultExtract,
  type ExtractedReceiptData,
  type UploadResult,
} from '@/lib/api/finpersona';
import {
  insertReceipt as defaultInsert,
  type ReceiptDraft,
} from '@/lib/supabase/queries/receiptInsert';

export type CapturePhase =
  | 'idle'
  | 'capturing'
  | 'uploading'
  | 'extracting'
  | 'review'
  | 'saving'
  | 'done'
  | 'error';

export type ReviewForm = {
  merchantName: string;
  receiptDate: string;
  totalAmount: number;
  currency: string;
  category: string | null;
  isClaimable: boolean;
  /**
   * payment_sources.id picked on the review step. The screen seeds this from
   * the user's `is_default` source via the `defaultSourceId` dep, but the user
   * can override it before saving.
   */
  sourceId: string;
};

export type CaptureFlowDeps = {
  capturePhoto?: () => Promise<CapturedPhoto>;
  uploadReceipt?: typeof defaultUpload;
  extractReceipt?: typeof defaultExtract;
  insertReceipt?: typeof defaultInsert;
  /**
   * The user's default payment_sources.id, fetched by the screen via
   * usePaymentSources(). Pre-populates `form.sourceId` when the flow
   * transitions to `review`. Empty string (or undefined) means "no default
   * available yet" — the user must pick before they can save.
   */
  defaultSourceId?: string;
};

export type CaptureFlowState = {
  phase: CapturePhase;
  errorMessage: string | null;
  /** Pre-filled form values once extraction completes — null until then. */
  form: ReviewForm | null;
  /** Raw extracted blob (we persist this on the row). */
  extracted: ExtractedReceiptData | null;
  /** Uploaded image metadata — null when extraction succeeded but upload failed. */
  upload: UploadResult | null;
  /** Inserted row id once saved. */
  insertedId: string | null;
};

const INITIAL_STATE: CaptureFlowState = {
  phase: 'idle',
  errorMessage: null,
  form: null,
  extracted: null,
  upload: null,
  insertedId: null,
};

/**
 * Initial form values pre-filled from Claude's extraction. `sourceId` cannot
 * come from the OCR blob — the screen passes the user's default
 * payment_sources.id in (see `useCaptureFlow`'s `defaultSourceId` dep).
 */
export function formFromExtraction(
  e: ExtractedReceiptData,
  defaultSourceId = '',
): ReviewForm {
  return {
    merchantName: e.merchant,
    receiptDate: e.date,
    totalAmount: e.total,
    currency: e.currency || 'MYR',
    category: e.suggested_category || null,
    isClaimable: e.is_eligible,
    sourceId: defaultSourceId,
  };
}

export function useCaptureFlow(deps: CaptureFlowDeps = {}) {
  const {
    capturePhoto = defaultCapture,
    uploadReceipt = defaultUpload,
    extractReceipt = defaultExtract,
    insertReceipt = defaultInsert,
    defaultSourceId = '',
  } = deps;
  const { user } = useAuth();
  const qc = useQueryClient();

  const [state, setState] = useState<CaptureFlowState>(INITIAL_STATE);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  const setForm = useCallback((updater: (prev: ReviewForm) => ReviewForm) => {
    setState((s) => (s.form ? { ...s, form: updater(s.form) } : s));
  }, []);

  const start = useCallback(async () => {
    if (!user?.id) {
      setState({ ...INITIAL_STATE, phase: 'error', errorMessage: 'Sign in to scan receipts' });
      return;
    }
    setState({ ...INITIAL_STATE, phase: 'capturing' });
    try {
      const photo = await capturePhoto();

      setState((s) => ({ ...s, phase: 'uploading' }));
      const upload = await uploadReceipt({
        imageBase64: photo.base64,
        userId: user.id,
        mediaType: photo.mediaType,
      });

      setState((s) => ({ ...s, phase: 'extracting', upload }));
      const extracted = await extractReceipt({
        imageBase64: photo.base64,
        mediaType: photo.mediaType,
      });

      setState((s) => ({
        ...s,
        phase: 'review',
        extracted,
        form: formFromExtraction(extracted, defaultSourceId),
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        phase: 'error',
        errorMessage: err instanceof Error ? err.message : 'Capture failed',
      }));
    }
  }, [capturePhoto, uploadReceipt, extractReceipt, user?.id, defaultSourceId]);

  const confirm = useCallback(async () => {
    if (!user?.id || !state.extracted || !state.form) return;
    setState((s) => ({ ...s, phase: 'saving', errorMessage: null }));
    try {
      const draft: ReceiptDraft = {
        userId: user.id,
        merchantName: state.form.merchantName,
        receiptDate: state.form.receiptDate,
        totalAmount: state.form.totalAmount,
        currency: state.form.currency,
        category: state.form.category,
        isClaimable: state.form.isClaimable,
        imageUrl: state.upload?.url ?? null,
        imageFileId: state.upload?.fileId ?? null,
        extracted: state.extracted,
        sourceId: state.form.sourceId,
      };
      const { id } = await insertReceipt(draft);
      // The new row affects every screen that aggregates from receipts.
      // The DB trigger (migration 020/021) deducts total_amount from the
      // chosen payment_sources.balance on insert, so we also need to refresh
      // the cards cache and the per-source receipts list — without this the
      // Sources screen keeps showing the pre-deduction balance.
      qc.invalidateQueries({ queryKey: ['home'] });
      qc.invalidateQueries({ queryKey: ['insights'] });
      qc.invalidateQueries({ queryKey: ['insights-claimable'] });
      qc.invalidateQueries({ queryKey: ['lhdn'] });
      qc.invalidateQueries({ queryKey: ['rewards'] });
      qc.invalidateQueries({ queryKey: ['cards', user?.id] });
      qc.invalidateQueries({ queryKey: ['payment-sources', user?.id] });
      qc.invalidateQueries({ queryKey: ['receipts-by-source', user?.id, state.form.sourceId] });
      setState((s) => ({ ...s, phase: 'done', insertedId: id }));
    } catch (err) {
      setState((s) => ({
        ...s,
        phase: 'error',
        errorMessage: err instanceof Error ? err.message : 'Save failed',
      }));
    }
  }, [insertReceipt, qc, state.extracted, state.form, state.upload, user?.id]);

  return {
    ...state,
    start,
    confirm,
    reset,
    setForm,
  };
}
