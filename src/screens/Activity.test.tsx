import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Activity from './Activity';

function renderActivity() {
  return render(
    <MemoryRouter initialEntries={['/activity']}>
      <Activity />
    </MemoryRouter>,
  );
}

describe('Activity', () => {
  it('renders the Activity title', () => {
    renderActivity();
    expect(
      screen.getByRole('heading', { name: 'Activity' }),
    ).toBeInTheDocument();
  });

  it('renders the All filter chip as active by default', () => {
    renderActivity();
    const all = screen.getByRole('button', { name: 'All' });
    expect(all).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders at least 5 transaction names', () => {
    renderActivity();
    const names = [
      "Mama's Kitchen",
      'Kinokuniya KLCC',
      'Common Man Coffee',
      'Salary · Maybank',
      'Klinik Mediviron',
    ];
    for (const name of names) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it('toggles active state when LHDN chip is tapped', async () => {
    renderActivity();
    const all = screen.getByRole('button', { name: 'All' });
    const lhdn = screen.getByRole('button', { name: /^LHDN$/ });

    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(lhdn).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(lhdn);

    expect(lhdn).toHaveAttribute('aria-pressed', 'true');
    expect(all).toHaveAttribute('aria-pressed', 'false');
  });
});
