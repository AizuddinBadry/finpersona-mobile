import type { ReactNode } from 'react';

/**
 * Stub guard — Task 13 replaces this with a real check that queries
 * profiles.onboarding_completed and redirects to /onboarding when false.
 */
export default function RequireOnboarded({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
