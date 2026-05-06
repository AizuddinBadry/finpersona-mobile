/**
 * Travel queries — payment sources for the FinTravel planning wizard.
 *
 * The wizard needs a lightweight list of sources (id, name, type, balance)
 * so the user can pick which wallets/cards to allocate to the trip budget.
 * Full card shaping (gradients, last4, etc.) lives in cards.ts; this file
 * returns only what the travel planner needs.
 */
import { supabase } from '@/lib/supabase/client';

export type TravelSource = {
  id: string;
  name: string;
  source_type: string;
  balance: number;
  is_default: boolean;
};

export async function fetchTravelSources(userId: string): Promise<TravelSource[]> {
  const { data, error } = await supabase
    .from('payment_sources')
    .select('id, name, source_type, balance, is_default')
    .eq('user_id', userId)
    .order('is_default', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    source_type: r.source_type as string,
    balance: Number(r.balance),
    is_default: Boolean(r.is_default),
  }));
}
