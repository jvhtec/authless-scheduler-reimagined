import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { UserManagement } from "@/components/settings/UserManagement";

const Settings = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isManagement, setIsManagement] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      setIsDarkMode(storedTheme === "dark");
    }
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    console.log("Checking user role...");
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      console.log("User profile:", profile);
      setIsManagement(profile?.role === 'management' || profile?.role === 'admin');
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