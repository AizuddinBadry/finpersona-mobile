/**
 * useInsights — react-query hook backing the Insights screen.
 *
 * Returns the same InsightsMock shape Phase 2 renders, so the screen treats
 * the static mock as a loading-state fallback.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchInsights } from '@/lib/supabase/queries/insights';
import type { InsightsMock } from '@/mocks/seed';

export function useInsights() {
  const { user } = useAuth();
  return useQuery<InsightsMock>({
    queryKey: ['insights', user?.id],
    queryFn: () => fetchInsights(user!.id),
    enabled: !!user?.id,
  });
}
