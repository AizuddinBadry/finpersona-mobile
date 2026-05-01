import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OnboardingScreen from './OnboardingScreen';

const completeOnboardingMock = vi.fn();
vi.mock('./onboarding-mutations', () => ({
  completeOnboarding: (...args: unknown[]) => completeOnboardingMock(...args),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

function renderScreen() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <OnboardingScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('OnboardingScreen', () => {
  beforeEach(() => completeOnboardingMock.mockReset());

  it('disables Next on step 1 until a tax year is selected', async () => {
    renderScreen();
    const next = screen.getByRole('button', { name: /next/i });
    expect(next).toBeDisabled();
    await userEvent.click(screen.getByLabelText(/this year/i));
    expect(next).toBeEnabled();
  });

  it('walks through three steps and submits with the right payload', async () => {
    completeOnboardingMock.mockResolvedValue(undefined);
    const currentYear = new Date().getFullYear();
    renderScreen();

    // Step 1: tax year — pick "this year"
    await userEvent.click(screen.getByLabelText(/this year/i));
    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    // Step 2: employment — pick Self-employed
    await userEvent.click(screen.getByLabelText(/self-employed/i));
    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    // Step 3: income — pick 60–100k (mid 80000)
    await userEvent.click(screen.getByLabelText(/rm 60[\s–-]+100k/i));
    await userEvent.click(screen.getByRole('button', { name: /done|finish/i }));

    await waitFor(() => expect(completeOnboardingMock).toHaveBeenCalledTimes(1));
    expect(completeOnboardingMock).toHaveBeenCalledWith({
      userId: 'user-123',
      taxYear: currentYear,
      employmentType: 'self_employed',
      incomeRangeMid: 80000,
    });
  });
});
