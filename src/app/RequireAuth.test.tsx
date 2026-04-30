import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RequireAuth from './RequireAuth';
import { useAuthStore } from '@/stores/authStore';

// supabase client shouldn't actually be touched in this test, but the import
// graph (useAuth -> supabase/client -> getEnv) needs *something* in env. We
// mock the client module to avoid getEnv() running on a missing .env.local.
vi.mock('@/lib/supabase/client', () => ({
  supabase: { auth: { signOut: vi.fn() } },
}));

function renderWithRoute(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>LOGIN</div>} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <div>HOME</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  beforeEach(() => {
    useAuthStore.setState({ session: null, isLoading: false });
  });

  it('redirects to /login when no session', () => {
    renderWithRoute();
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });

  it('renders children when session exists', () => {
    useAuthStore.setState({
      session: { user: { id: 'u1', email: 'a@b' } } as any,
      isLoading: false,
    });
    renderWithRoute();
    expect(screen.getByText('HOME')).toBeInTheDocument();
  });

  it('shows splash while loading', () => {
    useAuthStore.setState({ session: null, isLoading: true });
    renderWithRoute();
    expect(screen.getByText('Finpersona')).toBeInTheDocument();
  });
});
