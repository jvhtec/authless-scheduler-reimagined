import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Profile } from "./types";
import { UserCard } from "./UserCard";
import { EditUserDialog } from "./EditUserDialog";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { useState, useEffect } from "react";

export const UsersList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null);
  
  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      console.log("Starting profiles fetch...");
      const response = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, phone, department, dni, residencia')
        .returns<Profile[]>();

      if (response.error) {
        console.error("Error in profiles fetch:", response.error);
        throw response.error;
      }

      console.log("Profiles fetch successful:", response.data);
      return response.data;
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('Profile change detected:', payload);
          // Invalidate and refetch
          queryClient.invalidateQueries({ queryKey: ['profiles'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleDelete = async () => {
    if (!deletingUser) return;
    
    try {
      console.log("Starting deletion process for user:", deletingUser.id);
      
      // First delete from technician_departments
      const { error: techDeptError } = await supabase
        .from('technician_departments')
        .delete()
        .eq('technician_id', deletingUser.id);

      if (techDeptError) {
        console.error("Error deleting from technician_departments:", techDeptError);
        throw techDeptError;
      }
      console.log("Successfully deleted technician_departments records");

      // Then delete from job_assignments
      const { error: jobAssignError } = await supabase
        .from('job_assignments')
        .delete()
        .eq('technician_id', deletingUser.id);

      if (jobAssignError) {
        console.error("Error deleting from job_assignments:", jobAssignError);
        throw jobAssignError;
      }
      console.log("Successfully deleted job_assignments records");

      // Delete from profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deletingUser.id);

      if (profileError) {
        console.error("Error deleting profile:", profileError);
        throw profileError;
      }
      console.log("Successfully deleted profile");

      // Finally delete the auth user using admin API
      const { error: authError } = await supabase.auth.admin.deleteUser(
        deletingUser.id
      );

      if (authError) {
        console.error("Error deleting auth user:", authError);
        throw authError;
      }
      console.log("Successfully deleted auth user");

      toast({
        title: "User deleted",
        description: "The user has been successfully deleted.",
      });
      
      await refetch();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete user: " + error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingUser(null);
    }
  };

  const handleSaveEdit = async (updatedData: Partial<Profile>) => {
    if (!editingUser) return;

    try {
      console.log("Updating user:", editingUser.id, "with data:", updatedData);
      const { error } = await supabase
        .from('profiles')
        .update(updatedData)
        .eq('id', editingUser.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "The user profile has been successfully updated.",
      });

      setEditingUser(null);
      await refetch();
      
      // Force refresh the session if the current user was updated
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id === editingUser.id) {
        console.log("Current user was updated, refreshing session...");
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role, department')
          .eq('id', session.user.id)
          .single();
          
        if (profileData) {
          console.log("Updated profile data:", profileData);
          // Trigger a page reload to update all components
          window.location.reload();
        }
      }
    } catch (error: any) {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: "Failed to update user: " + error.message,
        variant: "destructive",
      });
    }
  };

  if (error) {
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
        <UserCard
          key={user.id}
          user={user}
          onEdit={setEditingUser}
          onDelete={setDeletingUser}
        />
      ))}

      <EditUserDialog
        user={editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSave={handleSaveEdit}
      />

      <DeleteUserDialog
        user={deletingUser}
        onConfirm={handleDelete}
        onCancel={() => setDeletingUser(null)}
      />
    </div>
  );
};