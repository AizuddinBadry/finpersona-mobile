import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Splash from '@/screens/Splash';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <Splash />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
