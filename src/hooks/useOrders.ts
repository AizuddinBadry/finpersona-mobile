import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products: {
    title: string;
    images: string[] | null;
  } | null;
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_gateway: string | null;
  payment_channel: string | null;
  total_amount: number;
  subtotal: number;
  shipping_total: number;
  created_at: string;
  shipping_address: Record<string, string> | null;
  order_items: OrderItem[];
}

async function fetchOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, payment_status,
      payment_gateway, payment_channel,
      total_amount, subtotal, shipping_total, created_at,
      shipping_address,
      order_items(id, quantity, unit_price, subtotal,
        products(title, images))
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Order[];
}

async function fetchOrderDetail(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, payment_status,
      payment_gateway, payment_channel,
      total_amount, subtotal, shipping_total, created_at,
      shipping_address,
      order_items(id, quantity, unit_price, subtotal,
        products(title, images))
    `)
    .eq('id', orderId)
    .single();
  if (error) throw error;
  return data as Order | null;
}

export function useOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['orders', user?.id],
    queryFn: () => fetchOrders(user!.id),
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useOrderDetail(orderId: string | undefined) {
  return useQuery({
    queryKey: ['orders', 'detail', orderId],
    queryFn: () => fetchOrderDetail(orderId!),
    enabled: !!orderId,
    staleTime: 30_000,
  });
}
