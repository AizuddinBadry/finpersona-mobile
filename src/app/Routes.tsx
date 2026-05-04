import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import RequireAuth from './RequireAuth';
import RequireOnboarded from './RequireOnboarded';
import Placeholder from '@/screens/Placeholder';
import Home from '@/screens/Home';
import Activity from '@/screens/Activity';
import Cards from '@/screens/Cards';
import Lhdn from '@/screens/Lhdn';
import Capture from '@/screens/Capture';
import Advisor from '@/screens/Advisor';
import Insights from '@/screens/Insights';
import Rewards from '@/screens/Rewards';
import ReceiptDetail from '@/screens/ReceiptDetail';
import Settings from '@/screens/Settings';
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
              <Home />
            </Tab>
          }
        />
        <Route
          path="/activity"
          element={
            <Tab>
              <Activity />
            </Tab>
          }
        />
        <Route
          path="/insights"
          element={
            <Tab>
              <Insights />
            </Tab>
          }
        />
        <Route
          path="/cards"
          element={
            <Tab>
              <Cards />
            </Tab>
          }
        />
        <Route
          path="/advisor"
          element={
            <Tab>
              <Advisor />
            </Tab>
          }
        />
        <Route
          path="/capture"
          element={
            <Tab hideNav>
              <Capture />
            </Tab>
          }
        />
        <Route
          path="/lhdn"
          element={
            <Tab>
              <Lhdn />
            </Tab>
          }
        />
        <Route
          path="/rewards"
          element={
            <Tab>
              <Rewards />
            </Tab>
          }
        />
        <Route
          path="/receipts/:id"
          element={
            <Tab>
              <ReceiptDetail />
            </Tab>
          }
        />
        <Route
          path="/settings"
          element={
            <Tab>
              <Settings />
            </Tab>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MemoryRouter>
  );
}
