import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Lhdn from './Lhdn';

function renderLhdn() {
  return render(
    <MemoryRouter initialEntries={['/lhdn']}>
      <Lhdn />
    </MemoryRouter>,
  );
}

describe('Lhdn', () => {
  it('renders the Tax claims heading and YA tag', () => {
    renderLhdn();
    expect(
      screen.getByRole('heading', { name: 'Tax claims' }),
    ).toBeInTheDocument();
    expect(screen.getByText('YA 2025 · LHDN')).toBeInTheDocument();
  });

  it('renders Total claimable label and at least one category name', () => {
    renderLhdn();
    expect(screen.getByText('Total claimable')).toBeInTheDocument();
    expect(screen.getByText('Lifestyle')).toBeInTheDocument();
  });

  it('renders the disclaimer footer', () => {
    renderLhdn();
    expect(
      screen.getByText(/Estimates only/),
    ).toBeInTheDocument();
  });
});
