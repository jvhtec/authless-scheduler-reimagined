import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface UserPreferences {
  dark_mode?: boolean;
  time_span?: string;
}

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const { toast } = useToast();

  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return;
      }

      console.log('Updating preferences for user:', user.id, newPreferences);
      
      const { data, error } = await supabase
        .from('profiles')
        .update(newPreferences)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating preferences:', error);
        throw error;
      }

      console.log('Preferences updated successfully:', data);
      setPreferences(prev => ({ ...prev, ...newPreferences }));
      
    } catch (error: any) {
      console.error('Error updating preferences:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // Show error toast but don't throw - this allows the app to continue functioning
      toast({
        title: "Failed to update preferences",
        description: "Your preferences couldn't be saved. Please try again later.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('No authenticated user found');
          return;
        }

        console.log('Fetching preferences for user:', user.id);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('dark_mode, time_span')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching preferences:', error);
          throw error;
        }

        console.log('Preferences fetched successfully:', data);
        setPreferences(data);
        
      } catch (error: any) {
        console.error('Error fetching preferences:', error);
        toast({
          title: "Failed to load preferences",
          description: "Your preferences couldn't be loaded. Please try again later.",
          variant: "destructive",
        });
      }
    };

    fetchPreferences();
  }, [toast]);

  return { preferences, updatePreferences };
};