import { Button } from "@/components/ui/button";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarFooter,
  SidebarSeparator,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { LogOut, BellDot } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "./layout/ThemeToggle";
import { UserInfo } from "./layout/UserInfo";
import { SidebarNavigation } from "./layout/SidebarNavigation";
import { AboutCard } from "./layout/AboutCard";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Initial session check:", currentSession ? "Session found" : "No session");
        
        if (!currentSession) {
          console.log("No session found, redirecting to auth");
          navigate('/auth');
          return;
        }
        
        setSession(currentSession);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, department')
          .eq('id', currentSession.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching user role:", profileError);
          return;
        }

        if (profileData) {
          console.log('User role and department fetched:', profileData);
          setUserRole(profileData.role);
          setUserDepartment(profileData.department);
          
          if (profileData.role === 'technician' && 
              (location.pathname === '/dashboard' || location.pathname === '/')) {
            console.log('Redirecting technician to technician dashboard');
            navigate('/technician-dashboard', { replace: true });
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
        navigate('/auth');
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("Auth state changed:", _event, session ? "Session exists" : "No session");
      
      if (!session) {
        setSession(null);
        setUserRole(null);
        setUserDepartment(null);
        navigate('/auth');
        return;
      }
      
      setSession(session);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, department')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching user role:", profileError);
        return;
      }

      if (profileData) {
        console.log('User role and department fetched:', profileData);
        setUserRole(profileData.role);
        setUserDepartment(profileData.department);
        
        if (profileData.role === 'technician' && 
            (location.pathname === '/dashboard' || location.pathname === '/')) {
          console.log('Redirecting technician to technician dashboard');
          navigate('/technician-dashboard', { replace: true });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  // Update effect to check for unread messages for both management and technician users
  useEffect(() => {
    if (!userRole || !userDepartment) return;

    const fetchUnreadMessages = async () => {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('status', 'unread');

      // For management users, show department messages
      if (userRole === 'management') {
        query = query.eq('department', userDepartment);
      } else if (userRole === 'technician') {
        // For technicians, show their sent messages that got replies
        query = query.eq('sender_id', session?.user?.id);
      }

      const { data: messages, error } = await query;

      if (error) {
        console.error('Error fetching unread messages:', error);
        return;
      }

      setHasUnreadMessages(messages.length > 0);
    };

    fetchUnreadMessages();

    // Subscribe to real-time updates for messages
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, userDepartment, session?.user?.id]);

  const handleSignOut = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    console.log("Starting sign out process");

    try {
      setSession(null);
      setUserRole(null);
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('supabase.auth.expires_at');
      localStorage.removeItem('supabase.auth.refresh_token');
      navigate('/auth');
      await supabase.auth.signOut();
      console.log("Sign out successful");
      toast({
        title: "Success",
        description: "You have been logged out successfully",
      });
    } catch (error) {
      console.error("Error during sign out:", error);
      toast({
        title: "Notice",
        description: "You have been logged out",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleMessageNotificationClick = () => {
    if (userRole === 'management') {
      navigate('/dashboard?showMessages=true');
    } else if (userRole === 'technician') {
      navigate('/technician-dashboard?showMessages=true');
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarNavigation userRole={userRole} />
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border">
            <ThemeToggle />
            <UserInfo />
            {hasUnreadMessages && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-yellow-500"
                onClick={handleMessageNotificationClick}
              >
                <BellDot className="h-4 w-4" />
                <span>New Messages</span>
              </Button>
            )}
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-2" 
              onClick={handleSignOut}
              disabled={isLoggingOut}
            >
              <LogOut className="h-4 w-4" />
              <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
            </Button>
            <AboutCard />
            <SidebarSeparator />
            <div className="px-2 py-4">
              <img
                src="/lovable-uploads/ce3ff31a-4cc5-43c8-b5bb-a4056d3735e4.png"
                alt="Sector Pro Logo"
                className="h-6 w-auto dark:invert"
              />
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className="flex-1">
          <header className="border-b p-4 flex justify-between items-center bg-background">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>
          </header>
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;