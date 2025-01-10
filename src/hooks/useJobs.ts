import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const useJobs = () => {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      console.log("Fetching jobs...");
      const { data: jobs, error } = await supabase
        .from("jobs")
        .select(`
          *,
          location:locations(name),
          job_departments(department),
          job_assignments(
            technician_id,
            sound_role,
            lights_role,
            video_role,
            profiles(
              first_name,
              last_name
            )
          ),
          job_documents(*),
          tour_date:tour_dates(*),
          sound_personnel:sound_job_personnel(*),
          lights_personnel:lights_job_personnel(*),
          video_personnel:video_job_personnel(*)
        `)
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching jobs:", error);
        throw error;
      }

      console.log("Jobs fetched successfully:", jobs);
      return jobs;
    },
  });
};