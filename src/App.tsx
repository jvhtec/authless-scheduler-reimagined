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
import "./App.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route element={<Layout><Outlet /></Layout>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/sound" element={<Sound />} />
            <Route path="/lights" element={<Lights />} />
            <Route path="/video" element={<Video />} />
            <Route path="/technician" element={<TechnicianDashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/project-management" element={<ProjectManagement />} />
          </Route>
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;