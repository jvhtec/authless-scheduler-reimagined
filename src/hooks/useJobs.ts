import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const useJobs = () => {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          location: locations(name),
          job_departments(department)
        `)
        .order('start_time');

      if (error) throw error;
      return data;
    },
  });
};