/**
 * useMarketplaceProducts — fetches active products from the Supabase
 * `products` table and adapts them to the MarketplaceItem shape.
 *
 * Falls back to marketplaceMock.products while loading or when the
 * table is empty, so the UI is never blank.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { marketplaceMock } from '@/mocks/seed';
import type { MarketplaceItem } from '@/mocks/seed';

type IconName = MarketplaceItem['iconName'];

const CATEGORY_ICON: Record<string, IconName> = {
  lifestyle: 'book',
  sports: 'pulse',
  skills: 'sparkle',
  medical: 'medical',
  insurance: 'shield',
  technology: 'flash',
  education: 'sparkle',
  fitness: 'pulse',
};

const CATEGORY_TINT: Record<string, string> = {
  lifestyle: 'linear-gradient(135deg,#FFE5D2 0%,#FFC7E0 100%)',
  sports: 'linear-gradient(135deg,#D4F5E3 0%,#A8E5C4 100%)',
  skills: 'linear-gradient(135deg,#FFE9C2 0%,#FFD089 100%)',
  medical: 'linear-gradient(135deg,#FFE0E2 0%,#FFB8BD 100%)',
  insurance: 'linear-gradient(135deg,#E3E4FF 0%,#C4C7FF 100%)',
  technology: 'linear-gradient(135deg,#D4F0FF 0%,#A8DEFF 100%)',
  education: 'linear-gradient(135deg,#FFE9C2 0%,#FFD089 100%)',
  fitness: 'linear-gradient(135deg,#D4F5E3 0%,#A8E5C4 100%)',
};

const DEFAULT_ICON: IconName = 'star';
const DEFAULT_TINT = 'linear-gradient(135deg,#EEE 0%,#DDD 100%)';

interface DbProduct {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string | null;
  type: 'product' | 'service';
  images: string[] | null;
}

function toMarketplaceItem(p: DbProduct): MarketplaceItem {
  const cat = (p.category ?? '').toLowerCase();
  return {
    id: p.id,
    name: p.title,
    sub: '',
    price: p.price,
    categoryId: p.category ?? 'lifestyle',
    iconName: CATEGORY_ICON[cat] ?? DEFAULT_ICON,
    tint: CATEGORY_TINT[cat] ?? DEFAULT_TINT,
    description: p.description ?? '',
    kind: p.type,
    images: p.images?.length ? p.images : undefined,
  };
}

async function fetchMarketplaceProducts(): Promise<MarketplaceItem[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, title, description, price, category, type, images')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data?.length) return marketplaceMock.products;
  return data.map(toMarketplaceItem);
}

export function useMarketplaceProducts() {
  return useQuery<MarketplaceItem[]>({
    queryKey: ['marketplace-products'],
    queryFn: fetchMarketplaceProducts,
    staleTime: 5 * 60 * 1000,
    placeholderData: marketplaceMock.products,
  });
}
