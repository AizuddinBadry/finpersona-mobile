import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Rewards from './Rewards';

function renderRewards() {
  return render(
    <MemoryRouter initialEntries={['/rewards']}>
      <Rewards />
    </MemoryRouter>,
  );
}

describe('Rewards', () => {
  it('renders the Rewards heading and Persona Points eyebrow', () => {
    renderRewards();
    expect(
      screen.getByRole('heading', { name: 'Rewards' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Persona Points')).toBeInTheDocument();
  });

  it('renders the points balance and SAPPHIRE tier label', () => {
    renderRewards();
    expect(screen.getByText('Your balance')).toBeInTheDocument();
    expect(screen.getByText('4,520')).toBeInTheDocument();
    expect(screen.getByText('SAPPHIRE')).toBeInTheDocument();
    expect(
      screen.getByText(/480 pts/),
    ).toBeInTheDocument();
  });

  it('renders affordable Redeem CTAs and Locked CTAs based on balance', () => {
    renderRewards();
    // GrabFood (2500), Petronas (3000) affordable; Shopee (4800), Cash (5000) locked
    expect(
      screen.getByRole('button', { name: /Redeem GrabFood RM 25/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Locked: Shopee RM 50/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Locked: Cash to Maybank/ }),
    ).toBeInTheDocument();
  });

  it('renders recent earnings with LHDN bonus badges', () => {
    renderRewards();
    expect(screen.getByText('Kinokuniya KLCC')).toBeInTheDocument();
    expect(screen.getByText('Klinik Mediviron')).toBeInTheDocument();
    // Two 2× LHDN badges (Kinokuniya + Mediviron)
    expect(screen.getAllByText('2× LHDN')).toHaveLength(2);
  });
});
