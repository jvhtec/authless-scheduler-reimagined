import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { queryClient } from "@/lib/react-query";
import { Toaster } from "sonner";
import Layout from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import Auth from "@/pages/Auth";
import Sound from "@/pages/Sound";
import Lights from "@/pages/Lights";
import Video from "@/pages/Video";
import Settings from "@/pages/Settings";
import ProjectManagement from "@/pages/ProjectManagement";
import TechnicianDashboard from "@/pages/TechnicianDashboard";
import Profile from "@/pages/Profile";
import LaborPOForm from "@/pages/LaborPOForm";
import HojaDeRuta from "@/pages/HojaDeRuta";

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/sound" element={<Sound />} />
              <Route path="/lights" element={<Lights />} />
              <Route path="/video" element={<Video />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/project-management" element={<ProjectManagement />} />
              <Route path="/technician-dashboard" element={<TechnicianDashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/labor-po-form" element={<LaborPOForm />} />
              <Route path="/hoja-de-ruta" element={<HojaDeRuta />} />
            </Routes>
          </Layout>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;