import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RequireOnboarded from './RequireOnboarded';

const singleMock = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => singleMock(),
        }),
      }),
    }),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

function renderWithRouter() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <RequireOnboarded>
                <div>Home content</div>
              </RequireOnboarded>
            }
          />
          <Route path="/onboarding" element={<div>Onboarding stub</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RequireOnboarded', () => {
  beforeEach(() => singleMock.mockReset());

  it('redirects to /onboarding when onboarding_completed is false', async () => {
    singleMock.mockResolvedValue({ data: { onboarding_completed: false }, error: null });
    renderWithRouter();
    await waitFor(() =>
      expect(screen.getByText(/onboarding stub/i)).toBeInTheDocument(),
    );
  });

  it('renders children when onboarding_completed is true', async () => {
    singleMock.mockResolvedValue({ data: { onboarding_completed: true }, error: null });
    renderWithRouter();
    await waitFor(() => expect(screen.getByText(/home content/i)).toBeInTheDocument());
  });
});
