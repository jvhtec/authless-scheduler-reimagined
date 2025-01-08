import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';

interface UserPreferences {
  dark_mode: boolean;
  time_span: string;
  last_activity: string;
}

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          ...newPreferences,
          last_activity: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, ...newPreferences } : null);
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      });
    }
  };

  const checkInactivity = async () => {
    if (!preferences?.last_activity) return;
    
    const lastActivity = new Date(preferences.last_activity);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff >= 8) {
      await supabase.auth.signOut();
      toast({
        title: "Session Expired",
        description: "You have been logged out due to inactivity",
      });
      window.location.href = '/auth';
    }
  };

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('dark_mode, time_span, last_activity')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        setPreferences(data);
        
        // Apply dark mode if saved
        if (data.dark_mode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();

    // Set up activity tracking
    const updateActivity = () => {
      updatePreferences({ last_activity: new Date().toISOString() });
    };

    // Check inactivity every minute
    const inactivityInterval = setInterval(checkInactivity, 60000);

    // Track user activity
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keypress', updateActivity);
    window.addEventListener('click', updateActivity);

    return () => {
      clearInterval(inactivityInterval);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keypress', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, []);

  return {
    preferences,
    isLoading,
    updatePreferences,
  };
};