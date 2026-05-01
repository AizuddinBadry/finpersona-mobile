import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginScreen from './LoginScreen';

const signInMock = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  supabase: { auth: { signInWithPassword: (...args: unknown[]) => signInMock(...args) } },
}));

describe('LoginScreen', () => {
  beforeEach(() => signInMock.mockReset());

  it('shows validation errors for empty submit', async () => {
    render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findAllByText(/required|invalid/i)).not.toHaveLength(0);
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('calls supabase.signInWithPassword on valid submit', async () => {
    signInMock.mockResolvedValue({ data: {}, error: null });
    render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(signInMock).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret123' });
  });

  it('shows error text when supabase returns an error', async () => {
    signInMock.mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } });
    render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong1');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/invalid login credentials/i)).toBeInTheDocument();
  });
});
