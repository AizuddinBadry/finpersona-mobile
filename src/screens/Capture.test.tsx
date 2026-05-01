import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Capture from './Capture';

function renderCapture() {
  return render(
    <MemoryRouter initialEntries={['/capture']}>
      <Capture />
    </MemoryRouter>,
  );
}

describe('Capture', () => {
  it('renders the AI PARSED chip and parsed insight title', () => {
    renderCapture();
    expect(screen.getByText('AI PARSED')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Looks like a book purchase' }),
    ).toBeInTheDocument();
  });

  it('renders parsed merchant and amount fields', () => {
    renderCapture();
    expect(screen.getByText('Kinokuniya KLCC')).toBeInTheDocument();
    // Amount appears on the receipt thumbnail and in the parsed field row.
    expect(screen.getAllByText('RM 142.00').length).toBeGreaterThanOrEqual(1);
  });

  it('toggles the LHDN claimable switch when tapped', async () => {
    const user = userEvent.setup();
    renderCapture();
    const toggle = screen.getByRole('switch', {
      name: /LHDN claimable/i,
    });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('renders the points earned banner with multiplier breakdown', () => {
    renderCapture();
    expect(screen.getByText(/\+284 points/)).toBeInTheDocument();
    expect(screen.getByText(/142 base × 2 LHDN bonus/)).toBeInTheDocument();
  });
});
