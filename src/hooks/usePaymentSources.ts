/**
 * usePaymentSources — react-query hook backing the receipt source picker.
 *
 * Returns the raw PaymentSource rows (default first, then created_at asc) for
 * the signed-in user. Disabled until auth resolves so the query key stays
 * scoped to a real userId.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchPaymentSources,
  type PaymentSource,
} from '@/lib/supabase/queries/sources';

export function usePaymentSources() {
  const { user } = useAuth();
  return useQuery<PaymentSource[]>({
    queryKey: ['payment-sources', user?.id],
    queryFn: () => fetchPaymentSources(user!.id),
    enabled: !!user?.id,
  });
}
