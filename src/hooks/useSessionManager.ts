import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useSessionRefresh } from "./session/useSessionRefresh";
import { useProfileData } from "./session/useProfileData";
import { useProfileChanges } from "./session/useProfileChanges";

export const useSessionManager = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { refreshSession } = useSessionRefresh();
  const { fetchUserProfile } = useProfileData();

  const handleSessionUpdate = useCallback(async (currentSession: any) => {
    console.log("Session update handler called with session:", !!currentSession);
    
    try {
      if (!currentSession) {
        console.log("No session, clearing user data");
        setSession(null);
        setUserRole(null);
        setUserDepartment(null);
        return;
      }

      console.log("Session found, updating user data");
      setSession(currentSession);
      
      if (!currentSession.user?.id) {
        console.log("No user ID found in session");
        throw new Error("No user ID found in session");
      }

      const profileData = await fetchUserProfile(currentSession.user.id);
      if (profileData) {
        setUserRole(profileData.role);
        setUserDepartment(profileData.department);
      } else {
        console.log("No profile data found");
        setSession(null);
        setUserRole(null);
        setUserDepartment(null);
      }
    } catch (error) {
      console.error("Error in session update:", error);
      setSession(null);
      setUserRole(null);
      setUserDepartment(null);
    }
  }, [fetchUserProfile]);

  // Initial session setup and auth state change listener
  useEffect(() => {
    let mounted = true;
    console.log("Setting up session...");

    const setupSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        console.log("Initial session check:", !!initialSession);

        if (mounted) {
          await handleSessionUpdate(initialSession);
          setIsLoading(false);
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
          console.log("Auth state changed:", _event);
          if (mounted) {
            await handleSessionUpdate(session);
            setIsLoading(false);
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error in session setup:", error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    setupSession();
    
    return () => {
      mounted = false;
    };
  }, [handleSessionUpdate]);

  // Profile changes subscription
  useProfileChanges(
    session,
    userRole,
    fetchUserProfile,
    setUserRole,
    setUserDepartment
  );

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