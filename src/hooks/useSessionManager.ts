import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export const useSessionManager = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  const fetchUserProfile = useCallback(async (userId: string) => {
    console.log('Fetching user profile for:', userId);
    try {
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
    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
      throw error;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    console.log("Refreshing session...");
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Error refreshing session:", error);
        throw error;
      }

      return currentSession;
    } catch (error) {
      console.error("Error in refreshSession:", error);
      throw error;
    }
  }, []);

  const handleSessionUpdate = useCallback(async (currentSession: any) => {
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
      setLastRefresh(Date.now());
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
  }, [navigate, fetchUserProfile]);

  // Periodic session refresh
  useEffect(() => {
    const REFRESH_INTERVAL = 4 * 60 * 1000; // 4 minutes
    let refreshTimer: NodeJS.Timeout;
    
    const periodicRefresh = async () => {
      try {
        if (Date.now() - lastRefresh >= REFRESH_INTERVAL) {
          console.log("Performing periodic session refresh");
          const refreshedSession = await refreshSession();
          if (refreshedSession) {
            await handleSessionUpdate(refreshedSession);
          }
        }
      } catch (error) {
        console.error("Error in periodic refresh:", error);
      }
    };

    refreshTimer = setInterval(periodicRefresh, REFRESH_INTERVAL);

    return () => {
      clearInterval(refreshTimer);
    };
  }, [lastRefresh, refreshSession, handleSessionUpdate]);

  // Initial session setup and auth state change listener
  useEffect(() => {
    let mounted = true;
    console.log("Setting up session...");

    const setupSession = async () => {
      try {
        setIsLoading(true);
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        console.log("Initial session check:", !!initialSession);

        if (mounted) {
          await handleSessionUpdate(initialSession);
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
          console.log("Auth state changed:", _event);
          if (mounted) {
            await handleSessionUpdate(session);
          }
        });

        return () => {
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

    const setupPromise = setupSession();
    
    return () => {
      mounted = false;
      setupPromise.then(cleanup => cleanup && cleanup());
    };
  }, [navigate, handleSessionUpdate]);

  // Profile changes subscription
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
  }, [session?.user?.id, userRole, fetchUserProfile]);

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