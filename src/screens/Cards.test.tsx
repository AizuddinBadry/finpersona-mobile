import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Cards from './Cards';

function renderCards() {
  return render(
    <MemoryRouter initialEntries={['/cards']}>
      <Cards />
    </MemoryRouter>,
  );
}

describe('Cards', () => {
  it('renders the Accounts heading', () => {
    renderCards();
    expect(
      screen.getByRole('heading', { name: 'Accounts' }),
    ).toBeInTheDocument();
  });

  it('renders the primary card with PRIMARY badge', () => {
    renderCards();
    expect(screen.getByText('PRIMARY')).toBeInTheDocument();
    expect(screen.getAllByText(/Maybank Visa/)[0]).toBeInTheDocument();
  });

  it('renders the Transfer button on Move money form', () => {
    renderCards();
    expect(
      screen.getByRole('button', { name: 'Transfer' }),
    ).toBeInTheDocument();
  });

  it('toggles auto-deduct rule when switch is tapped', async () => {
    renderCards();
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThanOrEqual(3);
    const first = switches[0];
    const initial = first.getAttribute('aria-checked');
    await userEvent.click(first);
    expect(first.getAttribute('aria-checked')).not.toBe(initial);
  });
});
