/**
 * Lightbox — fullscreen image preview overlay.
 *
 * Used by ReceiptDetail (next phase): when the user taps a receipt
 * thumbnail we want the photo to fill the screen, dim everything behind
 * it, and dismiss on a single tap or hardware back press.
 *
 * Non-obvious choices:
 *   - createPortal into document.body so the overlay escapes the
 *     PhoneShell clipping/transform contexts. A fixed-position element
 *     inside a transformed ancestor is positioned relative to the
 *     ancestor, not the viewport — that breaks the "covers everything"
 *     contract. Portaling sidesteps that entirely.
 *   - Capacitor App.backButton is wired up so Android's hardware/gesture
 *     back closes the lightbox before bubbling to the router. addListener
 *     returns a Promise<PluginListenerHandle> in v8, so the cleanup
 *     awaits the handle and calls .remove() (handle the unmount-before-
 *     resolve race by checking a cancelled flag).
 *   - We use a plain <img> instead of a lightbox library: the spec is
 *     tiny (tap to close, back to close, contain-fit), no zoom/swipe,
 *     and pulling in a library would dwarf the actual code.
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { App } from '@capacitor/app';

export type LightboxProps = {
  src: string;
  alt?: string;
  onClose: () => void;
};

export function Lightbox({ src, alt, onClose }: LightboxProps) {
  useEffect(() => {
    let cancelled = false;
    let handle: { remove: () => void | Promise<void> } | null = null;

    const handlePromise = App.addListener('backButton', () => {
      onClose();
    });

    Promise.resolve(handlePromise)
      .then((h) => {
        if (cancelled) {
          // Component unmounted before the listener registered — remove
          // immediately so we don't leak.
          void h.remove();
          return;
        }
        handle = h;
      })
      .catch(() => {
        // Listener registration failed (e.g. plugin missing on web); the
        // overlay still works via tap-to-close, so swallow.
      });

    return () => {
      cancelled = true;
      if (handle) {
        void handle.remove();
      }
    };
  }, [onClose]);

  const overlay = (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={src}
        alt={alt ?? ''}
        style={{
          maxWidth: '100vw',
          maxHeight: '100vh',
          objectFit: 'contain',
        }}
      />
    </div>
  );

  return createPortal(overlay, document.body);
}

export default Lightbox;
