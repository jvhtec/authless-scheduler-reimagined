import { useState, useEffect, useCallback } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useProfileChanges } from "./session/useProfileChanges";

export const useSessionManager = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, department')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
      return null;
    }
  }, []);

  const handleSessionUpdate = useCallback(async (currentSession: Session | null) => {
    try {
      if (!currentSession) {
        console.log("No session found, clearing user data");
        setSession(null);
        setUserRole(null);
        setUserDepartment(null);
        return;
      }

      console.log("Session found, updating user data for ID:", currentSession.user.id);
      setSession(currentSession);
      
      const profileData = await fetchUserProfile(currentSession.user.id);
      
      if (profileData) {
        console.log("Profile data fetched successfully:", profileData);
        setUserRole(profileData.role);
        setUserDepartment(profileData.department);
      } else {
        console.log("No profile data found");
        setUserRole(null);
        setUserDepartment(null);
      }
    } catch (error) {
      console.error("Error in session update:", error);
      // Don't clear session on profile fetch error
      setUserRole(null);
      setUserDepartment(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      try {
        console.log("Initializing session...");
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          await handleSessionUpdate(currentSession);
        }
      } catch (error) {
        console.error("Error initializing session:", error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        console.log("Auth state changed, event:", _event);
        if (mounted) {
          await handleSessionUpdate(currentSession);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleSessionUpdate]);

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