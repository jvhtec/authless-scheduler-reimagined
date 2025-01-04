import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
};

export const UsersList = () => {
  const { toast } = useToast();
  
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      console.log("Starting profiles fetch...");
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error in profiles fetch:", error);
        throw error;
      }

      console.log("Profiles fetch successful:", data);
      return data as Profile[];
    },
    retry: 1, // Only retry once to prevent infinite loops
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  const handleDelete = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      toast({
        title: "User deleted",
        description: "The user has been successfully deleted.",
      });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete user: " + error.message,
        variant: "destructive",
      });
    }
  };

  if (error) {
    console.error("Query error state:", error);
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-lg">
        Error loading users: {error.message}
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-4">Loading users...</div>;
  }

  if (!users?.length) {
    return <div className="text-muted-foreground p-4">No users found.</div>;
  }

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <div 
          key={user.id} 
          className="flex items-center justify-between p-4 border rounded-lg"
        >
          <div>
            <h3 className="font-medium">
              {user.first_name} {user.last_name}
            </h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-sm text-muted-foreground">Role: {user.role}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => handleDelete(user.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};