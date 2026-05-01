/**
 * useHome — react-query hook backing the Home dashboard.
 *
 * Returns the same HomeMock shape Phase 2 renders, so the screen treats the
 * static mock as a loading-state fallback.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchHome } from '@/lib/supabase/queries/home';
import type { HomeMock } from '@/mocks/seed';

export function useHome() {
  const { user } = useAuth();
  return useQuery<HomeMock>({
    queryKey: ['home', user?.id],
    queryFn: () => fetchHome(user!.id),
    enabled: !!user?.id,
  });
}
