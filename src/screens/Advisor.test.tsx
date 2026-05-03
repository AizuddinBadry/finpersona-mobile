import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Advisor from './Advisor';
import { advisorMock } from '@/mocks/seed';

// Signed-out: useAdvisor is disabled, screen falls back to advisorMock.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

// useAdvisorSend hits the /api/advisor/chat round-trip — mock it so the
// screen tests never actually fire a network request and we can drive the
// composer state (idle / pending / error) per case.
vi.mock('@/hooks/useAdvisorSend', () => ({
  useAdvisorSend: vi.fn(),
}));

import { useAdvisorSend } from '@/hooks/useAdvisorSend';
const mockedUseAdvisorSend = vi.mocked(useAdvisorSend);

type SendStub = {
  mutate: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
};

function makeSend(overrides: Partial<SendStub> = {}): SendStub {
  return {
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    ...overrides,
  };
}

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

beforeEach(() => {
  mockedUseAdvisorSend.mockReset();
  // Default: idle send (no pending request, no error).
  mockedUseAdvisorSend.mockReturnValue(makeSend() as never);
});

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

  it('renders a composer input (with placeholder copy) and suggestion chips', () => {
    renderAdvisor();
    const input = screen.getByLabelText('Message Finpersona') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.placeholder).toBe('Ask Finpersona…');
    expect(screen.getByRole('button', { name: 'Why is dining up?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Forecast May' })).toBeInTheDocument();
  });
});

describe('Advisor composer', () => {
  it('Send button is disabled when the input is empty', () => {
    renderAdvisor();
    const send = screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
  });

  it('typing then submitting calls mutate with the trimmed message and clears the input', async () => {
    const mutate = vi.fn();
    mockedUseAdvisorSend.mockReturnValue(makeSend({ mutate }) as never);
    renderAdvisor();
    const input = screen.getByLabelText('Message Finpersona') as HTMLInputElement;
    await userEvent.type(input, '  Show me dining trend  ');
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(mutate).toHaveBeenCalledWith('Show me dining trend');
    expect(input.value).toBe('');
  });

  it('disables the input + send button while a send is in flight', () => {
    mockedUseAdvisorSend.mockReturnValue(makeSend({ isPending: true }) as never);
    renderAdvisor();
    const input = screen.getByLabelText('Message Finpersona') as HTMLInputElement;
    expect(input.disabled).toBe(true);
    const send = screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
  });

  it('shows the typing indicator while the assistant turn is in flight', () => {
    mockedUseAdvisorSend.mockReturnValue(makeSend({ isPending: true }) as never);
    renderAdvisor();
    expect(
      screen.getByLabelText('Finpersona is typing'),
    ).toHaveTextContent('Finpersona is thinking…');
  });

  it('clicking a suggestion chip submits that suggestion via mutate', async () => {
    const mutate = vi.fn();
    mockedUseAdvisorSend.mockReturnValue(makeSend({ mutate }) as never);
    renderAdvisor();
    const firstSuggestion = advisorMock.suggestions[0]!;
    await userEvent.click(screen.getByRole('button', { name: firstSuggestion }));
    expect(mutate).toHaveBeenCalledWith(firstSuggestion);
  });

  it('renders the error banner with the failure message and a dismiss button', async () => {
    const reset = vi.fn();
    mockedUseAdvisorSend.mockReturnValue(
      makeSend({
        reset,
        isError: true,
        error: new Error('Claude rate limited'),
      }) as never,
    );
    renderAdvisor();
    expect(screen.getByRole('alert')).toHaveTextContent('Claude rate limited');
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss error' }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
