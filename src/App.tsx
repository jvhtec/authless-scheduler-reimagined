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
import { useSessionManager } from "@/hooks/useSessionManager";
import "./App.css";

const queryClient = new QueryClient();

// Custom redirect component that checks user role
const RoleBasedRedirect = () => {
  const { userRole } = useSessionManager();
  console.log('Redirecting based on role:', userRole);
  
  return (
    <Navigate 
      to={userRole === 'technician' ? "/technician-dashboard" : "/dashboard"} 
      replace 
    />
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route element={<Layout><Outlet /></Layout>}>
            <Route path="/" element={<RoleBasedRedirect />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/technician-dashboard" element={<TechnicianDashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/sound" element={<Sound />} />
            <Route path="/lights" element={<Lights />} />
            <Route path="/video" element={<Video />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/project-management" element={<ProjectManagement />} />
            <Route path="*" element={<RoleBasedRedirect />} />
          </Route>
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;