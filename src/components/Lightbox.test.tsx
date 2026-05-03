import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock @capacitor/app so addListener returns a Promise<{ remove }> —
// matching v8's PluginListenerHandle shape. We capture the registered
// handler so the test can invoke it as if Android had fired backButton.
const removeMock = vi.fn();
const addListenerMock = vi.fn();

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: (...args: unknown[]) => addListenerMock(...args),
  },
}));

import { Lightbox } from './Lightbox';

beforeEach(() => {
  removeMock.mockReset();
  addListenerMock.mockReset();
  addListenerMock.mockResolvedValue({ remove: removeMock });
});

describe('Lightbox', () => {
  it('renders the image with the given src and alt', () => {
    render(<Lightbox src="https://example.com/receipt.jpg" alt="Receipt photo" onClose={() => {}} />);
    const img = screen.getByAltText('Receipt photo') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toBe('https://example.com/receipt.jpg');
  });

  it('clicking the overlay calls onClose', () => {
    const onClose = vi.fn();
    render(<Lightbox src="https://example.com/receipt.jpg" alt="receipt" onClose={onClose} />);
    // The overlay is the parent of the <img>; click it directly.
    const img = screen.getByAltText('receipt');
    const overlay = img.parentElement!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('back button listener calls onClose and is removed on unmount', async () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <Lightbox src="https://example.com/receipt.jpg" onClose={onClose} />,
    );

    // The effect registered the listener.
    expect(addListenerMock).toHaveBeenCalledWith('backButton', expect.any(Function));
    const handler = addListenerMock.mock.calls[0]![1] as () => void;

    // Simulating the back press fires onClose.
    handler();
    expect(onClose).toHaveBeenCalledOnce();

    // Wait for the addListener Promise to resolve before unmounting so the
    // cleanup has a handle to remove.
    await Promise.resolve();
    await Promise.resolve();

    unmount();
    expect(removeMock).toHaveBeenCalledOnce();
  });
});
