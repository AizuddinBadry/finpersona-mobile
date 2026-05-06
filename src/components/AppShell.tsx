import type { ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import StatusBar from './StatusBar';
import BottomNav from './BottomNav';

/**
 * Composes the StatusBar + screen content + glass BottomNav. The shell
 * is positioned relative so BottomNav (absolute, bottom:18) lands at the
 * bottom of the viewport. `hideNav` is for full-bleed routes like
 * /capture where the nav would block the camera viewfinder.
 */
type Props = {
  children: ReactNode;
  hideNav?: boolean;
  dark?: boolean;
};

export default function AppShell({
  children,
  hideNav = false,
  dark = false,
}: Props) {
  return (
    <div className="relative min-h-screen bg-bg">
      {!Capacitor.isNativePlatform() && <StatusBar dark={dark} />}
      <div className="relative">{children}</div>
      {!hideNav && <BottomNav dark={dark} />}
    </div>
  );
}
