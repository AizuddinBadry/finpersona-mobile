import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import CaptureManual from './CaptureManual';
import type { PaymentSource } from '@/lib/supabase/queries/sources';

// Spy on useNavigate so we can assert what the screen does on save success.
const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const mod =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...mod, useNavigate: () => navigate };
});

// useAuth — provide a stable user id so the insert payload is deterministic.
vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }));
// usePaymentSources — supply a couple of sources so we can verify default-pick.
vi.mock('@/hooks/usePaymentSources', () => ({ usePaymentSources: vi.fn() }));
// insertManualReceipt — mock at the module boundary; receiptInsert.test.ts
// already covers the supabase chain, so here we just assert the call shape.
vi.mock('@/lib/supabase/queries/receiptInsert', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/supabase/queries/receiptInsert')
  >('@/lib/supabase/queries/receiptInsert');
  return { ...actual, insertManualReceipt: vi.fn() };
});

import { useAuth } from '@/hooks/useAuth';
import { usePaymentSources } from '@/hooks/usePaymentSources';
import { insertManualReceipt } from '@/lib/supabase/queries/receiptInsert';

const mockedUseAuth = vi.mocked(useAuth);
const mockedUsePaymentSources = vi.mocked(usePaymentSources);
const mockedInsertManualReceipt = vi.mocked(insertManualReceipt);

const sources: PaymentSource[] = [
  {
    id: 'src-default',
    name: 'Maybank Debit',
    last4: '••••',
    balance: 1000,
    currency: 'MYR',
    source_type: 'debit_card',
    is_default: true,
  },
  {
    id: 'src-other',
    name: 'CIMB Cash',
    last4: '••••',
    balance: 500,
    currency: 'MYR',
    source_type: 'cash',
    is_default: false,
  },
];

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/capture/manual']}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function renderScreen() {
  const Wrapper = makeWrapper();
  return render(
    <Wrapper>
      <CaptureManual />
    </Wrapper>,
  );
}

beforeEach(() => {
  navigate.mockReset();
  mockedInsertManualReceipt.mockReset();
  mockedUseAuth.mockReturnValue({
    session: null,
    user: { id: 'user-1' } as never,
    isLoading: false,
    isAuthenticated: true,
    signOut: vi.fn(),
  });
  mockedUsePaymentSources.mockReturnValue({
    data: sources,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof usePaymentSources>);
});

describe('CaptureManual', () => {
  it('renders the five required fields', () => {
    renderScreen();
    expect(screen.getByLabelText(/merchant/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/total/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/payment source/i)).toBeInTheDocument();
  });

  it('defaults the date to today (YYYY-MM-DD)', () => {
    renderScreen();
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const expected = `${yyyy}-${mm}-${dd}`;
    const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement;
    expect(dateInput.value).toBe(expected);
  });

  it('defaults the payment source to the is_default = true source', () => {
    renderScreen();
    const select = screen.getByLabelText(/payment source/i) as HTMLSelectElement;
    expect(select.value).toBe('src-default');
  });

  it('renders all 20 PURCHASE_TYPES options plus the disabled placeholder', () => {
    renderScreen();
    const select = screen.getByLabelText(/category/i) as HTMLSelectElement;
    // 20 categories + 1 placeholder
    expect(select.querySelectorAll('option')).toHaveLength(21);
  });

  it('disables Save until merchant, total, and category are valid', async () => {
    renderScreen();
    const save = screen.getByRole('button', { name: /save/i }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    await userEvent.type(screen.getByLabelText(/merchant/i), 'Tesco');
    expect(save.disabled).toBe(true);

    await userEvent.type(screen.getByLabelText(/total/i), '89.50');
    expect(save.disabled).toBe(true);

    await userEvent.selectOptions(
      screen.getByLabelText(/category/i),
      'groceries',
    );
    expect(save.disabled).toBe(false);
  });

  it('keeps Save disabled when total is zero or negative', async () => {
    renderScreen();
    await userEvent.type(screen.getByLabelText(/merchant/i), 'Tesco');
    await userEvent.selectOptions(
      screen.getByLabelText(/category/i),
      'groceries',
    );
    await userEvent.type(screen.getByLabelText(/total/i), '0');
    const save = screen.getByRole('button', { name: /save/i }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it('disables Save while payment sources are still loading', () => {
    mockedUsePaymentSources.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof usePaymentSources>);
    renderScreen();
    const save = screen.getByRole('button', { name: /save/i }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it('submits with the right payload and navigates to /capture/success on success', async () => {
    mockedInsertManualReceipt.mockResolvedValue({ id: 'new-manual-id' });
    renderScreen();

    await userEvent.type(screen.getByLabelText(/merchant/i), 'Tesco Mutiara');
    // Override the default date to keep the assertion deterministic.
    const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement;
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, '2026-04-15');
    await userEvent.type(screen.getByLabelText(/total/i), '89.50');
    await userEvent.selectOptions(
      screen.getByLabelText(/category/i),
      'groceries',
    );

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockedInsertManualReceipt).toHaveBeenCalledWith({
        userId: 'user-1',
        merchantName: 'Tesco Mutiara',
        receiptDate: '2026-04-15',
        totalAmount: 89.5,
        // PURCHASE_TYPES value flows in as `purchaseType`; the helper maps it
        // onto the row's subcategory column.
        purchaseType: 'groceries',
        sourceId: 'src-default',
      });
    });

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/capture/success', {
        state: {
          amount: 89.5,
          sourceName: 'Maybank Debit',
          receiptId: 'new-manual-id',
        },
      });
    });
  });

  it('uses the selected (non-default) source when the user picks another', async () => {
    mockedInsertManualReceipt.mockResolvedValue({ id: 'm2' });
    renderScreen();

    await userEvent.type(screen.getByLabelText(/merchant/i), 'Petron Subang');
    await userEvent.type(screen.getByLabelText(/total/i), '60');
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'fuel');
    await userEvent.selectOptions(
      screen.getByLabelText(/payment source/i),
      'src-other',
    );

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockedInsertManualReceipt).toHaveBeenCalledWith(
        expect.objectContaining({ sourceId: 'src-other' }),
      );
    });
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(
        '/capture/success',
        expect.objectContaining({
          state: expect.objectContaining({ sourceName: 'CIMB Cash' }),
        }),
      );
    });
  });

  it('back button navigates home', async () => {
    renderScreen();
    await userEvent.click(screen.getByRole('button', { name: /close|back/i }));
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
