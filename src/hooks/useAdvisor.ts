/**
 * useAdvisor — react-query hook backing the Advisor screen.
 *
 * Read-only thread display: returns the AdvisorMock shape Phase 2 renders so
 * the screen treats the static mock as a loading-state fallback. The composer
 * "Send" UI stays a placeholder until the assistant write/stream pipeline is
 * wired in a later phase.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchAdvisor } from '@/lib/supabase/queries/advisor';
import type { AdvisorMock } from '@/mocks/seed';

export function useAdvisor() {
  const { user } = useAuth();
  return useQuery<AdvisorMock>({
    queryKey: ['advisor', user?.id],
    queryFn: () => fetchAdvisor(user!.id),
    enabled: !!user?.id,
  });
}
