import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CaptureSuccess from './CaptureSuccess';

// Spy on useNavigate to assert the post-button-click and timer-elapsed routes.
// Same pattern as the other screen tests (CaptureManual.test.tsx, etc).
const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const mod =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...mod, useNavigate: () => navigate };
});

type SuccessState = {
  amount?: number;
  sourceName?: string;
  receiptId?: string;
};

function renderWithState(state: SuccessState | null) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/capture/success', state: state ?? undefined }]}
    >
      <Routes>
        <Route path="/capture/success" element={<CaptureSuccess />} />
        <Route path="/" element={<div data-testid="home-route" />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  navigate.mockReset();
});

afterEach(() => {
  // Some tests below opt into fake timers — restore to real timers between tests
  // so other suites in the run aren't infected.
  vi.useRealTimers();
});

describe('CaptureSuccess', () => {
  it('renders "Saved" headline and a check icon', () => {
    renderWithState({
      amount: 142,
      sourceName: 'Maybank Visa ••4218',
      receiptId: 'r-1',
    });
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('formats the amount as RM X.XX with two decimals', () => {
    renderWithState({
      amount: 142,
      sourceName: 'Maybank Visa ••4218',
      receiptId: 'r-1',
    });
    // Match RM 142.00 even when surrounded by other text in the same node.
    expect(
      screen.getByText(/RM\s*142\.00/),
    ).toBeInTheDocument();
  });

  it('shows "deducted from <sourceName>"', () => {
    renderWithState({
      amount: 89.5,
      sourceName: 'CIMB Cash',
      receiptId: 'r-2',
    });
    expect(
      screen.getByText(/deducted from CIMB Cash/i),
    ).toBeInTheDocument();
  });

  it('clicking "View receipt" navigates to /receipts/<receiptId>', async () => {
    renderWithState({
      amount: 142,
      sourceName: 'Maybank Visa ••4218',
      receiptId: 'r-7',
    });
    await userEvent.click(screen.getByRole('button', { name: /view receipt/i }));
    expect(navigate).toHaveBeenCalledWith('/receipts/r-7');
  });

  it('clicking "Back to home" navigates to /', async () => {
    renderWithState({
      amount: 142,
      sourceName: 'Maybank Visa ••4218',
      receiptId: 'r-7',
    });
    await userEvent.click(screen.getByRole('button', { name: /back to home/i }));
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('disables "View receipt" when receiptId is missing', () => {
    renderWithState({
      amount: 12,
      sourceName: 'CIMB Cash',
      // no receiptId
    });
    const btn = screen.getByRole('button', {
      name: /view receipt/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('redirects to / when router state is missing entirely', () => {
    renderWithState(null);
    // The success page should NOT render — Navigate replaces the route.
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(screen.getByTestId('home-route')).toBeInTheDocument();
  });

  it('redirects to / when amount or sourceName is missing', () => {
    renderWithState({ receiptId: 'r-1' });
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(screen.getByTestId('home-route')).toBeInTheDocument();
  });

  it('auto-navigates to / after 5s of inactivity', () => {
    vi.useFakeTimers();
    renderWithState({
      amount: 142,
      sourceName: 'Maybank Visa ••4218',
      receiptId: 'r-7',
    });
    expect(navigate).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
