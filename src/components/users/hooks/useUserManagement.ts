import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Profile } from "../types";

export const useUserManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async (user: Profile) => {
    try {
      console.log("Starting deletion process for user:", user.id);
      
      const { error: techDeptError } = await supabase
        .from('technician_departments')
        .delete()
        .eq('technician_id', user.id);

      if (techDeptError) throw techDeptError;
      console.log("Successfully deleted technician_departments records");

      const { error: jobAssignError } = await supabase
        .from('job_assignments')
        .delete()
        .eq('technician_id', user.id);

      if (jobAssignError) throw jobAssignError;
      console.log("Successfully deleted job_assignments records");

      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) throw profileError;
      console.log("Successfully deleted profile");

      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      if (authError) throw authError;
      console.log("Successfully deleted auth user");

      toast({
        title: "User deleted",
        description: "The user has been successfully deleted.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete user: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveEdit = async (updatedData: Partial<Profile>) => {
    try {
      console.log("Updating user with data:", updatedData);
      const { error } = await supabase
        .from('profiles')
        .update(updatedData)
        .eq('id', updatedData.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "The user profile has been successfully updated.",
      });

      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id === updatedData.id) {
        console.log("Current user was updated, refreshing session...");
        window.location.reload();
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

  return {
    handleDelete,
    handleSaveEdit
  };
};