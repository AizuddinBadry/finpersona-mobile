import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppShell from './AppShell';

function renderShell({ hideNav = false } = {}) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AppShell hideNav={hideNav}>
        <div>SCREEN</div>
      </AppShell>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  it('renders the StatusBar 9:41 time', () => {
    renderShell();
    expect(screen.getByText('9:41')).toBeInTheDocument();
  });

  it('renders all five bottom-nav labels', () => {
    renderShell();
    for (const label of ['Home', 'Insights', 'Capture', 'Cards', 'Advisor']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('renders children inside the shell', () => {
    renderShell();
    expect(screen.getByText('SCREEN')).toBeInTheDocument();
  });

  it('hides the bottom nav when hideNav is true', () => {
    renderShell({ hideNav: true });
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.queryByText('Capture')).not.toBeInTheDocument();
  });
});
