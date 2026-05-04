import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from './Home';

// Signed-out: useHome is disabled, screen falls back to homeMock.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const mod =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...mod, useNavigate: () => navigate };
});

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

  it('navigates to /settings when the header avatar is tapped', async () => {
    navigate.mockClear();
    renderHome();

    const button = screen.getByRole('button', { name: /Open settings/i });
    await userEvent.click(button);

    expect(navigate).toHaveBeenCalledWith('/settings');
  });
});
