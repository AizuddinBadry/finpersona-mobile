/**
 * useLhdn — react-query hook backing the LHDN tax-claims screen.
 *
 * Returns the same LhdnMock shape Phase 2 renders, so the screen treats the
 * static mock as a loading-state fallback.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchLhdn } from '@/lib/supabase/queries/lhdn';
import type { LhdnMock } from '@/mocks/seed';

export function useLhdn() {
  const { user } = useAuth();
  return useQuery<LhdnMock>({
    queryKey: ['lhdn', user?.id],
    queryFn: () => fetchLhdn(user!.id),
    enabled: !!user?.id,
  });
}
