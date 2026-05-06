/**
 * useCommitments — react-query hook backing the Commitments section of
 * the Cards screen. Falls back to an empty array while loading so the
 * screen renders without waiting for the query.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchCommitments } from '@/lib/supabase/queries/commitments';
import type { Commitment } from '@/mocks/seed';

export function useCommitments() {
  const { user } = useAuth();
  return useQuery<Commitment[]>({
    queryKey: ['commitments', user?.id],
    queryFn: () => fetchCommitments(user!.id),
    enabled: !!user?.id,
  });
}
