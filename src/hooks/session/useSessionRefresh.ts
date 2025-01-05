import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const useSessionRefresh = () => {
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshSession = useCallback(async () => {
    console.log("Attempting session refresh...");
    if (isRefreshing) {
      console.log("Refresh already in progress, skipping");
      return null;
    }

    try {
      setIsRefreshing(true);
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Error refreshing session:", error);
        throw error;
      }

      if (currentSession) {
        console.log("Session refreshed successfully");
        setLastRefresh(Date.now());
        return currentSession;
      }

      console.log("No session found during refresh");
      return null;
    } catch (error) {
      console.error("Error in refreshSession:", error);
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // Periodic session refresh
  useEffect(() => {
    const REFRESH_INTERVAL = 4 * 60 * 1000; // 4 minutes
    let refreshTimer: NodeJS.Timeout;

    const periodicRefresh = async () => {
      if (Date.now() - lastRefresh >= REFRESH_INTERVAL) {
        console.log("Initiating periodic session refresh");
        await refreshSession();
      }
    };

    refreshTimer = setInterval(periodicRefresh, REFRESH_INTERVAL);

    return () => {
      clearInterval(refreshTimer);
    };
  }, [lastRefresh, refreshSession]);

  return { refreshSession, lastRefresh, isRefreshing };
};