import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Advisor from './Advisor';

// Signed-out: useAdvisor is disabled, screen falls back to advisorMock.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

function renderAdvisor() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/advisor']}>
        <Advisor />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Advisor', () => {
  it('renders the Finpersona header and online subtitle', () => {
    renderAdvisor();
    expect(
      screen.getByRole('heading', { name: 'Finpersona' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your financial analyst · online/),
    ).toBeInTheDocument();
  });

  it('renders the dining chart bubble with delta', () => {
    renderAdvisor();
    expect(screen.getByText('30-day · Dining')).toBeInTheDocument();
    expect(screen.getByText('RM 666')).toBeInTheDocument();
    expect(screen.getByText('+38%')).toBeInTheDocument();
  });

  it('renders all three recommendation rows', () => {
    renderAdvisor();
    expect(
      screen.getByText('Cap weekend delivery to 1 order'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Move 2 streaming services to family plans'),
    ).toBeInTheDocument();
    expect(screen.getByText('Auto-tag medical → LHDN')).toBeInTheDocument();
  });

  it('renders the composer placeholder and suggestion chips', () => {
    renderAdvisor();
    expect(screen.getByText('Ask Finpersona…')).toBeInTheDocument();
    expect(screen.getByText('Why is dining up?')).toBeInTheDocument();
    expect(screen.getByText('Forecast May')).toBeInTheDocument();
  });
});
