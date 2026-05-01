import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Home />
    </MemoryRouter>,
  );
}

describe('Home', () => {
  it('renders the personalized greeting', () => {
    renderHome();
    expect(screen.getByText('Good morning, Aizuddin')).toBeInTheDocument();
  });

  it('renders the main MYR balance', () => {
    renderHome();
    expect(screen.getByText('RM 12,840.50')).toBeInTheDocument();
  });

  it('renders the Recent transactions header', () => {
    renderHome();
    expect(screen.getByText('Recent')).toBeInTheDocument();
  });

  it('renders at least one transaction row name', () => {
    renderHome();
    expect(screen.getByText('Mak Cik Nasi Lemak')).toBeInTheDocument();
  });
});
