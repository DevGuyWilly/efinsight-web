import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageSpinner } from '@/components/ui/Spinner';
import { PublicOnly, RequireAuth, RequireSetup } from './guards';

const LandingPage = lazy(() => import('@/pages/landing/LandingPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const SignupPage = lazy(() => import('@/pages/auth/SignupPage'));
const ConnectBankPage = lazy(() => import('@/pages/onboarding/ConnectBankPage'));
const BankCallbackPage = lazy(() => import('@/pages/onboarding/BankCallbackPage'));
const ImportPage = lazy(() => import('@/pages/onboarding/ImportPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const TransactionsPage = lazy(() => import('@/pages/transactions/TransactionsPage'));
const AdvisorPage = lazy(() => import('@/pages/advisor/AdvisorPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<PublicOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/onboarding/bank" element={<ConnectBankPage />} />
          <Route path="/onboarding/import" element={<ImportPage />} />
          {/* Where the TrueLayer round-trip lands. /auth/success and /auth/error are the backend's own redirect targets. */}
          <Route path="/onboarding/callback" element={<BankCallbackPage />} />
          <Route path="/auth/success" element={<BankCallbackPage />} />
          <Route path="/auth/error" element={<BankCallbackPage />} />

          <Route path="/app" element={<AppShell />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route element={<RequireSetup />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="advisor" element={<AdvisorPage />} />
            </Route>
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
