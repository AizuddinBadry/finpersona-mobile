import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Insights from './Insights';

function renderInsights() {
  return render(
    <MemoryRouter initialEntries={['/insights']}>
      <Insights />
    </MemoryRouter>,
  );
}

describe('Insights', () => {
  it('renders the Insights heading and Month tab default-selected', () => {
    renderInsights();
    expect(
      screen.getByRole('heading', { name: 'Insights' }),
    ).toBeInTheDocument();
    const monthTab = screen.getByRole('tab', { name: 'Month' });
    expect(monthTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Week' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('renders the total spent card with delta vs prior month', () => {
    renderInsights();
    expect(screen.getByText('Total spent · April')).toBeInTheDocument();
    expect(screen.getByText('3,284')).toBeInTheDocument();
    expect(screen.getByText('−12%')).toBeInTheDocument();
    expect(screen.getByText(/vs March · RM 3,732/)).toBeInTheDocument();
  });

  it('switches selected tab when Year is tapped', async () => {
    const user = userEvent.setup();
    renderInsights();
    const yearTab = screen.getByRole('tab', { name: 'Year' });
    await user.click(yearTab);
    expect(yearTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Month' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('renders all five spending categories', () => {
    renderInsights();
    expect(screen.getByText('Dining')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText('Shopping')).toBeInTheDocument();
    expect(screen.getByText('Bills')).toBeInTheDocument();
    expect(screen.getByText('Coffee')).toBeInTheDocument();
  });

  it('renders the May forecast band', () => {
    renderInsights();
    expect(screen.getByText('FORECAST · MAY')).toBeInTheDocument();
    expect(screen.getByText(/RM 3,420/)).toBeInTheDocument();
    expect(screen.getByText(/RM 3,200/)).toBeInTheDocument();
  });
});
