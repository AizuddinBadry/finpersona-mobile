/**
 * useInsights / useClaimableInsights — react-query hooks backing the Insights
 * screen.
 *
 * useInsights returns the InsightsMock month-over-month shape Phase 2
 * renders, so the screen treats the static mock as a loading-state fallback.
 *
 * useClaimableInsights backs the Claimable tab — it aggregates is_claimable
 * receipts in the current tax year against active tax_categories caps. Errors
 * surface to the caller rather than being swallowed into a mock fallback so
 * real data issues don't get masked in production.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchAllReceiptsPage,
  fetchClaimableInsights as defaultFetchClaimableInsights,
  fetchClaimableReceiptsPage,
  fetchInsights,
  fetchReceiptsForCode,
  monthRange,
  RECEIPTS_PAGE_SIZE,
} from '@/lib/supabase/queries/insights';
import type { ReceiptListItem } from '@/lib/supabase/queries/insights';
import type { ClaimableInsights, InsightsMock } from '@/mocks/seed';

export function useInsights(month?: Date) {
  const { user } = useAuth();
  const monthKey = month
    ? `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
    : 'current';
  return useQuery<InsightsMock>({
    queryKey: ['insights', user?.id, monthKey],
    queryFn: () => fetchInsights(user!.id, month),
    enabled: !!user?.id,
  });
}

type UseClaimableInsightsDeps = {
  fetchClaimableInsights?: typeof defaultFetchClaimableInsights;
};

export function useClaimableInsights(deps: UseClaimableInsightsDeps = {}) {
  const { fetchClaimableInsights = defaultFetchClaimableInsights } = deps;
  const { user } = useAuth();
  const taxYear = new Date().getFullYear();

  return useQuery<ClaimableInsights>({
    queryKey: ['insights-claimable', user?.id, taxYear],
    queryFn: () => fetchClaimableInsights(user!.id, taxYear),
    enabled: Boolean(user),
  });
}

export function useReceiptsForCode(code: string | null) {
  const { user } = useAuth();
  const taxYear = new Date().getFullYear();
  return useQuery<ReceiptListItem[]>({
    queryKey: ['insights-receipts-code', user?.id, taxYear, code],
    queryFn: () => fetchReceiptsForCode(user!.id, taxYear, code!),
    enabled: Boolean(user) && code !== null,
  });
}

export function useClaimableReceiptsPage(page: number, search: string) {
  const { user } = useAuth();
  const taxYear = new Date().getFullYear();
  return useQuery<{ rows: ReceiptListItem[]; totalCount: number }>({
    queryKey: ['insights-receipts-page', user?.id, taxYear, page, search],
    queryFn: () => fetchClaimableReceiptsPage(user!.id, taxYear, page, search),
    enabled: Boolean(user),
    placeholderData: (prev) => prev,
  });
}

export function useAllReceiptsPage(page: number, search: string, month?: Date) {
  const { user } = useAuth();
  const { monthStart, monthEnd } = monthRange(month ?? new Date());
  return useQuery<{ rows: ReceiptListItem[]; totalCount: number }>({
    queryKey: ['insights-all-receipts-page', user?.id, monthStart, page, search],
    queryFn: () => fetchAllReceiptsPage(user!.id, monthStart, monthEnd, page, search),
    enabled: Boolean(user),
    placeholderData: (prev) => prev,
  });
}

export { RECEIPTS_PAGE_SIZE };
