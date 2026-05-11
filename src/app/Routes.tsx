import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import RequireAuth from './RequireAuth';
import RequireOnboarded from './RequireOnboarded';
import Home from '@/screens/Home';
import Activity from '@/screens/Activity';
import Cards from '@/screens/Cards';
import Lhdn from '@/screens/Lhdn';
import Capture from '@/screens/Capture';
import CaptureManual from '@/screens/CaptureManual';
import CaptureSuccess from '@/screens/CaptureSuccess';
import Advisor from '@/screens/Advisor';
import Insights from '@/screens/Insights';
import Rewards from '@/screens/Rewards';
import ReceiptDetail from '@/screens/ReceiptDetail';
import Settings from '@/screens/Settings';
import FinSplit from '@/screens/FinSplit';
import FinTravel from '@/screens/FinTravel';
import Marketplace from '@/screens/Marketplace';
import MarketplaceItemDetail from '@/screens/MarketplaceItem';
import MarketplaceCart from '@/screens/MarketplaceCart';
import CheckoutReview from '@/screens/CheckoutReview';
import CheckoutStatus from '@/screens/CheckoutStatus';
import Orders from '@/screens/Orders';
import OrderDetail from '@/screens/OrderDetail';
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
          path="/sources"
          element={
            <Tab>
              <Cards />
            </Tab>
          }
        />
        <Route path="/cards" element={<Navigate to="/sources" replace />} />
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
          path="/capture/manual"
          element={
            <Tab hideNav>
              <CaptureManual />
            </Tab>
          }
        />
        <Route
          path="/capture/success"
          element={
            <Tab hideNav>
              <CaptureSuccess />
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
        <Route
          path="/finsplit"
          element={
            <Tab>
              <FinSplit />
            </Tab>
          }
        />
        <Route
          path="/fintravel"
          element={
            <Tab>
              <FinTravel />
            </Tab>
          }
        />
        <Route
          path="/marketplace"
          element={
            <Tab>
              <Marketplace />
            </Tab>
          }
        />
        <Route
          path="/marketplace/cart"
          element={
            <Tab>
              <MarketplaceCart />
            </Tab>
          }
        />
        <Route
          path="/marketplace/items/:itemId"
          element={
            <Tab>
              <MarketplaceItemDetail />
            </Tab>
          }
        />
        <Route
          path="/checkout/review"
          element={
            <Tab hideNav>
              <CheckoutReview />
            </Tab>
          }
        />
        <Route
          path="/checkout/status"
          element={
            <Tab hideNav>
              <CheckoutStatus />
            </Tab>
          }
        />
        <Route
          path="/orders"
          element={
            <Tab>
              <Orders />
            </Tab>
          }
        />
        <Route
          path="/orders/:orderId"
          element={
            <Tab hideNav>
              <OrderDetail />
            </Tab>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MemoryRouter>
  );
}
