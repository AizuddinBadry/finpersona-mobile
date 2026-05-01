import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Advisor from './Advisor';

function renderAdvisor() {
  return render(
    <MemoryRouter initialEntries={['/advisor']}>
      <Advisor />
    </MemoryRouter>,
  );
}

describe('Advisor', () => {
  it('renders the Finpersona header and online subtitle', () => {
    renderAdvisor();
    expect(
      screen.getByRole('heading', { name: 'Finpersona' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your financial analyst · online/),
    ).toBeInTheDocument();
  });

  it('renders the dining chart bubble with delta', () => {
    renderAdvisor();
    expect(screen.getByText('30-day · Dining')).toBeInTheDocument();
    expect(screen.getByText('RM 666')).toBeInTheDocument();
    expect(screen.getByText('+38%')).toBeInTheDocument();
  });

  it('renders all three recommendation rows', () => {
    renderAdvisor();
    expect(
      screen.getByText('Cap weekend delivery to 1 order'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Move 2 streaming services to family plans'),
    ).toBeInTheDocument();
    expect(screen.getByText('Auto-tag medical → LHDN')).toBeInTheDocument();
  });

  it('renders the composer placeholder and suggestion chips', () => {
    renderAdvisor();
    expect(screen.getByText('Ask Finpersona…')).toBeInTheDocument();
    expect(screen.getByText('Why is dining up?')).toBeInTheDocument();
    expect(screen.getByText('Forecast May')).toBeInTheDocument();
  });
});
