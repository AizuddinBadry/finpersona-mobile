import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Insights from './Insights';
import { insightsMock, claimableInsightsMock } from '@/mocks/seed';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('@/hooks/useInsights', () => ({
  useInsights: vi.fn(),
  useClaimableInsights: vi.fn(),
}));

import { useInsights, useClaimableInsights } from '@/hooks/useInsights';

function renderInsights() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/insights']}>
        <Insights />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockNavigate.mockReset();
  (useInsights as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    data: insightsMock,
  });
  (
    useClaimableInsights as unknown as ReturnType<typeof vi.fn>
  ).mockReturnValue({ data: claimableInsightsMock });
});

describe('Insights — period switcher (header)', () => {
  it('renders the Insights heading and Month period default-selected', () => {
    renderInsights();
    expect(
      screen.getByRole('heading', { name: 'Insights' }),
    ).toBeInTheDocument();
    const monthTab = screen.getByRole('tab', { name: 'Month' });
    expect(monthTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Week' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('switches selected period when Year is tapped', async () => {
    const user = userEvent.setup();
    renderInsights();
    const yearTab = screen.getByRole('tab', { name: 'Year' });
    await user.click(yearTab);
    expect(yearTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Month' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });
});

describe('Insights — Claimable tab (default)', () => {
  it('makes Claimable the default-active SegmentedTab', () => {
    renderInsights();
    expect(screen.getByRole('tab', { name: 'Claimable' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'All spend' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('shows REMAINING HEADROOM headline with RM amount and category count', () => {
    renderInsights();
    expect(screen.getByText('REMAINING HEADROOM')).toBeInTheDocument();
    // 8720 with en-MY locale → 8,720
    expect(screen.getByText('8,720')).toBeInTheDocument();
    expect(
      screen.getByText(/headroom across 3 reliefs/i),
    ).toBeInTheDocument();
  });

  it('renders the utilization donut with one arc per non-zero-cap segment', () => {
    const { container } = renderInsights();
    // claimableInsightsMock has 4 cap>0 segments. Sports has claimed=0 (faded only),
    // Internet has claimed=cap (solid only), the other two have both arcs.
    // We assert at least one data-arc-len element per segment code.
    const codes = ['internet', 'lifestyle', 'medical_health', 'sports'];
    for (const code of codes) {
      const arcs = container.querySelectorAll(`[data-segment="${code}"]`);
      expect(arcs.length).toBeGreaterThan(0);
    }
  });

  it('does NOT show All-spend content (line chart card / forecast strip)', () => {
    renderInsights();
    expect(screen.queryByText(/Total spent ·/)).not.toBeInTheDocument();
    expect(screen.queryByText(/FORECAST ·/)).not.toBeInTheDocument();
  });

  it('renders one row per category with RM claimed / RM cap text', () => {
    renderInsights();
    expect(screen.getByText('Internet subscription')).toBeInTheDocument();
    expect(screen.getByText('Lifestyle')).toBeInTheDocument();
    expect(screen.getByText('Medical')).toBeInTheDocument();
    expect(screen.getByText('Sports equipment')).toBeInTheDocument();
    // Lifestyle row: 1,800 / 2,500
    expect(
      screen.getByText(/RM 1,800 \/ RM 2,500/),
    ).toBeInTheDocument();
  });

  it('navigates to /activity?category=<code> when a row is tapped', async () => {
    const user = userEvent.setup();
    renderInsights();
    const lifestyleRow = screen.getByRole('button', {
      name: /view lifestyle receipts/i,
    });
    await user.click(lifestyleRow);
    expect(mockNavigate).toHaveBeenCalledWith('/activity?category=lifestyle');
  });

  it('renders an Other claimable row with — cap and routes to ?category=other-claimable', async () => {
    (
      useClaimableInsights as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValueOnce({
      data: {
        ...claimableInsightsMock,
        categories: [
          ...claimableInsightsMock.categories,
          {
            code: 'other-claimable',
            name: 'Other claimable',
            cap: 0,
            claimed: 220,
            pct: 0,
            color: '#A0A0B6',
            icon: 'receipt',
          },
        ],
      },
    });
    const user = userEvent.setup();
    renderInsights();
    expect(screen.getByText('Other claimable')).toBeInTheDocument();
    expect(screen.getByText(/RM 220 \/ —/)).toBeInTheDocument();
    const otherRow = screen.getByRole('button', {
      name: /view other claimable receipts/i,
    });
    await user.click(otherRow);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/activity?category=other-claimable',
    );
  });
});

describe('Insights — All-spend tab', () => {
  async function switchToAllSpend(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('tab', { name: 'All spend' }));
  }

  it('renders the total spent card with delta vs prior month after switching', async () => {
    const user = userEvent.setup();
    renderInsights();
    await switchToAllSpend(user);
    expect(screen.getByText('Total spent · April')).toBeInTheDocument();
    expect(screen.getByText('3,284')).toBeInTheDocument();
    expect(screen.getByText('−12%')).toBeInTheDocument();
    expect(screen.getByText(/vs March · RM 3,732/)).toBeInTheDocument();
  });

  it('renders all five spending categories after switching', async () => {
    const user = userEvent.setup();
    renderInsights();
    await switchToAllSpend(user);
    expect(screen.getByText('Dining')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText('Shopping')).toBeInTheDocument();
    expect(screen.getByText('Bills')).toBeInTheDocument();
    expect(screen.getByText('Coffee')).toBeInTheDocument();
  });

  it('renders the May forecast band after switching', async () => {
    const user = userEvent.setup();
    renderInsights();
    await switchToAllSpend(user);
    expect(screen.getByText('FORECAST · MAY')).toBeInTheDocument();
    expect(screen.getByText(/RM 3,420/)).toBeInTheDocument();
    expect(screen.getByText(/RM 3,200/)).toBeInTheDocument();
  });

  it('navigates to /activity (no params) when Details link is tapped', async () => {
    const user = userEvent.setup();
    renderInsights();
    await switchToAllSpend(user);
    const details = screen.getByRole('button', { name: 'Details' });
    await user.click(details);
    expect(mockNavigate).toHaveBeenCalledWith('/activity');
  });
});
