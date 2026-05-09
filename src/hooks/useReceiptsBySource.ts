/**
 * useReceiptsBySource — react-query hook returning receipts paid from a
 * given payment_sources.id. Used by the "View receipts" sheet on the
 * Sources screen. Disabled until both userId and sourceId are present so
 * the sheet doesn't fire a query before the user taps a card.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchReceiptsBySource,
  type SourceReceiptItem,
} from '@/lib/supabase/queries/sourceReceipts';

export function useReceiptsBySource(sourceId: string | null) {
  const { user } = useAuth();
  return useQuery<SourceReceiptItem[]>({
    queryKey: ['receipts-by-source', user?.id, sourceId],
    queryFn: () => fetchReceiptsBySource(user!.id, sourceId!),
    enabled: !!user?.id && !!sourceId,
  });
}
