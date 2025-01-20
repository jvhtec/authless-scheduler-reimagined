import { BrowserRouter as Router, Routes, Route, Outlet, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/Layout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import Sound from "@/pages/Sound";
import Lights from "@/pages/Lights";
import Video from "@/pages/Video";
import TechnicianDashboard from "@/pages/TechnicianDashboard";
import Profile from "@/pages/Profile";
import ProjectManagement from "@/pages/ProjectManagement";
import PesosTool from "@/pages/PesosTool";
import ConsumosTool from "@/pages/ConsumosTool";
import LaborPOForm from "@/components/project-management/LaborPOForm";
import { useSessionManager } from "@/hooks/useSessionManager";
import { useEffect, useRef } from "react";
import "./App.css";

const queryClient = new QueryClient();

// Custom redirect component that checks user role
const RoleBasedRedirect = () => {
  const { userRole, isLoading, session } = useSessionManager();
  const location = useLocation();
  const redirectAttempts = useRef(0);
  const lastRedirectTime = useRef(Date.now());
  
  useEffect(() => {
    // Reset redirect attempts counter after 10 seconds
    const resetTimer = setInterval(() => {
      if (Date.now() - lastRedirectTime.current >= 10000) {
        redirectAttempts.current = 0;
      }
    }, 10000);

    return () => clearInterval(resetTimer);
  }, []);

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
      </div>
    );
  }

  // Prevent too many redirects
  if (redirectAttempts.current >= 5) {
    console.error('Too many redirect attempts, showing error state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error Loading Page</h2>
          <p className="text-gray-600">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  // If no session, redirect to auth
  if (!session) {
    if (location.pathname !== '/auth') {
      redirectAttempts.current++;
      lastRedirectTime.current = Date.now();
      console.log('No session found, redirecting to auth');
      return <Navigate to="/auth" replace />;
    }
    return null;
  }

  // If we have a role, redirect based on it
  if (userRole) {
    const dashboardPath = userRole === 'technician' ? "/technician-dashboard" : "/dashboard";
    if (location.pathname === '/' && location.pathname !== dashboardPath) {
      redirectAttempts.current++;
      lastRedirectTime.current = Date.now();
      console.log('Redirecting to dashboard based on role:', userRole);
      return <Navigate to={dashboardPath} replace />;
    }
    return null;
  }

  // If we have a session but no role (edge case), redirect to auth
  if (location.pathname !== '/auth') {
    redirectAttempts.current++;
    lastRedirectTime.current = Date.now();
    console.log('Session exists but no role found, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }
  
  return null;
};

// Protected Route wrapper component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, isLoading } = useSessionManager();
  const location = useLocation();
  const redirectAttempts = useRef(0);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
      </div>
    );
  }
  
  if (!session && location.pathname !== '/auth') {
    if (redirectAttempts.current < 5) {
      redirectAttempts.current++;
      return <Navigate to="/auth" replace />;
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error Loading Page</h2>
          <p className="text-gray-600">Please try refreshing the page</p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route element={<Layout><Outlet /></Layout>}>
            <Route path="/" element={<RoleBasedRedirect />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/technician-dashboard" 
              element={
                <ProtectedRoute>
                  <TechnicianDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/sound" 
              element={
                <ProtectedRoute>
                  <Sound />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/lights" 
              element={
                <ProtectedRoute>
                  <Lights />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/video" 
              element={
                <ProtectedRoute>
                  <Video />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/project-management" 
              element={
                <ProtectedRoute>
                  <ProjectManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/labor-po-form" 
              element={
                <ProtectedRoute>
                  <LaborPOForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/pesos-tool" 
              element={
                <ProtectedRoute>
                  <PesosTool />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/consumos-tool" 
              element={
                <ProtectedRoute>
                  <ConsumosTool />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<RoleBasedRedirect />} />
          </Route>
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;