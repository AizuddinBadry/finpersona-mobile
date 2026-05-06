import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Activity from './Activity';

// Signed-out: useActivity is disabled, screen falls back to activityMock.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const mod =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...mod, useNavigate: () => navigate };
});

function renderActivity(initialEntry = '/activity') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Activity />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Activity', () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  it('renders the Activity title', () => {
    renderActivity();
    expect(
      screen.getByRole('heading', { name: 'Activity' }),
    ).toBeInTheDocument();
  });

  it('renders the All filter chip as active by default', () => {
    renderActivity();
    const all = screen.getByRole('button', { name: 'All' });
    expect(all).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders at least 5 transaction names', () => {
    renderActivity();
    const names = [
      "Mama's Kitchen",
      'Kinokuniya KLCC',
      'Common Man Coffee',
      'Salary · Maybank',
      'Klinik Mediviron',
    ];
    for (const name of names) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it('toggles active state when Claimable chip is tapped', async () => {
    renderActivity();
    const all = screen.getByRole('button', { name: 'All' });
    const claimable = screen.getByRole('button', { name: /^Claimable$/ });

    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(claimable).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(claimable);

    expect(claimable).toHaveAttribute('aria-pressed', 'true');
    expect(all).toHaveAttribute('aria-pressed', 'false');
  });

  it('navigates to /receipts/:id when a receipt row is tapped', async () => {
    renderActivity();

    // First receipt row in the mock is "Mama's Kitchen" (id: 'a1').
    const row = screen.getByRole('button', {
      name: /View receipt Mama's Kitchen/i,
    });
    await userEvent.click(row);

    expect(navigate).toHaveBeenCalledWith('/receipts/a1');
  });

  // ─── ?category=<code> URL filter ──────────────────────────────────────────

  it('without ?category, no filter chip renders', () => {
    renderActivity();
    expect(screen.queryByText(/^Filtered:/)).not.toBeInTheDocument();
  });

  it('with ?category=lifestyle, only matching rows render', () => {
    renderActivity('/activity?category=lifestyle');

    // Lifestyle bucket: "Books & journals" → a2 Kinokuniya KLCC, a8 BookXcess.
    expect(screen.getByText('Kinokuniya KLCC')).toBeInTheDocument();
    expect(screen.getByText('BookXcess Mid Valley')).toBeInTheDocument();

    // Non-matching rows are filtered out.
    expect(screen.queryByText("Mama's Kitchen")).not.toBeInTheDocument();
    expect(screen.queryByText('Klinik Mediviron')).not.toBeInTheDocument();
    expect(screen.queryByText('Salary · Maybank')).not.toBeInTheDocument();
    expect(screen.queryByText('Shell Bangsar')).not.toBeInTheDocument();
  });

  it('renders a filter chip with the human-readable name and clear button', () => {
    renderActivity('/activity?category=medical_health');

    // Title-cased: 'medical_health' → 'Medical health'.
    const chip = screen.getByRole('button', { name: /Clear filter/i });
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent('Filtered: Medical health · ✕');
  });

  it('title-cases lifestyle_general → Lifestyle general in the chip', () => {
    renderActivity('/activity?category=lifestyle_general');
    const chip = screen.getByRole('button', { name: /Clear filter/i });
    expect(chip).toHaveTextContent('Filtered: Lifestyle general');
  });

  it('renders Other claimable for the synthetic other-claimable code', () => {
    renderActivity('/activity?category=other-claimable');
    const chip = screen.getByRole('button', { name: /Clear filter/i });
    expect(chip).toHaveTextContent('Filtered: Other claimable');
  });

  it('tapping the filter chip clears the filter', async () => {
    renderActivity('/activity?category=lifestyle');

    // Initially filtered: only lifestyle rows.
    expect(screen.queryByText("Mama's Kitchen")).not.toBeInTheDocument();
    const chip = screen.getByRole('button', { name: /Clear filter/i });

    await userEvent.click(chip);

    // Chip is gone, all rows return.
    expect(
      screen.queryByRole('button', { name: /Clear filter/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Mama's Kitchen")).toBeInTheDocument();
    expect(screen.getByText('Klinik Mediviron')).toBeInTheDocument();
    expect(screen.getByText('Salary · Maybank')).toBeInTheDocument();
  });

  it('shows empty state when filter matches zero rows', () => {
    // No activityMock row buckets to 'education' (no category contains
    // 'education', 'course', 'skill', or 'training').
    renderActivity('/activity?category=education');

    expect(
      screen.getByText(
        /No receipts in this category yet — start by tapping ＋ to capture one\./,
      ),
    ).toBeInTheDocument();
    // No transaction rows render.
    expect(screen.queryByText("Mama's Kitchen")).not.toBeInTheDocument();
    expect(screen.queryByText('Kinokuniya KLCC')).not.toBeInTheDocument();
  });

  it('?category=other-claimable filters to lhdn rows whose category does not bucket', () => {
    renderActivity('/activity?category=other-claimable');

    // None of the activityMock lhdn:true rows have a null categoryToCode
    // (they all bucket to 'lifestyle' or 'medical_health'), so the empty
    // state shows. Critically, the bucketed lhdn rows must NOT appear —
    // proving the special case isn't "show all claimable".
    expect(screen.queryByText('Kinokuniya KLCC')).not.toBeInTheDocument();
    expect(screen.queryByText('Klinik Mediviron')).not.toBeInTheDocument();
    expect(screen.queryByText('BookXcess Mid Valley')).not.toBeInTheDocument();
    expect(screen.queryByText('Guardian Pharmacy')).not.toBeInTheDocument();
    // And non-claimable rows must also NOT appear.
    expect(screen.queryByText("Mama's Kitchen")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /No receipts in this category yet — start by tapping ＋ to capture one\./,
      ),
    ).toBeInTheDocument();
  });
});
