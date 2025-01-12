import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const useJobSelection = () => {
  return useQuery({
    queryKey: ["jobs-for-selection"],
    queryFn: async () => {
      console.log("Fetching jobs for selection...");
      const { data: jobs, error } = await supabase
        .from("jobs")
        .select(`
          id,
          title,
          tour_date_id,
          tour_date:tour_dates(
            id,
            tour:tours(
              id,
              name
            )
          )
        `)
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching jobs:", error);
        throw error;
      }

      return jobs;
    },
  });
};