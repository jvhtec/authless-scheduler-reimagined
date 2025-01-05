import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Department } from "@/types/department";

export const useJobs = () => {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      console.log("Fetching jobs with departments and locations...");
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          location:locations(name),
          job_departments!inner(department)
        `)
        .neq('job_type', 'tour'); // Exclude tour type jobs

      if (error) {
        console.error("Error fetching jobs:", error);
        throw error;
      }

      console.log("Jobs fetched successfully:", data);
      return data;
    },
  });
};