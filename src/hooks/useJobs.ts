import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const useJobs = () => {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      console.log("Fetching jobs with departments and locations...");
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          location: locations (
            id,
            name
          ),
          job_departments (
            department
          )
        `)
        .order('start_time');

      if (error) {
        console.error("Error fetching jobs:", error);
        throw error;
      }

      console.log("Jobs data:", data);
      return data;
    },
  });
};