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
    console.log("Checking user role...");
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session error:", sessionError);
        toast({
          title: "Error",
          description: "Could not verify session",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      if (!session) {
        console.log("No active session found");
        navigate("/auth");
        return;
      }

      console.log("Session found:", session);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.error("Error fetching profile:", profileError);
        toast({
          title: "Error",
          description: "Could not verify user role",
          variant: "destructive",
        });
        return;
      }

      console.log("User profile:", profile);
      
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