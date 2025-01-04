import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { Moon, Sun, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateUserDialog } from "@/components/users/CreateUserDialog";
import { UsersList } from "@/components/users/UsersList";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/components/users/types";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { useToast } from "@/components/ui/use-toast";

const Settings = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      setIsDarkMode(storedTheme === "dark");
    }

    // Fetch current user's profile
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setCurrentUser(profile);
        }
      }
    };

    fetchCurrentUser();
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

  const handleUpdateProfile = async (updatedData: Partial<Profile>) => {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from('profiles')
      .update(updatedData)
      .eq('id', currentUser.id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } else if (data) {
      setCurrentUser(data);
      setEditUserOpen(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Settings</h1>
        {currentUser?.role !== 'technician' && (
          <Button onClick={() => setCreateUserOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        )}
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
              </div>
              <div>
                <Label>Name</Label>
                <p className="text-sm text-muted-foreground">
                  {currentUser?.first_name} {currentUser?.last_name}
                </p>
              </div>
              <div>
                <Label>Role</Label>
                <p className="text-sm text-muted-foreground capitalize">
                  {currentUser?.role}
                </p>
              </div>
              <Button onClick={() => setEditUserOpen(true)}>
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users List - Only visible for non-technician roles */}
        {currentUser?.role !== 'technician' && (
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <UsersList />
            </CardContent>
          </Card>
        )}

        {/* Appearance Card */}
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

      {currentUser?.role !== 'technician' && (
        <CreateUserDialog 
          open={createUserOpen} 
          onOpenChange={setCreateUserOpen} 
        />
      )}

      <EditUserDialog
        user={currentUser}
        onOpenChange={setEditUserOpen}
        onSave={handleUpdateProfile}
      />
    </div>
  );
};

export default Settings;