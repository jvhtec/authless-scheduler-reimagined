import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useSessionManager } from "@/hooks/useSessionManager";
import { Sidebar } from "@/components/ui/sidebar";
import { SidebarNavigation } from "./layout/SidebarNavigation";
import { UserInfo } from "./layout/UserInfo";
import { AboutCard } from "./layout/AboutCard";
import { SidebarProvider } from "@/components/ui/sidebar";

const Layout = () => {
  const navigate = useNavigate();
  const { session, isLoading, userRole } = useSessionManager();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!currentSession) {
          console.info("No session found in Layout, redirecting to auth");
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error("Error checking session:", error);
        navigate("/", { replace: true });
      }
    };

    // Only check session if we're not already loading
    if (!isLoading) {
      checkSession();
    }
  }, [navigate, isLoading]);

  // Show nothing while checking session
  if (isLoading) {
    return null;
  }

  // If no session, render nothing (redirect will happen)
  if (!session) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar>
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 py-4">
                <SidebarNavigation userRole={userRole} />
              </div>
            </div>
            <div className="mt-auto p-4">
              <UserInfo />
              <AboutCard />
            </div>
          </div>
        </Sidebar>
        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Layout;