import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { Moon, Sun, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateUserDialog } from "@/components/users/CreateUserDialog";
import { UsersList } from "@/components/users/UsersList";

const Settings = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      setIsDarkMode(storedTheme === "dark");
    }
  }, []);

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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <Button onClick={() => setCreateUserOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <UsersList />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  {isDarkMode ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                  <Label htmlFor="dark-mode">Dark Mode</Label>
                </div>
              </div>
              <Switch
                id="dark-mode"
                checked={isDarkMode}
                onCheckedChange={toggleDarkMode}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateUserDialog 
        open={createUserOpen} 
        onOpenChange={setCreateUserOpen} 
      />
    </div>
  );
};

export default Settings;