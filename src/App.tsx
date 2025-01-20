import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from "react-router-dom";
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
import "./App.css";

const queryClient = new QueryClient();

// Custom redirect component that checks user role
const RoleBasedRedirect = () => {
  const { userRole, isLoading, session } = useSessionManager();
  console.log('RoleBasedRedirect - Role:', userRole, 'Loading:', isLoading, 'Has Session:', !!session);
  
  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
      </div>
    );
  }

  // If no session, redirect to auth
  if (!session) {
    console.log('No session found, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // If we have a role, redirect based on it
  if (userRole) {
    console.log('Redirecting to dashboard based on role:', userRole);
    const dashboardPath = userRole === 'technician' ? "/technician-dashboard" : "/dashboard";
    // Only redirect if we're not already on the correct dashboard
    if (window.location.pathname !== dashboardPath) {
      return <Navigate to={dashboardPath} replace />;
    }
    return null;
  }

  // If we have a session but no role (edge case), redirect to auth
  console.log('Session exists but no role found, redirecting to auth');
  return <Navigate to="/auth" replace />;
};

// Protected Route wrapper component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, isLoading } = useSessionManager();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
      </div>
    );
  }
  
  if (!session) {
    return <Navigate to="/auth" replace />;
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