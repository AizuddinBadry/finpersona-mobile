/**
 * useInsights / useClaimableInsights — react-query hooks backing the Insights
 * screen.
 *
 * useInsights returns the InsightsMock month-over-month shape Phase 2
 * renders, so the screen treats the static mock as a loading-state fallback.
 *
 * useClaimableInsights backs the Claimable tab — it aggregates is_claimable
 * receipts in the current tax year against active tax_categories caps. On
 * any error it falls back to claimableInsightsMock so the donut still
 * renders something while the data layer or RLS catches up.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchClaimableInsights as defaultFetchClaimableInsights,
  fetchInsights,
} from '@/lib/supabase/queries/insights';
import type { ClaimableInsights, InsightsMock } from '@/mocks/seed';
import { claimableInsightsMock } from '@/mocks/seed';

export function useInsights() {
  const { user } = useAuth();
  return useQuery<InsightsMock>({
    queryKey: ['insights', user?.id],
    queryFn: () => fetchInsights(user!.id),
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
    queryFn: async () => {
      try {
        return await fetchClaimableInsights(user!.id, taxYear);
      } catch {
        // Same fallback semantics as fetchLhdn's empty-cats fallback: keep the
        // donut rendering against the mock when the live read fails.
        return claimableInsightsMock;
      }
    },
    enabled: Boolean(user),
  });
}
