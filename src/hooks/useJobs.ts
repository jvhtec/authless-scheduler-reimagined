import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Department } from "@/types/department";
import { startOfDay } from "date-fns";

export const useJobs = () => {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      console.log("Fetching jobs with departments and locations...");
      const today = startOfDay(new Date());
      
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          location:locations(name),
          job_departments(department)
        `)
        .neq('job_type', 'tour')
        .gte('start_time', today.toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        console.error("Error fetching jobs:", error);
        throw error;
      }

      console.log("Jobs fetched successfully:", data);
      return data;
    },
  });
};