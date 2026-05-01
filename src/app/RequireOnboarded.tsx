import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Splash from '@/screens/Splash';

export default function RequireOnboarded({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['profile.onboarding', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as { onboarding_completed: boolean };
    },
  });
  if (isLoading) return <Splash />;
  if (!data?.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
