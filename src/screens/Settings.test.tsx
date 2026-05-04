import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ProfileRow } from '@/lib/supabase/queries/profile';
import Settings from './Settings';

// Spy on useNavigate so the screen runs against fake router state.
const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const mod = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...mod,
    useNavigate: () => navigate,
  };
});

// ── Mock factories ────────────────────────────────────────────────────────────

type ProfileQueryResult = UseQueryResult<ProfileRow, Error>;

function makeProfileQuery(
  overrides: Partial<ProfileQueryResult> = {},
): ProfileQueryResult {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
    status: 'success',
    ...overrides,
  } as unknown as ProfileQueryResult;
}

type UpdatePersonaStub = {
  mutate: ReturnType<typeof vi.fn>;
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: ReturnType<typeof vi.fn>;
};

function makeUpdatePersona(
  overrides: Partial<UpdatePersonaStub> = {},
): UpdatePersonaStub {
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

type AuthStub = {
  user: { id: string; email: string | null } | null;
  session: unknown;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: ReturnType<typeof vi.fn>;
};

function makeAuth(overrides: Partial<AuthStub> = {}): AuthStub {
  return {
    user: { id: 'u-1', email: 'jane@example.com' },
    session: {},
    isLoading: false,
    isAuthenticated: true,
    signOut: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
}

// Per-test mutable references the mocks return.
let currentProfile: ProfileQueryResult;
let currentUpdatePersona: UpdatePersonaStub;
let currentAuth: AuthStub;

vi.mock('@/hooks/useProfile', () => ({
  useProfile: vi.fn(() => currentProfile),
  useUpdatePersona: vi.fn(() => currentUpdatePersona),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => currentAuth),
}));

const sampleProfile: ProfileRow = {
  id: 'u-1',
  full_name: 'Jane Doe',
  advisor_persona: 'analyst',
};

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <Settings />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  navigate.mockReset();
  currentProfile = makeProfileQuery({ data: sampleProfile });
  currentUpdatePersona = makeUpdatePersona();
  currentAuth = makeAuth();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Settings', () => {
  it('renders all three persona rows and marks the matching profile.advisor_persona as selected', () => {
    renderScreen();

    const analyst = screen.getByRole('button', { name: /Analyst/i });
    const coach = screen.getByRole('button', { name: /Coach/i });
    const witty = screen.getByRole('button', { name: /Witty/i });

    expect(analyst).toBeInTheDocument();
    expect(coach).toBeInTheDocument();
    expect(witty).toBeInTheDocument();

    expect(analyst).toHaveAttribute('aria-pressed', 'true');
    expect(coach).toHaveAttribute('aria-pressed', 'false');
    expect(witty).toHaveAttribute('aria-pressed', 'false');
  });

  it('tapping a different persona row calls useUpdatePersona().mutate(persona)', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: /Witty/i }));

    expect(currentUpdatePersona.mutate).toHaveBeenCalledWith('witty');
  });

  it('defaults selected row to Coach when profile.advisor_persona is null', () => {
    currentProfile = makeProfileQuery({
      data: { ...sampleProfile, advisor_persona: null },
    });
    renderScreen();

    expect(
      screen.getByRole('button', { name: /Coach/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: /Analyst/i }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('button', { name: /Witty/i }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('defaults selected row to Coach when profile is undefined', () => {
    currentProfile = makeProfileQuery({ data: undefined, isSuccess: false });
    renderScreen();

    expect(
      screen.getByRole('button', { name: /Coach/i }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders full_name and email read-only', () => {
    renderScreen();

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('falls back to em-dash when full_name and email are missing', () => {
    currentProfile = makeProfileQuery({
      data: { ...sampleProfile, full_name: null },
    });
    currentAuth = makeAuth({ user: { id: 'u-1', email: null } });
    renderScreen();

    // Two em-dashes should be rendered, one for name one for email.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('Back button calls navigate(-1)', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: /^Back$/i }));
    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it('first tap on Sign out shows "Tap again to confirm" and does NOT call signOut', async () => {
    const user = userEvent.setup();
    renderScreen();

    const btn = screen.getByRole('button', { name: /^Sign out$/i });
    await user.click(btn);

    const confirmBtn = screen.getByRole('button', {
      name: /Tap again to confirm/i,
    });
    expect(confirmBtn).toBeInTheDocument();
    expect(currentAuth.signOut).not.toHaveBeenCalled();
  });

  it('second tap on Sign out calls useAuth().signOut()', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: /^Sign out$/i }));
    await user.click(
      screen.getByRole('button', { name: /Tap again to confirm/i }),
    );

    expect(currentAuth.signOut).toHaveBeenCalledTimes(1);
  });

  it('letting the 3000ms timer expire reverts the button to "Sign out" and a subsequent first-tap-only does NOT call signOut', async () => {
    vi.useFakeTimers();
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: /^Sign out$/i }));
    expect(
      screen.getByRole('button', { name: /Tap again to confirm/i }),
    ).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(
      screen.getByRole('button', { name: /^Sign out$/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Tap again to confirm/i }),
    ).not.toBeInTheDocument();

    // First tap only after timer expiry should NOT call signOut.
    fireEvent.click(screen.getByRole('button', { name: /^Sign out$/i }));
    expect(currentAuth.signOut).not.toHaveBeenCalled();
  });

  it('does not throw when unmounted before the 3000ms timer expires', async () => {
    vi.useFakeTimers();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const view = renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /^Sign out$/i }));
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
