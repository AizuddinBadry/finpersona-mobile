/**
 * useLhdn — react-query hooks backing the LHDN tax-claims screen.
 *
 * Returns the same LhdnMock shape Phase 2 renders, so the screen treats the
 * static mock as a loading-state fallback.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchLhdn, fetchCategoryReceipts } from '@/lib/supabase/queries/lhdn';
import type { LhdnMock } from '@/mocks/seed';
import type { ReceiptRow } from '@/lib/supabase/queries/lhdn';

export const DEFAULT_TAX_YEAR = 2025;

export function useLhdn(taxYear = DEFAULT_TAX_YEAR) {
  const { user } = useAuth();
  return useQuery<LhdnMock>({
    queryKey: ['lhdn', user?.id, taxYear],
    queryFn: () => fetchLhdn(user!.id, taxYear),
    enabled: !!user?.id,
  });
}

export function useCategoryReceipts(code: string | null, taxYear = DEFAULT_TAX_YEAR) {
  const { user } = useAuth();
  return useQuery<ReceiptRow[]>({
    queryKey: ['lhdn-category-receipts', user?.id, taxYear, code],
    queryFn: () => fetchCategoryReceipts(user!.id, taxYear, code!),
    enabled: !!user?.id && !!code,
  });
}
