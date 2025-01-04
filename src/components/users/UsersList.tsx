import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Profile } from "./types";
import { UserCard } from "./UserCard";
import { EditUserDialog } from "./EditUserDialog";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { useState } from "react";

export const UsersList = () => {
  const { toast } = useToast();
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

  const handleDelete = async () => {
    if (!deletingUser) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deletingUser.id);

      if (error) throw error;
      
      toast({
        title: "User deleted",
        description: "The user has been successfully deleted.",
      });
      
      refetch();
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
      refetch();
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