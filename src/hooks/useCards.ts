/**
 * useCards — react-query hook backing the Cards screen.
 *
 * Returns the same CardsMock shape Phase 2 renders, so the screen treats
 * the static mock as a loading-state fallback.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchCards } from '@/lib/supabase/queries/cards';
import type { CardsMock } from '@/mocks/seed';

export function useCards() {
  const { user } = useAuth();
  return useQuery<CardsMock>({
    queryKey: ['cards', user?.id],
    queryFn: () => fetchCards(user!.id),
    enabled: !!user?.id,
  });
}
