import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CaptureSheet from './CaptureSheet';
import BottomNav from './BottomNav';

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
  it('marks the dialog as hidden when open is false', () => {
    renderSheet({ open: false });
    // Sheet is always mounted (so it can animate from translateY(100%) → 0),
    // but it's hidden from AT and pointer events while closed.
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders a dialog with two CTAs when open is true', () => {
    renderSheet({ open: true });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-hidden', 'false');
    expect(
      screen.getByRole('button', { name: /scan receipt/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add manually/i }),
    ).toBeInTheDocument();
  });

  it('animates from off-screen to on-screen via translateY', () => {
    const { rerender } = renderSheet({ open: false });
    let dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog.style.transform).toBe('translateY(100%)');

    rerender(
      <MemoryRouter initialEntries={['/']}>
        <CaptureSheet open={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    dialog = screen.getByRole('dialog');
    expect(dialog.style.transform).toBe('translateY(0)');
    expect(dialog.style.transition).toMatch(/transform/);
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

describe('BottomNav + CaptureSheet integration', () => {
  it('clicking the FAB opens the capture sheet', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
      </MemoryRouter>,
    );

    // Sheet is always mounted but aria-hidden until the FAB is pressed.
    expect(
      screen.queryByRole('dialog', { hidden: true }),
    ).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /capture/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-hidden', 'false');
  });
});
