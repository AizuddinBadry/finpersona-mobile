import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from './RequireAuth';
import RequireOnboarded from './RequireOnboarded';
import Placeholder from '@/screens/Placeholder';
import LoginScreen from '@/features/auth/LoginScreen';
import SignupScreen from '@/features/auth/SignupScreen';
import OnboardingScreen from '@/features/auth/OnboardingScreen';

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
            <RequireAuth>
              <RequireOnboarded>
                <Placeholder label="Home (Phase 1)" />
              </RequireOnboarded>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MemoryRouter>
  );
}
