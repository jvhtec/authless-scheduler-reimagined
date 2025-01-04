import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const useJobs = () => {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      console.log("Fetching jobs with departments and locations...");
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select(`
            id,
            title,
            description,
            start_time,
            end_time,
            color,
            status,
            job_type,
            location:locations(name),
            job_departments(department)
          `)
          .order('start_time');

        if (error) {
          console.error("Error fetching jobs:", error);
          throw error;
        }

        console.log("Jobs fetched successfully:", data);
        return data;
      } catch (error) {
        console.error("Error in useJobs hook:", error);
        throw error;
      }
    },
  });
};