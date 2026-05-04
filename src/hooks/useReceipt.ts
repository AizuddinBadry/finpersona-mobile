/**
 * useReceipt / useUpdateReceipt / useDeleteReceipt — react-query hooks that
 * back the /receipts/:id detail screen. They wrap the bare query functions
 * in `src/lib/supabase/queries/receiptDetail.ts` so the screen never has to
 * know about supabase, userIds, or which other caches to invalidate.
 *
 *   useReceipt        read a single row (gated on auth + id)
 *   useUpdateReceipt  patch the row, then invalidate every screen that
 *                     aggregates from receipts (activity, home, insights,
 *                     lhdn, rewards) plus the receipt detail itself
 *   useDeleteReceipt  delete the row + same fan-out, minus the receipt key
 *                     since the caller is navigating away
 *
 * The optional `deps` arg follows the useCaptureFlow / useAdvisorSend
 * convention: tests inject stubbed query functions and never have to
 * re-mock the supabase client per hook.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchReceipt as defaultFetchReceipt,
  updateReceipt as defaultUpdateReceipt,
  deleteReceipt as defaultDeleteReceipt,
  type ReceiptRow,
  type ReceiptUpdate,
} from '@/lib/supabase/queries/receiptDetail';

type UseReceiptDeps = {
  fetchReceipt?: typeof defaultFetchReceipt;
};

type UseUpdateReceiptDeps = {
  updateReceipt?: typeof defaultUpdateReceipt;
};

type UseDeleteReceiptDeps = {
  deleteReceipt?: typeof defaultDeleteReceipt;
};

export type UpdateReceiptVars = { id: string } & ReceiptUpdate;
export type DeleteReceiptVars = { id: string };

export function useReceipt(id: string, deps: UseReceiptDeps = {}) {
  const { fetchReceipt = defaultFetchReceipt } = deps;
  const { user } = useAuth();
  const uid = user?.id ?? '';

  return useQuery<ReceiptRow>({
    queryKey: ['receipt', id],
    queryFn: () => fetchReceipt(id, uid),
    enabled: Boolean(user) && Boolean(id),
  });
}

/** Cache keys that aggregate from receipts and need refreshing on write. */
function aggregateKeys(uid: string): Array<readonly [string, string]> {
  return [
    ['activity', uid],
    ['home', uid],
    ['insights', uid],
    ['insights-claimable', uid],
    ['lhdn', uid],
    ['rewards', uid],
  ];
}

export function useUpdateReceipt(deps: UseUpdateReceiptDeps = {}) {
  const { updateReceipt = defaultUpdateReceipt } = deps;
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation<ReceiptRow, Error, UpdateReceiptVars>({
    mutationFn: (vars) => updateReceipt({ ...vars, userId: user?.id ?? '' }),
    onSuccess: (_data, vars) => {
      const uid = user?.id ?? '';
      for (const key of aggregateKeys(uid)) {
        qc.invalidateQueries({ queryKey: key });
      }
      // Also refresh the detail screen's own cache so the patched fields
      // appear without an extra round-trip.
      qc.invalidateQueries({ queryKey: ['receipt', vars.id] });
    },
  });
}

export function useDeleteReceipt(deps: UseDeleteReceiptDeps = {}) {
  const { deleteReceipt = defaultDeleteReceipt } = deps;
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation<{ id: string }, Error, DeleteReceiptVars>({
    mutationFn: (vars) => deleteReceipt({ ...vars, userId: user?.id ?? '' }),
    onSuccess: () => {
      const uid = user?.id ?? '';
      for (const key of aggregateKeys(uid)) {
        qc.invalidateQueries({ queryKey: key });
      }
      // Skip ['receipt', id] — the caller is navigating away from the
      // detail screen, so the cache entry will be evicted naturally.
    },
  });
}
