import type { ReactNode } from 'react';
import { SafeArea } from './SafeArea';

/**
 * Full-bleed app frame. The mockups have a browser-only <Phone> bezel for
 * preview; we don't port that — on-device the phone IS the frame.
 */
export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <SafeArea className="min-h-screen">{children}</SafeArea>
    </div>
  );
}
