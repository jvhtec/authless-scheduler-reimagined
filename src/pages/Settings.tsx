import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { UserManagement } from "@/components/settings/UserManagement";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isManagement, setIsManagement] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      setIsDarkMode(storedTheme === "dark");
    }
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log("No user found");
        navigate("/auth");
        return;
      }

      console.log("User found:", user);

      // First try to get the profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error("Error fetching profile:", profileError);
        toast({
          title: "Error",
          description: "Could not verify user role",
          variant: "destructive",
        });
        return;
      }

      console.log("Profile data:", profile);
      
      if (!profile) {
        console.log("No profile found, creating one...");
        // If no profile exists, create one with default role
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([
            { 
              id: user.id,
              email: user.email,
              role: 'technician',
              first_name: user.user_metadata.first_name,
              last_name: user.user_metadata.last_name
            }
          ]);

        if (insertError) {
          console.error("Error creating profile:", insertError);
          toast({
            title: "Error",
            description: "Could not create user profile",
            variant: "destructive",
          });
          return;
        }
      }

      const hasManagementAccess = profile?.role === 'management' || profile?.role === 'admin';
      console.log("Has management access:", hasManagementAccess);
      setIsManagement(hasManagementAccess);
    } catch (error) {
      console.error("Error checking user role:", error);
      toast({
        title: "Error",
        description: "Could not verify user role",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="max-w-2xl space-y-6">
        <AppearanceSettings 
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
        {isManagement && <UserManagement />}
      </div>
    </div>
  );
};

export default Settings;