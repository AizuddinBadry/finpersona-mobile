import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useAuthBootstrap } from '@/hooks/useAuth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export default function Providers({ children }: { children: ReactNode }) {
  useAuthBootstrap();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
