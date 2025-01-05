import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export const useSessionManager = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    console.log('Fetching user profile for:', userId);
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role, department')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      throw profileError;
    }

    console.log('User profile fetched:', profileData);
    return profileData;
  };

  const handleSessionUpdate = async (currentSession: any) => {
    console.log("Session update handler called with session:", !!currentSession);
    setIsLoading(true);
    
    try {
      if (!currentSession) {
        console.log("No session, clearing user data");
        setSession(null);
        setUserRole(null);
        setUserDepartment(null);
        navigate('/auth');
        return;
      }

      console.log("Session found, updating user data");
      setSession(currentSession);
      
      const profileData = await fetchUserProfile(currentSession.user.id);
      setUserRole(profileData.role);
      setUserDepartment(profileData.department);
    } catch (error) {
      console.error("Error in session update:", error);
      // Clear session data and redirect to auth on error
      setSession(null);
      setUserRole(null);
      setUserDepartment(null);
      navigate('/auth');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial session check and refresh setup
  useEffect(() => {
    let mounted = true;

    const setupSession = async () => {
      try {
        console.log("Setting up session...");
        setIsLoading(true);

        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        console.log("Initial session check:", !!initialSession);

        if (mounted) {
          await handleSessionUpdate(initialSession);
        }

        // Set up session refresh
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log("Auth state changed:", event);
          if (mounted) {
            await handleSessionUpdate(session);
          }
        });

        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error in session setup:", error);
        if (mounted) {
          setIsLoading(false);
          navigate('/auth');
        }
      }
    };

    setupSession();

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [navigate]);

  // Subscribe to profile changes
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`,
        },
        async (payload) => {
          console.log('Profile changed:', payload);
          try {
            const profileData = await fetchUserProfile(session.user.id);
            console.log('Updated profile data:', profileData);
            
            setUserRole(profileData.role);
            setUserDepartment(profileData.department);
            
            // Only force reload if we're not on the settings page
            const currentPath = window.location.pathname;
            if (currentPath !== '/settings' && profileData.role !== userRole) {
              const newPath = profileData.role === 'technician' ? '/technician-dashboard' : '/dashboard';
              window.location.href = newPath;
            }
          } catch (error) {
            console.error('Error updating profile data:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, userRole]);

  return {
    session,
    userRole,
    userDepartment,
    isLoading,
    setSession,
    setUserRole,
    setUserDepartment
  };
};