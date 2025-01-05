import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface UseJobsOptions {
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}

export const useJobs = (options: UseJobsOptions = {}) => {
  const { staleTime = 30000, refetchOnWindowFocus = true } = options;

  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      console.log("useJobs: Fetching jobs data");
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          location:locations(name),
          job_departments(*),
          job_assignments(
            *,
            profiles(
              first_name,
              last_name
            )
          ),
          job_documents(*)
        `)
        .order("start_time", { ascending: true });

      if (error) {
        console.error("useJobs: Error fetching jobs:", error);
        throw error;
      }

      console.log("useJobs: Successfully fetched jobs:", data?.length);
      return data;
    },
    staleTime,
    refetchOnWindowFocus
  });
};