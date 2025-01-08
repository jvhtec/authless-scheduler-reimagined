import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Profile } from "./types";
import { UsersListContent } from "./UsersListContent";
import { useTabVisibility } from "@/hooks/useTabVisibility";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export const UsersList = () => {
  useTabVisibility(['profiles']);

  const { data: users, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      console.log("Starting profiles fetch...");
      
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, role, phone, department, dni, residencia')
          .returns<Profile[]>();

        if (profileError) {
          console.error("Error in profiles fetch:", profileError);
          throw profileError;
        }

        if (!profileData) {
          console.log("No profiles found");
          return [];
        }

        // Filter out any profiles with undefined or null IDs
        const validProfiles = profileData.filter(profile => profile && profile.id);
        console.log("Profiles fetch successful:", validProfiles);
        return validProfiles;
      } catch (error) {
        console.error("Unexpected error in profiles fetch:", error);
        throw error;
      }
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
      <Alert variant="destructive" className="mb-4">
        <AlertDescription className="flex items-center justify-between">
          <span>
            Error loading users: {error instanceof Error ? error.message : 'Network error occurred'}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="ml-2"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!users?.length) {
    return (
      <Alert>
        <AlertDescription>No users found.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {isFetching && !isLoading && (
        <div className="text-xs text-muted-foreground">Refreshing...</div>
      )}
      <UsersListContent users={users} />
    </div>
  );
};