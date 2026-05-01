import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from './Home';

// Signed-out: useHome is disabled, screen falls back to homeMock.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

function renderHome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/']}>
        <Home />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Home', () => {
  it('renders the personalized greeting', () => {
    renderHome();
    expect(screen.getByText('Good morning, Aizuddin')).toBeInTheDocument();
  });

  it('renders the main MYR balance', () => {
    renderHome();
    expect(screen.getByText('RM 12,840.50')).toBeInTheDocument();
  });

  it('renders the Recent transactions header', () => {
    renderHome();
    expect(screen.getByText('Recent')).toBeInTheDocument();
  });

  it('renders at least one transaction row name', () => {
    renderHome();
    expect(screen.getByText('Mak Cik Nasi Lemak')).toBeInTheDocument();
  });
});
