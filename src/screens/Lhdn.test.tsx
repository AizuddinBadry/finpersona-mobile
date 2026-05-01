import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Lhdn from './Lhdn';

// Signed-out: useLhdn is disabled, screen falls back to lhdnMock.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

function renderLhdn() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/lhdn']}>
        <Lhdn />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Lhdn', () => {
  it('renders the Tax claims heading and YA tag', () => {
    renderLhdn();
    expect(
      screen.getByRole('heading', { name: 'Tax claims' }),
    ).toBeInTheDocument();
    expect(screen.getByText('YA 2025 · LHDN')).toBeInTheDocument();
  });

  it('renders Total claimable label and at least one category name', () => {
    renderLhdn();
    expect(screen.getByText('Total claimable')).toBeInTheDocument();
    expect(screen.getByText('Lifestyle')).toBeInTheDocument();
  });

  it('renders the disclaimer footer', () => {
    renderLhdn();
    expect(
      screen.getByText(/Estimates only/),
    ).toBeInTheDocument();
  });
});
