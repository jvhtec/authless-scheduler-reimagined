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
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "./layout/ThemeToggle";
import { UserInfo } from "./layout/UserInfo";
import { SidebarNavigation } from "./layout/SidebarNavigation";
import { AboutCard } from "./layout/AboutCard";
import { useToast } from "@/hooks/use-toast";
import { useSessionManager } from "@/hooks/useSessionManager";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  
  const {
    session,
    userRole,
    userDepartment,
    isLoading,
    setSession,
    setUserRole,
    setUserDepartment
  } = useSessionManager();

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchUnreadMessages = async () => {
      console.log("Checking for unread messages...");
      
      // Check for unread department messages
      let deptQuery = supabase
        .from('messages')
        .select('*')
        .eq('status', 'unread');

      if (userRole === 'management') {
        deptQuery = deptQuery.eq('department', userDepartment);
      } else if (userRole === 'technician') {
        deptQuery = deptQuery.eq('sender_id', session.user.id);
      }

      // Check for unread direct messages
      const directQuery = supabase
        .from('direct_messages')
        .select('*')
        .eq('recipient_id', session.user.id)
        .eq('status', 'unread');

      const [deptMessages, directMessages] = await Promise.all([
        deptQuery,
        directQuery
      ]);

      if (deptMessages.error) {
        console.error('Error fetching department messages:', deptMessages.error);
        return;
      }

      if (directMessages.error) {
        console.error('Error fetching direct messages:', directMessages.error);
        return;
      }

      const hasUnread = deptMessages.data.length > 0 || directMessages.data.length > 0;
      console.log("Unread messages status:", {
        departmentMessages: deptMessages.data.length,
        directMessages: directMessages.data.length,
        hasUnread
      });
      
      setHasUnreadMessages(hasUnread);
    };

    fetchUnreadMessages();

    // Subscribe to changes in both messages and direct_messages tables
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          console.log("Messages table changed, checking unread status");
          fetchUnreadMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${session.user.id}`,
        },
        () => {
          console.log("Direct messages changed, checking unread status");
          fetchUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, userRole, userDepartment]);

  const handleSignOut = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    console.log("Starting sign out process");

    try {
      setSession(null);
      setUserRole(null);
      setUserDepartment(null);
      localStorage.clear();
      await supabase.auth.signOut();
      console.log("Sign out successful");
      navigate('/auth');
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
      </div>
    );
  }

  if (!session || !userRole) {
    navigate('/auth');
    return null;
  }

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