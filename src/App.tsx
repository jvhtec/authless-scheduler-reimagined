import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/Layout";
import { Auth } from "@/pages/Auth";
import { Dashboard } from "@/pages/Dashboard";
import { Settings } from "@/pages/Settings";
import { Sound } from "@/pages/Sound";
import { Lights } from "@/pages/Lights";
import { Video } from "@/pages/Video";
import { TechnicianDashboard } from "@/pages/TechnicianDashboard";
import { Profile } from "@/pages/Profile";
import "./App.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/sound" element={<Sound />} />
            <Route path="/lights" element={<Lights />} />
            <Route path="/video" element={<Video />} />
            <Route path="/technician" element={<TechnicianDashboard />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;