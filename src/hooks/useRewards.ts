/**
 * useRewards — react-query hook backing the Rewards screen.
 *
 * Returns the same RewardsMock shape Phase 2 renders, so the screen treats
 * the static mock as a loading-state fallback.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchRewards } from '@/lib/supabase/queries/rewards';
import type { RewardsMock } from '@/mocks/seed';

export function useRewards() {
  const { user } = useAuth();
  return useQuery<RewardsMock>({
    queryKey: ['rewards', user?.id],
    queryFn: () => fetchRewards(user!.id),
    enabled: !!user?.id,
  });
}
