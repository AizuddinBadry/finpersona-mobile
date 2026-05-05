import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CaptureSheet from './CaptureSheet';

// Spy on useNavigate so we can assert what each CTA does on click.
// Mirrors the pattern in src/screens/Capture.test.tsx.
const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const mod =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...mod, useNavigate: () => navigate };
});

function renderSheet(props: {
  open: boolean;
  onClose?: () => void;
}) {
  const onClose = props.onClose ?? vi.fn();
  return {
    onClose,
    ...render(
      <MemoryRouter initialEntries={['/']}>
        <CaptureSheet open={props.open} onClose={onClose} />
      </MemoryRouter>,
    ),
  };
}

beforeEach(() => {
  navigate.mockReset();
});

describe('CaptureSheet', () => {
  it('does not render the dialog when open is false', () => {
    renderSheet({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a dialog with two CTAs when open is true', () => {
    renderSheet({ open: true });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(
      screen.getByRole('button', { name: /scan receipt/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add manually/i }),
    ).toBeInTheDocument();
  });

  it('clicking "Scan receipt" navigates to /capture and closes the sheet', async () => {
    const { onClose } = renderSheet({ open: true });
    await userEvent.click(screen.getByRole('button', { name: /scan receipt/i }));
    expect(navigate).toHaveBeenCalledWith('/capture');
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking "Add manually" navigates to /capture/manual and closes the sheet', async () => {
    const { onClose } = renderSheet({ open: true });
    await userEvent.click(screen.getByRole('button', { name: /add manually/i }));
    expect(navigate).toHaveBeenCalledWith('/capture/manual');
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking the backdrop calls onClose', async () => {
    const { onClose } = renderSheet({ open: true });
    const backdrop = screen.getByTestId('capture-sheet-backdrop');
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('pressing Escape calls onClose', async () => {
    const { onClose } = renderSheet({ open: true });
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('does not respond to Escape when closed', async () => {
    const { onClose } = renderSheet({ open: false });
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});
