import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SignupScreen from './SignupScreen';

const signUpMock = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  supabase: { auth: { signUp: (...args: unknown[]) => signUpMock(...args) } },
}));

describe('SignupScreen', () => {
  beforeEach(() => signUpMock.mockReset());

  it('rejects mismatched passwords', async () => {
    render(
      <MemoryRouter>
        <SignupScreen />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText(/full name/i), 'Aisha');
    await userEvent.type(screen.getByLabelText(/^email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different1');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it('rejects passwords shorter than 8 characters', async () => {
    render(
      <MemoryRouter>
        <SignupScreen />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText(/full name/i), 'Aisha');
    await userEvent.type(screen.getByLabelText(/^email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'short');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'short');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findAllByText(/at least 8/i)).not.toHaveLength(0);
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it('calls supabase.signUp with full_name in metadata on valid submit', async () => {
    signUpMock.mockResolvedValue({ data: {}, error: null });
    render(
      <MemoryRouter>
        <SignupScreen />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText(/full name/i), 'Aisha Tan');
    await userEvent.type(screen.getByLabelText(/^email/i), 'aisha@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password1');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(signUpMock).toHaveBeenCalledWith({
      email: 'aisha@example.com',
      password: 'password1',
      options: { data: { full_name: 'Aisha Tan' } },
    });
  });

  it('shows server error message when signUp returns error', async () => {
    signUpMock.mockResolvedValue({ data: {}, error: { message: 'User already registered' } });
    render(
      <MemoryRouter>
        <SignupScreen />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText(/full name/i), 'Aisha');
    await userEvent.type(screen.getByLabelText(/^email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password1');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/user already registered/i)).toBeInTheDocument();
  });
});
