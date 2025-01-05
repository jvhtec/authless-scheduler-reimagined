import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Profile } from "./types";
import { UsersListContent } from "./UsersListContent";
import { useTabVisibility } from "@/hooks/useTabVisibility";

export const UsersList = () => {
  useTabVisibility(['profiles']);

  const { data: users, isLoading, error, isFetching } = useQuery({
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
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-lg">
        Error loading users: {error.message}
      </div>
    );
  }

  // Show loading state only on initial load, not during background refetches
  if (isLoading) {
    return <div className="p-4">Loading users...</div>;
  }

  if (!users?.length) {
    return <div className="text-muted-foreground p-4">No users found.</div>;
  }

  return (
    <>
      {isFetching && !isLoading && (
        <div className="text-xs text-muted-foreground mb-2">Refreshing...</div>
      )}
      <UsersListContent users={users} />
    </>
  );
};