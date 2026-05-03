import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReceiptRow } from '@/lib/supabase/queries/receiptDetail';
import ReceiptDetail from './ReceiptDetail';

// Spy on useNavigate / useParams so the screen runs against fake router state.
const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const mod = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...mod,
    useNavigate: () => navigate,
    useParams: () => ({ id: 'r-1' }),
  };
});

// Mock the receipt hook directly so tests don't need a real Supabase chain.
vi.mock('@/hooks/useReceipt', () => ({
  useReceipt: vi.fn(),
  useUpdateReceipt: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  })),
  useDeleteReceipt: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  })),
}));

import { useReceipt } from '@/hooks/useReceipt';
const mockedUseReceipt = vi.mocked(useReceipt);

type ReceiptQueryResult = UseQueryResult<ReceiptRow, Error>;

function loadingResult(): ReceiptQueryResult {
  return {
    data: undefined,
    isLoading: true,
    isError: false,
    isSuccess: false,
    error: null,
    status: 'pending',
  } as unknown as ReceiptQueryResult;
}

function errorResult(): ReceiptQueryResult {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    isSuccess: false,
    error: new Error('not found'),
    status: 'error',
  } as unknown as ReceiptQueryResult;
}

function successResult(row: ReceiptRow): ReceiptQueryResult {
  return {
    data: row,
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
    status: 'success',
  } as unknown as ReceiptQueryResult;
}

const sampleRow: ReceiptRow = {
  id: 'r-1',
  user_id: 'u-1',
  merchant_name: 'Kinokuniya KLCC',
  receipt_date: '2026-04-15',
  total_amount: 142.5,
  currency: 'MYR',
  category: 'Books',
  is_claimable: true,
  image_url: 'https://example.com/img.png',
  extracted_data: {
    reasoning: 'Detected book purchase based on line items.',
    eligibility_explanation: 'Books qualify under LHDN section 46.',
  },
  created_at: '2026-04-15T10:00:00.000Z',
};

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/receipts/r-1']}>
      <ReceiptDetail />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  navigate.mockReset();
  mockedUseReceipt.mockReset();
});

describe('ReceiptDetail', () => {
  it('renders a skeleton while loading', () => {
    mockedUseReceipt.mockReturnValue(loadingResult());
    renderScreen();
    expect(screen.getByTestId('receipt-detail-skeleton')).toBeInTheDocument();
  });

  it('renders the not-found state with a Back to Activity link', () => {
    mockedUseReceipt.mockReturnValue(errorResult());
    renderScreen();
    expect(screen.getByText('Receipt not found')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Back to Activity/i });
    expect(link).toHaveAttribute('href', '/activity');
  });

  it('renders all expected fields when the receipt loads', () => {
    mockedUseReceipt.mockReturnValue(successResult(sampleRow));
    renderScreen();

    expect(screen.getByText('Kinokuniya KLCC')).toBeInTheDocument();
    // Date formatted via toLocaleDateString('en-GB', day/month/year)
    expect(screen.getByText('15 April 2026')).toBeInTheDocument();
    // Total formatted with RM prefix when currency is MYR
    expect(screen.getByText('RM 142.50')).toBeInTheDocument();
    // Category chip
    expect(screen.getByText('Books')).toBeInTheDocument();
    // Claimable indicator (✓ for true)
    expect(screen.getByTestId('receipt-claimable')).toHaveTextContent('✓');
    // AI reasoning section row is present (collapsed by default)
    expect(
      screen.getByRole('button', { name: /AI reasoning/i }),
    ).toBeInTheDocument();
  });

  it('Back button calls navigate(-1)', async () => {
    mockedUseReceipt.mockReturnValue(successResult(sampleRow));
    renderScreen();
    await userEvent.click(screen.getByRole('button', { name: /^Back$/i }));
    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it('tapping the AI reasoning section toggles it open', async () => {
    mockedUseReceipt.mockReturnValue(successResult(sampleRow));
    renderScreen();

    // Body text not visible while collapsed.
    expect(
      screen.queryByText('Detected book purchase based on line items.'),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /AI reasoning/i }),
    );

    expect(
      screen.getByText('Detected book purchase based on line items.'),
    ).toBeInTheDocument();
  });
});
