import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import RequireAuth from './RequireAuth';
import RequireOnboarded from './RequireOnboarded';
import Placeholder from '@/screens/Placeholder';
import LoginScreen from '@/features/auth/LoginScreen';
import SignupScreen from '@/features/auth/SignupScreen';
import OnboardingScreen from '@/features/auth/OnboardingScreen';
import AppShell from '@/components/AppShell';

/**
 * Wraps a tab/route screen in the auth+onboarded guards and the app shell.
 * Tab destinations stay as Placeholders until later Phase 2 tasks port them.
 */
function Tab({
  children,
  hideNav = false,
}: {
  children: ReactNode;
  hideNav?: boolean;
}) {
  return (
    <RequireAuth>
      <RequireOnboarded>
        <AppShell hideNav={hideNav}>{children}</AppShell>
      </RequireOnboarded>
    </RequireAuth>
  );
}

export default function AppRoutes() {
  return (
    <MemoryRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <OnboardingScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/"
          element={
            <Tab>
              <Placeholder label="Home (Phase 1)" />
            </Tab>
          }
        />
        <Route
          path="/insights"
          element={
            <Tab>
              <Placeholder label="Insights" />
            </Tab>
          }
        />
        <Route
          path="/cards"
          element={
            <Tab>
              <Placeholder label="Cards" />
            </Tab>
          }
        />
        <Route
          path="/advisor"
          element={
            <Tab>
              <Placeholder label="Advisor" />
            </Tab>
          }
        />
        <Route
          path="/capture"
          element={
            <Tab hideNav>
              <Placeholder label="Capture" />
            </Tab>
          }
        />
        <Route
          path="/lhdn"
          element={
            <Tab>
              <Placeholder label="LHDN" />
            </Tab>
          }
        />
        <Route
          path="/rewards"
          element={
            <Tab>
              <Placeholder label="Rewards" />
            </Tab>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MemoryRouter>
  );
}
