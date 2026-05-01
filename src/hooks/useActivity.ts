/**
 * useActivity — react-query hook backing the Activity screen.
 *
 * Returns the same ActivityMock shape Phase 2 already renders, so the
 * screen treats the static mock as a loading-state fallback:
 *   const { data = activityMock } = useActivity();
 *
 * Disabled until we have a userId. Defaults from Providers.tsx apply
 * (staleTime 30s, retry 1).
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchActivity } from '@/lib/supabase/queries/activity';
import type { ActivityMock } from '@/mocks/seed';

export function useActivity() {
  const { user } = useAuth();
  return useQuery<ActivityMock>({
    queryKey: ['activity', user?.id],
    queryFn: () => fetchActivity(user!.id),
    enabled: !!user?.id,
  });
}
