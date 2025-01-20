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
import "./App.css";

const queryClient = new QueryClient();

// Protected Route wrapper component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, isLoading, userRole } = useSessionManager();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
      </div>
    );
  }

  if (!session) {
    console.log('No session found, redirecting to auth');
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // Check access for project management routes
  if (location.pathname.startsWith('/project-management')) {
    console.log('Checking project management access for role:', userRole);
    const allowedRoles = ['admin', 'logistics', 'management'];
    if (!allowedRoles.includes(userRole || '')) {
      console.log('Unauthorized access attempt to project management');
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

// Home redirect component
const HomeRedirect = () => {
  const { userRole, isLoading, session } = useSessionManager();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
      </div>
    );
  }

  if (!session) {
    console.log('No session in HomeRedirect, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  const allowedRoles = ['admin', 'logistics', 'management'];
  const dashboardPath = allowedRoles.includes(userRole || '') ? "/dashboard" : "/technician-dashboard";
  
  return <Navigate to={dashboardPath} replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route element={<Layout><Outlet /></Layout>}>
            <Route path="/" element={<HomeRedirect />} />
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
              path="/project-management/*" 
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
          </Route>
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;