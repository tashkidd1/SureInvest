import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Home from './pages/Home';
import Markets from './pages/Markets';
import Portfolio from './pages/Portfolio';
import Goals from './pages/Goals';
import Watchlist from './pages/Watchlist';
import Learn from './pages/Learn';
import InvestAssistant from './pages/InvestAssistant';
import Cash from './pages/Cash';
import Transactions from './pages/Transactions';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import AutoInvest from './pages/AutoInvest';
import Security from './pages/Security';
import Help from './pages/Help';
import InvestmentDetail from './pages/InvestmentDetail';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AccountProvider } from '@/lib/AccountContext';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }
  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }
  // Render the main app
  return (
    <AccountProvider>
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/investment/:id" element={<InvestmentDetail />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/auto-invest" element={<AutoInvest />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/assistant" element={<InvestAssistant />} />
          <Route path="/cash" element={<Cash />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/security" element={<Security />} />
          <Route path="/help" element={<Help />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
      </Routes>
    </AccountProvider>
  );
};
function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}
export default App
