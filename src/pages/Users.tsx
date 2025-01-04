import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { UsersList } from "@/components/users/UsersList";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { CreateUserDialog } from "@/components/users/CreateUserDialog";

const Users = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [createUserOpen, setCreateUserOpen] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        console.log("Checking session...");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log("No session found, redirecting to auth");
          navigate('/auth');
          return;
        }

        console.log("Session found, checking user role");
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          navigate('/dashboard');
          return;
        }

        // Only allow admin and management roles
        if (!profile || !['admin', 'management'].includes(profile.role)) {
          console.log("Unauthorized access attempt, redirecting to dashboard");
          navigate('/dashboard');
          return;
        }

        console.log("Access granted for role:", profile.role);
      } catch (error) {
        console.error("Error in access check:", error);
        navigate('/auth');
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Users Management</h1>
        <Button onClick={() => setCreateUserOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersList />
        </CardContent>
      </Card>

      <CreateUserDialog 
        open={createUserOpen} 
        onOpenChange={setCreateUserOpen} 
      />
    </div>
  );
};

export default Users;