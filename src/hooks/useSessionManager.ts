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
    
    try {
      const profileData = await fetchUserProfile(currentSession.user.id);
      setUserRole(profileData.role);
      setUserDepartment(profileData.department);
      
      // Navigate based on role
      if (profileData.role === 'technician') {
        navigate('/technician-dashboard', { replace: true });
      }
    } catch (error) {
      console.error("Error in session update:", error);
      navigate('/auth');
    }
  };

  // Initial session check
  useEffect(() => {
    const checkSession = async () => {
      try {
        setIsLoading(true);
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        await handleSessionUpdate(currentSession);
      } catch (error) {
        console.error("Error checking session:", error);
        navigate('/auth');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("Auth state changed:", _event);
      await handleSessionUpdate(session);
    });

    // Subscribe to profile changes
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: session?.user?.id ? `id=eq.${session.user.id}` : undefined,
        },
        async (payload) => {
          console.log('Profile changed:', payload);
          if (session?.user?.id) {
            try {
              const profileData = await fetchUserProfile(session.user.id);
              console.log('Updated profile data:', profileData);
              
              // First update the state
              setUserRole(profileData.role);
              setUserDepartment(profileData.department);
              
              // Then handle navigation based on the new role
              if (profileData.role === 'technician') {
                window.location.href = '/technician-dashboard';
              } else {
                window.location.href = '/dashboard';
              }
            } catch (error) {
              console.error('Error updating profile data:', error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [navigate]);

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