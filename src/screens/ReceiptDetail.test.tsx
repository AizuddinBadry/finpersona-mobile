import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
// useUpdateReceipt is controllable per-test via setUpdateMock below.
type UpdateStub = {
  mutate: ReturnType<typeof vi.fn>;
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: ReturnType<typeof vi.fn>;
};

let currentUpdate: UpdateStub;
let currentDelete: DeleteStub;

function makeUpdate(overrides: Partial<UpdateStub> = {}): UpdateStub {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    ...overrides,
  };
}

type DeleteStub = {
  mutate: ReturnType<typeof vi.fn>;
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: ReturnType<typeof vi.fn>;
};

function makeDelete(overrides: Partial<DeleteStub> = {}): DeleteStub {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({ id: 'r-1' }),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    ...overrides,
  };
}

vi.mock('@/hooks/useReceipt', () => ({
  useReceipt: vi.fn(),
  useUpdateReceipt: vi.fn(() => currentUpdate),
  useDeleteReceipt: vi.fn(() => currentDelete),
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
  currentUpdate = makeUpdate();
  currentDelete = makeDelete();
});

afterEach(() => {
  vi.useRealTimers();
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

  // ── Task 6: edit / save / cancel ──────────────────────────────────────────

  it('tapping Edit reveals editable inputs and swaps header to Cancel/Save', async () => {
    mockedUseReceipt.mockReturnValue(successResult(sampleRow));
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: /^Edit$/i }));

    // Merchant input is now editable.
    const merchantInput = screen.getByLabelText(/Merchant/i);
    expect(merchantInput).toBeInTheDocument();
    expect(merchantInput).toHaveValue('Kinokuniya KLCC');

    // Header swaps to Cancel + Save; back arrow gone.
    expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Save$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Back$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Edit$/i })).not.toBeInTheDocument();
  });

  it('tapping Cancel returns to view without calling mutateAsync', async () => {
    mockedUseReceipt.mockReturnValue(successResult(sampleRow));
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: /^Edit$/i }));
    expect(screen.getByLabelText(/Merchant/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Cancel$/i }));

    expect(screen.queryByLabelText(/Merchant/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Edit$/i })).toBeInTheDocument();
    expect(currentUpdate.mutateAsync).not.toHaveBeenCalled();
  });

  it('editing merchant then Save calls mutateAsync with the full edited form and returns to view', async () => {
    mockedUseReceipt.mockReturnValue(successResult(sampleRow));
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: /^Edit$/i }));

    const merchantInput = screen.getByLabelText(/Merchant/i);
    await user.clear(merchantInput);
    await user.type(merchantInput, 'New Merchant');

    await user.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(currentUpdate.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'r-1',
          merchantName: 'New Merchant',
          receiptDate: '2026-04-15',
          totalAmount: 142.5,
          currency: 'MYR',
          category: 'Books',
          isClaimable: true,
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Edit$/i })).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/Merchant/i)).not.toBeInTheDocument();
  });

  it('shows a Saved toast after a successful save', async () => {
    mockedUseReceipt.mockReturnValue(successResult(sampleRow));
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: /^Edit$/i }));
    await user.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(screen.getByText(/^Saved$/i)).toBeInTheDocument();
    });
  });

  it('shows an error banner and keeps the user in edit phase on save failure', async () => {
    mockedUseReceipt.mockReturnValue(successResult(sampleRow));
    currentUpdate = makeUpdate({
      mutateAsync: vi.fn().mockRejectedValue(new Error('Network down')),
    });
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: /^Edit$/i }));

    const merchantInput = screen.getByLabelText(/Merchant/i);
    await user.clear(merchantInput);
    await user.type(merchantInput, 'Half edit');

    await user.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Network down/)).toBeInTheDocument();
    });

    // Edits preserved — input still on screen with the typed value.
    expect(screen.getByLabelText(/Merchant/i)).toHaveValue('Half edit');
  });

  it('disables Cancel and Save while the mutation is pending', () => {
    mockedUseReceipt.mockReturnValue(successResult(sampleRow));
    currentUpdate = makeUpdate({ isPending: true });
    renderScreen();

    // Force the edit form open by simulating an in-flight save: the screen
    // shows Cancel + Save buttons in both 'edit' and 'saving' phases. To
    // exercise the disabled state without calling mutateAsync (which is the
    // only way to enter 'saving'), we render with isPending true and click
    // Edit so the header shows the two buttons; both should reflect the
    // pending mutation by being disabled.
    return userEvent.setup().click(screen.getByRole('button', { name: /^Edit$/i })).then(() => {
      const cancelBtn = screen.getByRole('button', { name: /^Cancel$/i });
      const saveBtn = screen.getByRole('button', { name: /^Save$/i });
      expect(cancelBtn).toBeDisabled();
      expect(saveBtn).toBeDisabled();
    });
  });

  // ── Task 7: two-tap delete ────────────────────────────────────────────────

  it('first tap on Delete shows "Tap again to confirm" with danger styling', async () => {
    mockedUseReceipt.mockReturnValue(successResult(sampleRow));
    const user = userEvent.setup();
    renderScreen();

    const deleteBtn = screen.getByRole('button', { name: /^Delete receipt$/i });
    expect(deleteBtn).toBeInTheDocument();

    await user.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', {
      name: /Tap again to confirm/i,
    });
    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn).toHaveAttribute('data-danger', 'true');
    expect(currentDelete.mutateAsync).not.toHaveBeenCalled();
  });

  it('second tap calls deleteReceipt and navigates to /activity on success', async () => {
    mockedUseReceipt.mockReturnValue(successResult(sampleRow));
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: /^Delete receipt$/i }));
    await user.click(
      screen.getByRole('button', { name: /Tap again to confirm/i }),
    );

    expect(currentDelete.mutateAsync).toHaveBeenCalledWith({ id: 'r-1' });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/activity'),
    );
  });

  it('letting the 3000ms timer expire reverts the button to "Delete receipt"', async () => {
    vi.useFakeTimers();
    mockedUseReceipt.mockReturnValue(successResult(sampleRow));
    renderScreen();

    // Use fireEvent (synchronous) for the click — userEvent v14's internals
    // hang under fake timers because they await microtasks scheduled via
    // setTimeout(0). fireEvent.click triggers the handler synchronously.
    fireEvent.click(screen.getByRole('button', { name: /^Delete receipt$/i }));
    expect(
      screen.getByRole('button', { name: /Tap again to confirm/i }),
    ).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(
      screen.getByRole('button', { name: /^Delete receipt$/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Tap again to confirm/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the error banner and does not navigate when delete fails', async () => {
    mockedUseReceipt.mockReturnValue(successResult(sampleRow));
    currentDelete = makeDelete({
      mutateAsync: vi.fn().mockRejectedValue(new Error('Network down')),
    });
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: /^Delete receipt$/i }));
    await user.click(
      screen.getByRole('button', { name: /Tap again to confirm/i }),
    );

    await waitFor(() => {
      const banner = screen.getByRole('alert');
      expect(banner).toHaveTextContent(/Network down/);
    });
    expect(navigate).not.toHaveBeenCalledWith('/activity');

    // Dismiss button is present.
    expect(
      screen.getByRole('button', { name: /^Dismiss$/i }),
    ).toBeInTheDocument();
  });

  it('does not throw or warn when unmounted before the 3000ms timer expires', async () => {
    vi.useFakeTimers();
    mockedUseReceipt.mockReturnValue(successResult(sampleRow));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const view = renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /^Delete receipt$/i }));
    expect(
      screen.getByRole('button', { name: /Tap again to confirm/i }),
    ).toBeInTheDocument();

    expect(() => view.unmount()).not.toThrow();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
