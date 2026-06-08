import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { PolicyProvider } from '@/lib/policyContext';

import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ReportNew from '@/pages/ReportNew';
import ReportList from '@/pages/ReportList';
import ReportDetail from '@/pages/ReportDetail';
import ReportEdit from '@/pages/ReportEdit';
import Approval from '@/pages/Approval';
import Summary from '@/pages/Summary';
import PolicyManagement from '@/pages/PolicyManagement';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#1a237e]/20 border-t-[#1a237e] rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return <Navigate to="/login" replace />;
    }
  }

  return (
    <PolicyProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reports" element={<ReportList />} />
          <Route path="/reports/new" element={<ReportNew />} />
          <Route path="/reports/:id" element={<ReportDetail />} />
          <Route path="/reports/:id/edit" element={<ReportEdit />} />
          <Route path="/approval" element={<Approval />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/policy" element={<PolicyManagement />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </PolicyProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;